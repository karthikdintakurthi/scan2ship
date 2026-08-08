# Audit Report: Delhivery Retry Flow Analysis

> **⚠️ STATUS — reviewed 2026-08-08: PARTIALLY RESOLVED. Do not read this document as "closed."**
>
> The specific fix described here (passing `clientId` from the retry endpoint) **was applied and is still in place**. But the underlying vulnerability class it belongs to — cross-client Delhivery API key selection — **is still live** through other paths:
>
> - `src/lib/pickup-location-config.ts:153` still takes `clientId` as **optional** and **fails open**. When it is absent, `findFirst` matches a pickup location *by name across all tenants* and returns whichever key it finds first. The guard is a `console.warn`, not a constraint.
> - `src/lib/delhivery.ts:365` (`getOrderStatus`) and `:395` (`validatePincode`) still call `getDelhiveryApiKey(pickupLocation)` with **no `clientId` at all**.
> - `src/app/api/orders/[id]/route.ts:265` passes `parseInt(order.clientId)` — but `clientId` is a UUID, so this is `NaN`, which is falsy, so the tenant filter is silently dropped.
>
> The fix below patched one caller. It did not fix the root cause. See `docs/audits/FULL_APP_AUDIT_2026-08-08.md` (HIGH — "parseInt on a UUID") for the full picture.
>
> **The section titled "Retry Endpoint (BROKEN)" below describes the state BEFORE the fix.** It is retained as a historical record.

## Executive Summary

**⚠️ BUG FOUND AND PARTIALLY FIXED**: The Delhivery retry endpoint was **NOT passing the `clientId`** to the Delhivery service, which could have caused it to use the **WRONG API key** when retrying failed orders. The retry endpoint itself has been corrected; the shared helper it depends on still fails open. See the status banner above.

---

## Flow Analysis

### 1. User Action
When a user clicks "Fulfill Order" button in the order details modal:
- Location: `src/components/OrderList.tsx:2733`
- Calls: `handleFulfillOrder(selectedOrder.id)`
- Endpoint: `/api/orders/${orderId}/fulfill`

### 2. Retry Endpoint: `/api/orders/[id]/retry-delhivery`
**File**: `src/app/api/orders/[id]/retry-delhivery/route.ts`

#### What it does (lines 40-84):
```typescript
// 1. Fetches order from database
const order = await prisma.orders.findUnique({
  where: { id: orderId }
})

// 2. Creates orderData object
const orderData = {
  name: order.name,
  mobile: order.mobile,
  address: order.address,
  city: order.city,
  state: order.state,
  country: order.country,
  pincode: order.pincode,
  courier_service: order.courier_service,
  pickup_location: order.pickup_location,
  package_value: order.package_value,
  weight: order.weight,
  total_items: order.total_items,
  tracking_id: order.tracking_id,
  reference_number: order.reference_number,
  is_cod: order.is_cod,
  cod_amount: order.cod_amount,
  reseller_name: order.reseller_name,
  reseller_mobile: order.reseller_mobile,
  // ❌ MISSING: clientId field!
}

// 3. Calls Delhivery service
const delhiveryResponse = await delhiveryService.createOrder(orderData)
```

#### 🚨 THE BUG:
The `orderData` object **does NOT include `clientId`**, even though:
- The order FROM database HAS `clientId` (confirmed in schema: `prisma/schema.prisma:257`)
- The Delhivery service EXPECTS `clientId` in the orderData

---

### 3. Delhivery Service: `createOrder()`
**File**: `src/lib/delhivery.ts:131-342`

#### What it does (lines 139-148):
```typescript
// Extracts client ID from order data
const clientId = orderData.clientId;  // ❌ THIS WILL BE undefined!

if (!clientId) {
  console.warn('⚠️ [DELHIVERY] No client ID provided in order data - API key selection may be incorrect');
}

// Gets API key based on pickup location AND client ID
const apiKey = await getDelhiveryApiKey(orderData.pickup_location, clientId);

if (!apiKey) {
  throw new Error(`No Delhivery API key found for pickup location: ${orderData.pickup_location}${clientId ? ` and client: ${clientId}` : ''}. Please configure the API key in the client settings for this pickup location.`);
}
```

#### Impact:
- `clientId` will be `undefined`
- Warning will be logged
- API key selection proceeds WITHOUT client filtering

---

### 4. API Key Retrieval: `getDelhiveryApiKey()`
**File**: `src/lib/pickup-location-config.ts:153-282`

