# 🧪 SCAN2SHIP API TESTS DOCUMENTATION

**Project:** Scan2Ship - Vanitha Logistics Platform  
**Test Framework:** Jest + Testing Library  
**Coverage Target:** 90%+ for Security APIs, 75%+ for General APIs  
**Last Updated:** December 2024  

---

## 📋 OVERVIEW

This document provides comprehensive documentation for the API test suite covering all endpoints and webhooks in the Scan2Ship application. The test suite is designed to ensure security, reliability, and proper functionality of all API endpoints.

### Test Categories

| Category | Priority | Coverage Target | Description |
|----------|----------|-----------------|-------------|
| **Authentication APIs** | CRITICAL | 90%+ | Login, registration, token refresh, password management |
| **Admin APIs** | HIGH | 85%+ | User management, client management, system configuration |
| **Order Management APIs** | HIGH | 75%+ | Order CRUD operations, status updates, tracking |
| **Webhook APIs** | CRITICAL | 90%+ | Shopify webhooks, external integrations |
| **Shopify Integration APIs** | HIGH | 85%+ | Shopify authentication, configuration, order sync |
| **General APIs** | MEDIUM | 70%+ | Utility endpoints, health checks, configuration |

---

## 🚀 QUICK START

### Running Tests

```bash
# Run all API tests
npm run test:api:all

# Run tests by category
npm run test:api:auth      # Authentication tests
npm run test:api:admin     # Admin tests
npm run test:api:orders    # Order management tests
npm run test:api:webhooks  # Webhook tests
npm run test:api:shopify   # Shopify integration tests

# Run tests by priority
npm run test:api:critical  # Critical tests (auth + webhooks)
npm run test:api:high      # High priority tests (admin + orders + shopify)

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest src/app/api/__tests__/auth/login.test.ts

# Run tests in watch mode
npm run test:watch
```

### Test Structure

```
src/app/api/__tests__/
├── auth/
│   ├── login.test.ts
│   ├── register-user.test.ts
│   ├── register-client.test.ts
│   ├── refresh.test.ts
│   ├── change-password.test.ts
│   └── verify.test.ts
├── admin/
│   ├── users.test.ts
│   ├── clients.test.ts
│   ├── system-config.test.ts
│   └── jwt-secrets.test.ts
├── orders.test.ts
├── webhooks/
│   ├── shopify.test.ts
│   ├── delhivery.test.ts
│   └── general.test.ts
└── shopify/
    ├── auth.test.ts
    ├── config.test.ts
    └── webhooks.test.ts
```

---

## 🔐 AUTHENTICATION API TESTS

### Login API (`/api/auth/login`)

**Test File:** `src/app/api/__tests__/auth/login.test.ts`

#### Test Cases:
- ✅ Successful login with valid credentials
- ✅ Session creation with proper expiration
- ✅ Audit logging for successful login
- ❌ Invalid email format rejection
- ❌ Invalid password rejection
- ❌ Non-existent user rejection
- ❌ Inactive user rejection
- ❌ Wrong password rejection
- ❌ Database error handling
- ❌ Session management (max concurrent sessions)
- ❌ Session creation errors
- ❌ Input validation
- ❌ Security middleware application
- ❌ Failed login attempt logging
- ❌ Malformed JSON handling
- ❌ Missing request body handling

#### Security Tests:
- Password validation
- Rate limiting
- Session security
- Audit logging
- Input sanitization

### Register User API (`/api/auth/register-user`)

**Test File:** `src/app/api/__tests__/auth/register-user.test.ts`

#### Test Cases:
- ✅ Successful user registration
- ✅ Password hashing with salt
- ✅ Audit logging for registration
- ❌ Invalid email format rejection
- ❌ Weak password rejection
- ❌ Empty name rejection
- ❌ Missing required fields
- ❌ Duplicate email rejection
- ❌ Invalid client ID rejection
- ❌ Inactive client rejection
- ❌ Database errors
- ❌ Password hashing failures
- ❌ Security middleware application
- ❌ Password strength validation
- ❌ Malformed JSON handling
- ❌ Special characters in name

