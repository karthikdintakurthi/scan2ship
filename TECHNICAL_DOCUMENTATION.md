# Vanitha Logistics (Scan2Ship) - Technical Documentation

## System Architecture Overview

Vanitha Logistics (Scan2Ship) is a modern, scalable SaaS platform built with a microservices-inspired architecture using Next.js 15, React 19, and PostgreSQL. The system follows a multi-tenant architecture pattern to serve multiple clients with isolated data and configurations.

### Architecture Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Admin Panel   │    │   Mobile App    │
│   (React/Next)  │    │   (React/Next)  │    │   (Future)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Next.js API Layer     │
                    │   (App Router + Routes)   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Business Logic Layer   │
                    │   (Services + Utilities)  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Data Access Layer      │
                    │   (Prisma ORM + Queries)  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    PostgreSQL Database    │
                    │   (Multi-tenant Schema)   │
                    └───────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State Management**: React Context + Hooks
- **Form Handling**: Native HTML forms with validation

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Database ORM**: Prisma 6.14
- **Authentication**: JWT + bcryptjs
- **API Documentation**: OpenAPI/Swagger (planned)

### Database
- **Primary Database**: PostgreSQL
- **Connection Pooling**: Prisma connection management
- **Migrations**: Prisma Migrate
- **Database Browser**: Prisma Studio

### Infrastructure
- **Hosting**: Vercel (Production)
- **Database Hosting**: Railway PostgreSQL
- **CDN**: Vercel Edge Network
- **Environment**: Node.js 18+

### External Integrations
- **Courier APIs**: Delhivery, DTDC, Blue Dart
- **Payment Gateways**: Razorpay (planned)
- **Communication**: Fast2SMS WhatsApp API
- **AI Services**: OpenAI GPT-4 (address processing)

## Database Schema Design

### Core Entities

#### 1. Clients (Multi-tenant Foundation)
```sql
model clients {
  id                    String                @id
  name                  String
  companyName           String
  email                 String                @unique
  phone                 String?
  address               String?
  city                  String?
  state                 String?
  country               String                @default("India")
  pincode               String?
  subscriptionPlan      String                @default("basic")
  subscriptionStatus    String                @default("active")
  subscriptionExpiresAt DateTime?
  isActive              Boolean               @default(true)
  createdAt             DateTime              @default(now())
  updatedAt             DateTime
}
```

#### 2. Orders (Core Business Entity)
```sql
model Order {
  id                       Int              @id @default(autoincrement())
  clientId                 String
  name                     String
  mobile                   String
  phone                    String?
  address                  String
  city                     String
  state                    String
  country                  String
  pincode                  String
  courier_service          String
  pickup_location          String
  package_value            Float
  weight                   Float
  total_items              Int
  tracking_id              String?
  reference_number         String?
  is_cod                   Boolean          @default(false)
  cod_amount               Float?
  reseller_name            String?
  reseller_mobile          String?
  created_at               DateTime         @default(now())
  updated_at               DateTime         @updatedAt
  
  -- Delhivery Integration Fields
  delhivery_waybill_number String?
  delhivery_order_id       String?
  delhivery_api_status     String?
  delhivery_api_error      String?
  delhivery_retry_count    Int              @default(0)
  last_delhivery_attempt   DateTime?
  
  -- Shipment Details
  shipment_length          Float?
  shipment_breadth         Float?
  shipment_height          Float?
  product_description      String?
  return_address           String?
  return_pincode           String?
  fragile_shipment         Boolean          @default(false)
  
  -- Seller Information
  seller_name              String?
  seller_address           String?
  seller_gst               String?
  invoice_number           String?
  commodity_value          Float?
  tax_value                Float?
  category_of_goods        String?
  vendor_pickup_location   String?
  hsn_code                 String?
  seller_cst_no            String?
  seller_tin               String?
  invoice_date             String?
  return_reason            String?
  ewbn                     String?
}
```

#### 3. Users (Authentication & Authorization)
```sql
model users {
  id               String             @id
  email            String
  name             String
  password         String?
  role             String             @default("user")
  isActive         Boolean            @default(true)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime
  clientId         String
}
```

#### 4. Pickup Locations (Client Configuration)
```sql
model pickup_locations {
  id              String  @id
  value           String
  label           String
  delhiveryApiKey String?
  clientId        String
  clients         clients @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([value, clientId])
}
```