#### Server-side logic (lines 169-184):
```typescript
// Build the where clause
const whereClause: any = {
  value: {
    equals: pickupLocation,
    mode: 'insensitive'
  }
};

// Add client filtering if clientId is provided
if (clientId) {
  whereClause.clientId = clientId;
  console.log(`🔑 [SERVER] Filtering by client ID: ${clientId}`);
} else {
  // ❌ THIS WARNING WILL BE TRIGGERED
  console.warn(`⚠️ [SERVER] No client ID provided - this may lead to incorrect API key selection`);
}

// Query database
const pickupLocationRecord = await prisma.pickup_locations.findFirst({
  where: whereClause,  // ❌ NO CLIENT FILTERING!
  select: { 
    delhiveryApiKey: true,
    clients: {
      select: {
        companyName: true,
        id: true
      }
    }
  }
});
```

#### Impact:
When `clientId` is missing:
- Database query searches ONLY by `pickup_location` name
- If multiple clients have the same pickup location name, it returns the FIRST match
- This could be the **WRONG CLIENT'S API KEY**!

---

## Security & Correctness Issues

### Issue 1: Wrong API Key Selection
**Severity**: 🔴 CRITICAL

**Problem**: Without `clientId` filtering, the system may pick the wrong API key if:
- Multiple clients use the same pickup location name
- Example: "Main Warehouse" exists for Client A and Client B

**Impact**:
- ❌ Client A's order might use Client B's API key
- ❌ API calls may fail due to wrong credentials
- ❌ Waybills created under wrong Delhivery account
- ❌ Potential data leakage between clients

### Issue 2: Data Inconsistency
**Severity**: 🟡 MEDIUM

**Problem**: The order in database has correct `clientId`, but retry flow doesn't use it

**Impact**:
- Confusion in logs (client ID missing in retry but present in original creation)
- Difficult to debug issues
- Audit trail is incomplete

---

## Comparison: Original Order Creation vs Retry

### Original Order Creation (Working Correctly)
**File**: `src/app/api/orders/route.ts`

```typescript
// Creates order with clientId
const processedOrderData = {
  ...orderData,
  clientId: client.id,  // ✅ Client ID is included
  // ... other fields
};

// Creates order in database
const order = await prisma.Order.create({
  data: processedOrderData
});

// Calls Delhivery with full order object (includes clientId)
const delhiveryResponse = await delhiveryService.createOrder(order);  // ✅ Has clientId
```

### Fulfill Endpoint (Also Has Issues)
**File**: `src/app/api/orders/[id]/fulfill/route.ts`

```typescript
// Fetches order with client relation
order = await prisma.orders.findUnique({
  where: { id: orderId },
  include: {
    clients: true  // ✅ Includes client data
  }
});

// Calls Delhivery with full order object
delhiveryResponse = await delhiveryService.createOrder(order);  // ✅ Has clientId from DB
```

**Status**: ✅ This works because it passes the full order object which includes `clientId`

### Retry Endpoint (BROKEN — state *before* the fix; see "Fix Applied" below)
**File**: `src/app/api/orders/[id]/retry-delhivery/route.ts`

```typescript
// Fetches order WITHOUT client relation
const order = await prisma.orders.findUnique({
  where: { id: orderId }  // ❌ Doesn't include clients relation
})

// Creates NEW object WITHOUT clientId
const orderData = {
  name: order.name,
  mobile: order.mobile,
  // ... other fields
  // ❌ MISSING: clientId: order.clientId
}

// Calls Delhivery with incomplete data
const delhiveryResponse = await delhiveryService.createOrder(orderData);  // ❌ No clientId!
```

**Status**: ❌ BROKEN - Does not pass `clientId`

---

## Evidence from Logs

When retry is called, you should see these warnings in logs:

```
⚠️ [DELHIVERY] No client ID provided in order data - API key selection may be incorrect
⚠️ [SERVER] No client ID provided - this may lead to incorrect API key selection
```

These warnings indicate the bug is active.

---

## Recommended Fix

### Solution: Add `clientId` to orderData in retry endpoint

**File**: `src/app/api/orders/[id]/retry-delhivery/route.ts`