#### Security Tests:
- Password policy enforcement
- Input validation
- Duplicate prevention
- Client validation
- Audit logging

### Refresh Token API (`/api/auth/refresh`)

**Test File:** `src/app/api/__tests__/auth/refresh.test.ts`

#### Test Cases:
- ✅ Successful token refresh
- ✅ Session last activity update
- ✅ Audit logging for refresh
- ❌ Missing refresh token rejection
- ❌ Invalid refresh token rejection
- ❌ Expired refresh token rejection
- ❌ Non-existent session rejection
- ❌ Inactive session rejection
- ❌ Expired session rejection
- ❌ Token generation with correct payload
- ❌ Token generation failure
- ❌ Session update failure
- ❌ Session lookup failure
- ❌ Token type validation
- ❌ Token permissions validation
- ❌ Failed refresh attempt logging
- ❌ Malformed JSON handling
- ❌ Empty refresh token handling
- ❌ Very long refresh token handling

#### Security Tests:
- Token validation
- Session security
- Permission checks
- Audit logging

---

## 👑 ADMIN API TESTS

### Users Management API (`/api/admin/users`)

**Test File:** `src/app/api/__tests__/admin/users.test.ts`

#### GET Tests:
- ✅ Get all users successfully
- ✅ Pagination parameters handling
- ✅ Filter by client
- ✅ Filter by role
- ✅ Filter by status
- ❌ Unauthorized access rejection

#### POST Tests:
- ✅ Create user successfully
- ✅ Password hashing
- ✅ Audit logging
- ❌ Duplicate email rejection
- ❌ Invalid client ID rejection
- ❌ Weak password rejection

#### PUT Tests:
- ✅ Update user successfully
- ❌ Non-existent user rejection
- ❌ Invalid role rejection

#### DELETE Tests:
- ✅ Delete user successfully
- ❌ Non-existent user rejection
- ❌ Own account deletion prevention

#### Security Tests:
- Role-based access control
- Permission validation
- Input validation
- Audit logging
- Authorization checks

---

## 📦 ORDER MANAGEMENT API TESTS

### Orders API (`/api/orders`)

**Test File:** `src/app/api/__tests__/orders.test.ts`

#### GET Tests:
- ✅ Get orders successfully
- ✅ Pagination parameters
- ✅ Filter by status
- ✅ Filter by date range
- ✅ Search by customer name

#### POST Tests:
- ✅ Create order successfully
- ❌ Required fields validation
- ❌ Email format validation
- ❌ Phone number validation
- ❌ Positive weight validation
- ❌ Positive value validation

#### PUT Tests:
- ✅ Update order successfully
- ❌ Non-existent order rejection
- ❌ Different client access denial
- ❌ Invalid status validation

#### DELETE Tests:
- ✅ Delete order successfully
- ❌ Non-existent order rejection
- ❌ Different client access denial
- ❌ Active status deletion prevention

#### Security Tests:
- Client isolation
- Input validation
- Authorization checks
- Audit logging

---

## 🔗 WEBHOOK API TESTS

### Shopify Webhooks API (`/api/shopify/webhooks`)

**Test File:** `src/app/api/__tests__/shopify/webhooks.test.ts`

#### Webhook Types:
- ✅ Order creation webhook
- ✅ Order update webhook
- ✅ Fulfillment creation webhook

#### Security Tests:
- ✅ HMAC signature validation
- ✅ Shop domain validation
- ✅ Required headers validation
- ✅ Topic validation
- ❌ Invalid signature rejection
- ❌ Unknown shop rejection
- ❌ Missing headers rejection
- ❌ Invalid topic rejection

#### Data Validation:
- ✅ Order data structure validation
- ✅ Payload sanitization
- ❌ Invalid order data rejection

#### Error Handling:
- ❌ Database error handling
- ❌ Malformed JSON handling
- ❌ Missing request body handling

#### Audit Logging:
- ✅ Successful webhook processing
- ✅ Failed webhook processing

#### Edge Cases:
- ✅ Large webhook payloads
- ✅ Special characters handling

---

## 🛠️ TEST UTILITIES

### Mock Setup

The test suite includes comprehensive mocking for:

- **Prisma Database:** All database operations
- **Authentication:** JWT tokens, sessions, users
- **Security Middleware:** Rate limiting, CORS, headers
- **External Services:** Shopify API, payment gateways
- **File Operations:** Upload, processing, storage

### Test Data Factories

```typescript
// Example test data factory
const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  clientId: 'client-1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

### Security Test Helpers

```typescript
// Example security test helper
const testSecurityMiddleware = async (request, expectedStatus) => {
  const { applySecurityMiddleware } = require('@/lib/security-middleware');
  applySecurityMiddleware.mockReturnValue({
    status: expectedStatus,
    json: () => ({ error: 'Security violation' }),
  });
  
  const response = await handler(request);
  expect(response.status).toBe(expectedStatus);
};
```

---

## 📊 COVERAGE REQUIREMENTS

### Security APIs (90%+ Coverage Required)

| API | Current Coverage | Target | Status |
|-----|------------------|--------|--------|
| Authentication | 0% | 90% | ❌ Not Started |
| Webhooks | 0% | 90% | ❌ Not Started |
| Admin Security | 0% | 90% | ❌ Not Started |

### General APIs (75%+ Coverage Required)

| API | Current Coverage | Target | Status |
|-----|------------------|--------|--------|
| Order Management | 0% | 75% | ❌ Not Started |
| Admin Management | 0% | 85% | ❌ Not Started |
| Shopify Integration | 0% | 85% | ❌ Not Started |

### Overall Coverage

- **Current:** 0%
- **Target:** 80%
- **Critical APIs:** 90%
- **General APIs:** 75%

---

## 🚨 SECURITY TESTING

### Authentication Security
- Password strength validation
- Session management
- Token security
- Rate limiting
- Brute force protection

### Authorization Security
- Role-based access control
- Permission validation
- Client isolation
- Resource access control

### Input Security
- XSS prevention
- SQL injection prevention
- Input sanitization
- Data validation

### Webhook Security
- Signature validation
- Payload verification
- Rate limiting
- Audit logging

---

## 🔧 TESTING COMMANDS

### Development Commands

```bash
# Run specific test category
npm run test:api:auth

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run all API tests
npm run test:api:all
```

### CI/CD Commands

```bash
# Run tests for CI
npm run test:ci

# Run critical tests only
npm run test:api:critical

# Generate coverage report
npm run coverage:api
```

### Debug Commands

```bash
# Run single test file
npx jest src/app/api/__tests__/auth/login.test.ts

# Run with verbose output
npx jest --verbose

# Run with debug info
npx jest --detectOpenHandles
```

---

## 📈 TEST METRICS

### Success Criteria

- **Test Reliability:** 99%+ pass rate
- **Test Performance:** < 30 seconds execution time
- **Security Coverage:** 100% of critical paths
- **API Coverage:** 100% of endpoints

### Quality Gates

- All critical tests must pass
- 90%+ coverage on security APIs
- 75%+ coverage on general APIs
- No security vulnerabilities in tests
- All edge cases covered

---

## 🎯 NEXT STEPS

### Immediate Actions (Week 1)
1. **Fix Jest Configuration** - Resolve module resolution issues
2. **Run Basic Tests** - Ensure test framework works
3. **Implement Critical Tests** - Authentication and webhook tests
4. **Achieve 50% Coverage** - Basic functionality covered

### Short Term (Week 2-3)
1. **Complete Security Tests** - All security APIs tested
2. **Implement Admin Tests** - User and client management
3. **Add Order Tests** - Order management functionality
4. **Achieve 80% Coverage** - Most functionality covered

### Long Term (Week 4+)
1. **Integration Tests** - End-to-end testing
2. **Performance Tests** - Load and stress testing
3. **Security Tests** - Penetration testing
4. **Achieve 90% Coverage** - Production-ready testing

---

## 📚 RESOURCES

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/docs/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)

### Security Testing
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Security Testing Best Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)

### API Testing
- [REST API Testing Guide](https://restfulapi.net/testing-rest-apis/)
- [API Security Testing](https://owasp.org/www-project-api-security-top-ten/)

---

*This documentation was generated by AI Security Assistant on December 2024. For questions or updates, please contact the development team.*