#### 5. Courier Services (Client Configuration)
```sql
model courier_services {
  id        String  @id
  isActive  Boolean @default(true)
  clientId  String
  isDefault Boolean @default(false)
  code      String
  name      String
  clients   clients @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([code, clientId])
}
```

## API Architecture

### RESTful API Design

#### Authentication Endpoints
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me
```

#### Order Management
```
GET    /api/orders                    # List orders with pagination
POST   /api/orders                    # Create new order
GET    /api/orders/[id]               # Get specific order
PUT    /api/orders/[id]               # Update order
DELETE /api/orders/[id]               # Delete order
POST   /api/orders/[id]/retry-delhivery  # Retry Delhivery API
```

#### Client Management
```
GET    /api/admin/clients             # List all clients
POST   /api/admin/clients             # Create new client
GET    /api/admin/clients/[id]        # Get client details
PUT    /api/admin/clients/[id]        # Update client
DELETE /api/admin/clients/[id]        # Delete client
```

#### Configuration Management
```
GET    /api/pickup-locations          # Get pickup locations
GET    /api/courier-services          # Get courier services
GET    /api/order-config              # Get order configuration
```

#### Analytics
```
GET    /api/analytics/orders          # Order analytics
GET    /api/analytics/clients         # Client analytics
```

### API Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Security Implementation

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Session Management**: Database-backed sessions
- **Role-Based Access**: User, Admin, Master Admin roles
- **Multi-tenant Isolation**: Client-specific data access

### Data Protection
- **Encryption**: AES-256-CBC for sensitive data
- **API Key Management**: Encrypted storage of courier API keys
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Prisma ORM protection
- **XSS Prevention**: React's built-in XSS protection

### Environment Security
- **Environment Variables**: Secure configuration management
- **Database Security**: Connection string encryption
- **API Rate Limiting**: Request throttling
- **CORS Configuration**: Cross-origin request protection

## Courier Integration Architecture

### Delhivery Integration (Primary)
```typescript
interface DelhiveryOrderData {
  name: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  courier_service: string;
  pickup_location: string;
  package_value: number;
  weight: number;
  total_items: number;
  reference_number: string;
  is_cod: boolean;
  cod_amount?: number;
}
```

### Integration Features
- **API Key Management**: Per pickup location configuration
- **Error Handling**: Comprehensive retry mechanisms
- **Status Tracking**: Real-time order status updates
- **Webhook Support**: Delivery status notifications
- **Rate Limiting**: API call throttling

### Supported Couriers
1. **Delhivery** (Fully Integrated)
   - Order creation
   - Waybill generation
   - Status tracking
   - Webhook notifications

2. **DTDC** (Planned)
   - API integration
   - Rate calculation
   - Order tracking

3. **Blue Dart** (Planned)
   - Express delivery
   - International shipping
   - Real-time tracking

## Multi-Tenancy Implementation

### Data Isolation Strategy
- **Client ID Filtering**: All queries include clientId filter
- **Database Schema**: Shared schema with client isolation
- **API Middleware**: Automatic client context injection
- **Configuration Management**: Client-specific settings

### Tenant Configuration
```typescript
interface ClientConfig {
  pickupLocations: PickupLocationConfig[];
  courierServices: CourierServiceConfig[];
  orderDefaults: OrderDefaultConfig;
  branding: BrandingConfig;
  features: FeatureConfig;
}
```

## Performance Optimization

### Database Optimization
- **Indexing Strategy**: Optimized indexes on frequently queried fields
- **Query Optimization**: Efficient Prisma queries with proper relations
- **Connection Pooling**: Managed database connections
- **Caching**: Redis integration (planned)

### Frontend Optimization
- **Code Splitting**: Dynamic imports for route-based splitting
- **Image Optimization**: Next.js Image component
- **Bundle Optimization**: Tree shaking and minification
- **CDN**: Vercel Edge Network for static assets

### API Optimization
- **Response Caching**: HTTP caching headers
- **Pagination**: Efficient data pagination
- **Compression**: Gzip compression
- **Rate Limiting**: API request throttling

## Deployment Architecture

### Production Environment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel Edge   │    │   Vercel App    │    │  Railway DB     │
│   (CDN/Static)  │    │   (Serverless)  │    │  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Environment Configuration
```bash
# Production Environment Variables
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://scan2ship.vercel.app"
```

### CI/CD Pipeline
1. **Code Push**: GitHub repository
2. **Automated Testing**: Jest + Playwright (planned)
3. **Build Process**: Vercel build pipeline
4. **Database Migration**: Prisma migrate deploy
5. **Deployment**: Vercel production deployment

## Monitoring & Logging

### Application Monitoring
- **Error Tracking**: Vercel Analytics
- **Performance Monitoring**: Vercel Speed Insights
- **Uptime Monitoring**: External monitoring services
- **Database Monitoring**: Railway metrics

### Logging Strategy
```typescript
// Structured logging with levels
logger.info('Order created', { orderId, clientId, userId });
logger.warn('API rate limit exceeded', { endpoint, clientId });
logger.error('Database connection failed', { error, context });
```

### Health Checks
- **API Health**: `/api/health` endpoint
- **Database Health**: Connection pool status
- **External Services**: Courier API availability
- **System Resources**: Memory and CPU usage

## Testing Strategy

### Unit Testing
- **Framework**: Jest
- **Coverage**: Components, utilities, services
- **Mocking**: External API dependencies
- **Assertions**: Comprehensive test cases

### Integration Testing
- **API Testing**: End-to-end API tests
- **Database Testing**: Prisma integration tests
- **Authentication Testing**: JWT flow validation
- **Multi-tenant Testing**: Client isolation verification

### E2E Testing
- **Framework**: Playwright (planned)
- **User Flows**: Complete order lifecycle
- **Cross-browser**: Chrome, Firefox, Safari
- **Mobile Testing**: Responsive design validation

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: No server-side state
- **Load Balancing**: Vercel automatic scaling
- **Database Scaling**: Read replicas (planned)
- **CDN**: Global content distribution

### Vertical Scaling
- **Resource Optimization**: Efficient memory usage
- **Database Optimization**: Query performance tuning
- **Caching Strategy**: Multi-level caching
- **Connection Pooling**: Database connection management

### Future Scalability
- **Microservices**: Service decomposition
- **Event-Driven Architecture**: Message queues
- **Containerization**: Docker deployment
- **Kubernetes**: Orchestration platform

## Development Workflow

### Local Development Setup
```bash
# Clone repository
git clone <repository-url>
cd scan2ship