**Change** (line 64-84):
```typescript
// Prepare order data for Delhivery API
const orderData = {
  name: order.name,
  mobile: order.mobile,
  address: order.address,
  city: order.city,
  state: order.state,
  country: order.country,
  pincode: order.pincode,
  courier_service: order.courier_service,
  pickup_location: order.pickup_location,
  package_value: order.package_value,
  weight: order.weight,
  total_items: order.total_items,
  tracking_id: order.tracking_id,
  reference_number: order.reference_number,
  is_cod: order.is_cod,
  cod_amount: order.cod_amount,
  reseller_name: order.reseller_name,
  reseller_mobile: order.reseller_mobile,
  clientId: order.clientId,  // ✅ ADD THIS LINE
}
```

### Alternative Solution: Pass full order object

Instead of creating a new `orderData` object, pass the full `order` object:

```typescript
// Try to create order in Delhivery
console.log(`🚀 [RETRY_DELHIVERY] Calling Delhivery API for order ${orderId}...`);
const delhiveryResponse = await delhiveryService.createOrder(order)  // Pass full order
```

This is what the fulfill endpoint does, and it works correctly.

---

## Testing Recommendations

After fixing, verify:

1. **Single Client Test**: Retry a failed order and check logs for:
   ```
   🔑 [SERVER] Filtering by client ID: <correct-client-id>
   🔑 [SERVER] API key belongs to client: <correct-client-name>
   ```

2. **Multi-Client Test** (if applicable): 
   - Create same pickup location name for 2 different clients
   - Create order for Client A with that pickup location
   - Retry the order
   - Verify it uses Client A's API key, not Client B's

3. **Log Verification**: Ensure these warnings NO LONGER appear:
   ```
   ⚠️ [DELHIVERY] No client ID provided in order data
   ⚠️ [SERVER] No client ID provided - this may lead to incorrect API key selection
   ```

---

## Summary

| Component | Status | Client ID | API Key Selection |
|-----------|--------|-----------|------------------|
| Order Creation | ✅ Working | Included | Correct (filtered by client) |
| Fulfill Endpoint | ✅ Working | Included | Correct (filtered by client) |
| **Retry Endpoint** | ✅ **FIXED** | **Now Included** | **Correct (filtered by client)** |

---

## Fix Applied ✅ (scope: retry endpoint only)

**Date**: 2026-01-21 (per git history)
**File Modified**: `src/app/api/orders/[id]/retry-delhivery/route.ts`
**Verified still present**: 2026-08-08 — `clientId: order.clientId` at line 86, logging at lines 63-64 and 91.
**Not fixed by this change**: the fail-open in `getDelhiveryApiKey`, and the two callers in `delhivery.ts` that pass no `clientId`. See the status banner at the top of this document.

### Changes Made:

1. **Added `clientId` to orderData** (line 86):
   ```typescript
   const orderData = {
     // ... all existing fields
     clientId: order.clientId,  // ✅ Added this line
   }
   ```

2. **Added logging for better visibility** (lines 63-64, 91):
   ```typescript
   console.log(`🔍 [RETRY_DELHIVERY] Order belongs to client: ${order.clientId}`)
   console.log(`🔍 [RETRY_DELHIVERY] Pickup location: ${order.pickup_location}`)
   console.log(`🔑 [RETRY_DELHIVERY] Using client ID: ${orderData.clientId} for API key selection`)
   ```

### Expected Behavior After Fix:

When retrying a Delhivery order, you will now see logs like:
```
Retrying Delhivery order creation for order ID: 123
🔍 [RETRY_DELHIVERY] Order belongs to client: client-abc-123
🔍 [RETRY_DELHIVERY] Pickup location: main-warehouse
🚀 [RETRY_DELHIVERY] Calling Delhivery API for order 123...
🔑 [RETRY_DELHIVERY] Using client ID: client-abc-123 for API key selection
🔑 [SERVER] Filtering by client ID: client-abc-123
🔑 [SERVER] API key belongs to client: Acme Corp (ID: client-abc-123)
✅ JSON validation successful
```

### Verification:

- ✅ No TypeScript/linting errors
- ✅ Client ID is now passed to Delhivery service
- ✅ API key selection will be filtered by client
- ✅ Enhanced logging for debugging
- ✅ No breaking changes to existing functionality

### Impact:

**Before Fix**:
- ❌ Could use wrong API key if multiple clients have same pickup location name
- ❌ Warning logs: "No client ID provided - API key selection may be incorrect"
- ❌ Potential cross-client data leakage
- ❌ Failed retry attempts with wrong credentials

**After Fix**:
- ✅ Always uses correct client's API key
- ✅ No more warning logs about missing client ID
- ✅ Secure client isolation
- ✅ Successful retry attempts with correct credentials

