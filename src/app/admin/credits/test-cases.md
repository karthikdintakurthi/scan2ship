# Admin Credits Page Test Cases

## Test Case 1: Null Safety for clientCredits.balance
**Scenario**: Component renders before API call completes
**Expected**: No TypeError, displays "0.00" as fallback
**Test**: Verify `clientCredits?.balance ? clientCredits.balance.toFixed(2) : '0.00'` works

## Test Case 2: Null Safety for clientCredits.lastUpdated
**Scenario**: Component renders before API call completes
**Expected**: No TypeError, displays "Never" as fallback
**Test**: Verify `clientCredits?.lastUpdated ? formatDate(clientCredits.lastUpdated) : 'Never'` works

## Test Case 3: Null Safety for clientCredits.clientId
**Scenario**: Component renders before API call completes
**Expected**: No TypeError, displays "N/A" as fallback
**Test**: Verify `clientCredits?.clientId || 'N/A'` works

## Test Case 4: formatDate Function Safety
**Scenario**: Invalid or null date string passed
**Expected**: No TypeError, returns "N/A" or "Invalid Date"
**Test**: Verify function handles null, undefined, and invalid dates

## Test Case 5: Authentication Guards
**Scenario**: User not authenticated
**Expected**: Shows "Not Authenticated" message, no API calls
**Test**: Verify useEffect dependencies include auth checks

## Test Case 6: Role-Based Access Control
**Scenario**: User not master admin
**Expected**: Shows "Access Denied" message
**Test**: Verify role check prevents access

## Test Case 7: Loading States
**Scenario**: Data loading in progress
**Expected**: Shows loading spinner, no errors
**Test**: Verify loading states prevent premature rendering

## Test Case 8: Error Handling
**Scenario**: API call fails
**Expected**: Shows specific error message, no crashes
**Test**: Verify error states are properly managed

## Test Case 9: API Endpoint Correctness
**Scenario**: All API calls made
**Expected**: Correct endpoints used
**Test**: Verify URLs match backend structure

## Test Case 10: Defensive Programming
**Scenario**: Any unexpected data structure
**Expected**: Graceful fallbacks, no crashes
**Test**: Verify all optional chaining and null checks work