# Install dependencies
npm install

# Setup environment
cp env-template.env .env.local

# Setup database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### Code Quality Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Git Hooks**: Pre-commit validation

### Branching Strategy
- **Main**: Production-ready code
- **Develop**: Integration branch
- **Feature**: Feature development
- **Hotfix**: Production bug fixes

## Troubleshooting Guide

### Common Issues

#### Database Connection Issues
```bash
# Check database connection
npm run db:studio

# Reset database
npm run db:reset

# Check migrations
npx prisma migrate status
```

#### API Integration Issues
```bash
# Test Delhivery API
node scripts/test-delhivery-api.js

# Check API keys
node scripts/check-pickup-locations.js

# Clear cache
npm run cache:clear
```

#### Deployment Issues
```bash
# Check build logs
vercel logs

# Redeploy
vercel --prod

# Check environment variables
vercel env ls
```

## Future Technical Roadmap

### Phase 1: Foundation (Completed)
- ✅ Multi-tenant architecture
- ✅ Basic order management
- ✅ Delhivery integration
- ✅ Authentication system

### Phase 2: Enhancement (In Progress)
- 🔄 Advanced analytics
- 🔄 Mobile application
- 🔄 Additional courier integrations
- 🔄 Real-time notifications

### Phase 3: Scale (Planned)
- 📋 Microservices architecture
- 📋 Event-driven design
- 📋 Advanced caching
- 📋 AI/ML integration

### Phase 4: Innovation (Future)
- 📋 Blockchain integration
- 📋 IoT device support
- 📋 Predictive analytics
- 📋 Global expansion

## Conclusion

Vanitha Logistics (Scan2Ship) is built with modern, scalable technologies that support rapid development and deployment. The architecture is designed to handle growth while maintaining performance, security, and reliability.

The technical foundation provides a solid base for future enhancements and ensures the platform can scale to meet the growing demands of the logistics industry.
