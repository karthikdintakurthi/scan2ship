# How to Authenticate and Call Scan2Ship APIs

Follow these steps to authenticate and use the Scan2Ship API endpoints such as courier services and pickup locations.

## 1. Authenticate and Get JWT Token


Send a POST request to the login endpoint with your email and password:

```
POST https://qa.scan2ship.in/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

The response will include a `token` field. This is your JWT token.

## 2. Call APIs with JWT Token


For all API requests (e.g., `/api/courier-services`, `/api/pickup-locations`), include the JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```


### Example: Get Courier Services

```
GET https://qa.scan2ship.in/api/courier-services
Authorization: Bearer <token>
```


### Example: Get Pickup Locations

```
GET https://qa.scan2ship.in/api/pickup-locations
Authorization: Bearer <token>
```

Replace `<token>` with the JWT you received from the login response. All endpoints require this header for authentication. If the token is missing or invalid, you will get a 401 Unauthorized error.
