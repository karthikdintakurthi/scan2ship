# Delhivery Retry Flow - Audit Summary

> **⚠️ STATUS — reviewed 2026-08-08: PARTIALLY RESOLVED.**
>
> The retry-endpoint fix described here is real and still in place. The **root cause is not fixed**: `getDelhiveryApiKey` (`src/lib/pickup-location-config.ts:153`) still treats `clientId` as optional and falls back to an unfiltered, cross-tenant `findFirst` when it is missing — guarded only by a `console.warn`. Two callers in `src/lib/delhivery.ts` (`:365`, `:395`) still pass no `clientId`, and `src/app/api/orders/[id]/route.ts:265` passes `parseInt()` of a UUID, which is `NaN` and therefore falsy.
>
> Treat the "Impact — After Fix" and "Status" sections below as **scoped to the retry endpoint only**, not to the vulnerability class. Full detail: `docs/audits/FULL_APP_AUDIT_2026-08-08.md`.

## Question Asked
"When Delhivery Retry call is clicked in view order - which client ID and API key are being sent to Delhivery? Is it picking the right API key from that client and pickup location config?"

---

## Answer: Critical Bug Found & Partially Fixed ⚠️

### The Bug
The Delhivery retry endpoint was **NOT passing the `clientId`** to the Delhivery service, which meant:
- ❌ API key selection was done WITHOUT client filtering
- ❌ If multiple clients had the same pickup location name, it would pick the FIRST match (could be wrong client)
- ❌ Potential security issue: Client A's order could use Client B's API key

### The Flow Before Fix

```
View Order Modal
    ↓ [Click "Fulfill Order"]
/api/orders/[id]/retry-delhivery
    ↓ [Fetches order with clientId]
    ↓ [Creates orderData WITHOUT clientId] ❌
delhiveryService.createOrder(orderData)
    ↓ [clientId is undefined] ❌
getDelhiveryApiKey(pickupLocation, undefined)
    ↓ [Queries DB WITHOUT client filter] ❌
    ↓ [Could return WRONG client's API key!] ❌
```

### The Flow After Fix

```
View Order Modal
    ↓ [Click "Fulfill Order"]
/api/orders/[id]/retry-delhivery
    ↓ [Fetches order with clientId]
    ↓ [Creates orderData WITH clientId] ✅
delhiveryService.createOrder(orderData)
    ↓ [clientId is included] ✅
getDelhiveryApiKey(pickupLocation, clientId)
    ↓ [Queries DB WITH client filter] ✅
    ↓ [Returns CORRECT client's API key] ✅
```

---

## Changes Made

**File**: `src/app/api/orders/[id]/retry-delhivery/route.ts`

### 1. Added `clientId` to orderData (line 86)
```typescript
const orderData = {
  name: order.name,
  mobile: order.mobile,
  // ... other fields
  clientId: order.clientId,  // ✅ NEW: Ensures correct API key selection
}
```

### 2. Added Enhanced Logging (lines 63-64, 91)
```typescript
console.log(`🔍 [RETRY_DELHIVERY] Order belongs to client: ${order.clientId}`)
console.log(`🔍 [RETRY_DELHIVERY] Pickup location: ${order.pickup_location}`)
console.log(`🔑 [RETRY_DELHIVERY] Using client ID: ${orderData.clientId} for API key selection`)
```

---

## How to Verify the Fix

When you retry a failed Delhivery order, check the server logs. You should now see:

```
Retrying Delhivery order creation for order ID: 123
🔍 [RETRY_DELHIVERY] Order belongs to client: your-client-id
🔍 [RETRY_DELHIVERY] Pickup location: main-warehouse
🚀 [RETRY_DELHIVERY] Calling Delhivery API for order 123...
🔑 [RETRY_DELHIVERY] Using client ID: your-client-id for API key selection
🔑 [SERVER] Filtering by client ID: your-client-id
🔑 [SERVER] API key belongs to client: Your Company Name (ID: your-client-id)
```

**You should NOT see these warnings anymore:**
```
⚠️ [DELHIVERY] No client ID provided in order data - API key selection may be incorrect
⚠️ [SERVER] No client ID provided - this may lead to incorrect API key selection
```

---

## Impact

### Before Fix ❌
- Could use wrong client's API key
- Failed retry attempts with incorrect credentials
- Potential cross-client data leakage
- Security vulnerability if multiple clients share pickup location names

### After Fix ⚠️ (retry endpoint only)
- The retry endpoint now passes `clientId`, so **this path** selects the correct client's API key
- Successful retry attempts with proper credentials
- Clear audit trail in logs showing which client and API key are used

### Still Outstanding ❌
- `getDelhiveryApiKey` **fails open**: with no `clientId` it matches a pickup location by name across **all** tenants and returns the first key found (`pickup-location-config.ts:179`)
- `delhivery.ts:365` (`getOrderStatus`) and `:395` (`validatePincode`) pass **no** `clientId`
- `orders/[id]/route.ts:265` passes `parseInt(<uuid>)` → `NaN` → filter silently dropped
- The API key value is written to logs in plaintext (`pickup-location-config.ts:212`, `delhivery.ts:95-97`)

**Client isolation is therefore not yet guaranteed for Delhivery API key selection.** The durable fix is to make `clientId` a required parameter and remove the unfiltered fallback entirely.

---

## Status

Re-verified 2026-08-08:

| Caller | Client ID Passed | API Key Selection | Status |
|----------|-----------------|-------------------|---------|
| `/api/orders` (Create) | ✅ Yes | Correct (client-filtered) | ✅ Working |
| `/api/orders/[id]/fulfill` | ✅ Yes | Correct (client-filtered) | ⚠️ Key selection OK, but the endpoint has **no authentication** — see FULL_APP_AUDIT_2026-08-08.md |
| `/api/orders/[id]/retry-delhivery` | ✅ Yes | Correct (client-filtered) | ✅ Fixed 2026-01-21, still in place |
| `/api/orders/[id]` DELETE (cancel) | ❌ `parseInt(<uuid>)` → `NaN` | **Unfiltered — cross-tenant** | ❌ Broken |
| `delhivery.ts:365` `getOrderStatus` | ❌ Not passed | **Unfiltered — cross-tenant** | ❌ Broken |
| `delhivery.ts:395` `validatePincode` | ❌ Not passed | **Unfiltered — cross-tenant** | ❌ Broken |
| `getDelhiveryApiKey` itself | `clientId` is **optional** | Falls back to unfiltered `findFirst` | ❌ Root cause |

---

## Related Improvements

While auditing, also implemented:
- ✅ Enhanced data sanitization for Delhivery API (removes special characters like `&`, `/`)
- ✅ Comprehensive logging throughout the Delhivery flow
- ✅ Better error messages and debugging information

---

## Detailed Documentation

For complete technical details, see:
- `AUDIT_DELHIVERY_RETRY_FLOW.md` - Full audit report with code analysis
- `DELHIVERY_SANITIZATION_SUMMARY.md` - Data sanitization implementation details

