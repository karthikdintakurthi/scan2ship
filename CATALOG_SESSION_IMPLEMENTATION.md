# Catalog Session Management Implementation

## Overview
This implementation adds proper session management for catalog app integration in scan2ship. When a user logs into the catalog app, all client details are stored in scan2ship's database and used for subsequent API calls until the session expires or the user logs out.

## Database Changes

### New Table: `catalog_sessions`
```sql
CREATE TABLE catalog_sessions (
  id                TEXT PRIMARY KEY,
  scan2shipClientId TEXT NOT NULL,
  catalogClientId   TEXT NOT NULL,
  catalogUserId     TEXT NOT NULL,
  catalogUserEmail  TEXT NOT NULL,
  catalogUserRole   TEXT NOT NULL,
  catalogClientSlug TEXT,
  authToken         TEXT NOT NULL,
  tokenExpiresAt    TIMESTAMP NOT NULL,
  isActive          BOOLEAN DEFAULT true,
  lastUsedAt        TIMESTAMP,
  createdAt         TIMESTAMP DEFAULT NOW(),
  updatedAt         TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(scan2shipClientId),
  FOREIGN KEY (scan2shipClientId) REFERENCES clients(id) ON DELETE CASCADE
);
```

## API Changes

### 1. Enhanced Catalog Login (`POST /api/catalog`)
- **Action**: `authenticate`
- **New Behavior**: 
  - Stores complete session details in `catalog_sessions` table
  - Extracts JWT token expiration time
  - Maintains backward compatibility with `client_config` table

### 2. Updated Product Search (`POST /api/catalog`)
- **Action**: `search_products`
- **New Behavior**: 
  - Uses stored session data instead of `client_config`
  - Validates session expiration
  - Returns `requiresLogin: true` when session is invalid

### 3. New Logout Endpoint (`POST /api/catalog`)
- **Action**: `logout`
- **Behavior**: 
  - Invalidates the catalog session
  - Sets `isActive = false` in database
  - Clears local storage

### 4. Updated All Catalog APIs
All catalog-related APIs now use the session management:
- `get_product`
- `check_inventory`
- `reduce_inventory`
- `restore_inventory`

## New Utility Functions

### `src/lib/catalog-session.ts`
- `getActiveCatalogSession(scan2shipClientId)`: Get valid session for client
- `isCatalogSessionValid(scan2shipClientId)`: Check if session is valid
- `invalidateCatalogSession(scan2shipClientId)`: Logout/invalidate session
- `getCatalogSessionForApi(scan2shipClientId)`: Get session data for API calls

### Enhanced `src/lib/catalog-service.ts`
- `logout()`: Logout from catalog app
- `checkSessionStatus()`: Check if current session is valid

## Session Lifecycle

1. **Login**: User provides catalog credentials
   - Authenticates with catalog app
   - Stores session details in `catalog_sessions` table
   - JWT token and expiration time are stored

2. **API Calls**: All catalog operations use stored session
   - Session is validated (not expired, still active)
   - JWT token is used for catalog app API calls
   - `lastUsedAt` timestamp is updated

3. **Session Expiry**: Automatic cleanup
   - Sessions are checked for expiration
   - Expired sessions return `requiresLogin: true`
   - Frontend can trigger re-login

4. **Logout**: Manual session termination
   - Session is marked as inactive
   - Local storage is cleared
   - User must re-authenticate

## Benefits

1. **Persistent Sessions**: Users don't need to re-login for each operation
2. **Automatic Expiry**: Sessions expire based on JWT token expiration
3. **Centralized Management**: All session data stored in scan2ship database
4. **Backward Compatibility**: Existing `client_config` approach still works
5. **Security**: Sessions are properly invalidated on logout
6. **Performance**: Reduced authentication overhead

## Usage Example

```javascript
// Login to catalog
const catalogService = new CatalogService();
await catalogService.authenticate('user@example.com', 'password');

// Use catalog features (session automatically managed)
const products = await catalogService.searchProducts('hair', 1, 20);
const product = await catalogService.getProduct('SKU123');

// Logout when done
await catalogService.logout();
```

## Testing

Run the test script to verify the complete flow:
```bash
node test-catalog-session.js
```

This will test:
1. Catalog authentication
2. Session storage
3. Product search using stored session
4. Logout functionality
5. Session invalidation
