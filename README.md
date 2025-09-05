# Scan2Ship - Accelerate Your Logistics

A software product that brings extra speed to your regular logistics operations. Built with Next.js, React, and PostgreSQL for lightning-fast order management and logistics acceleration.

## Features

- **Order Intake Form**: Complete form for creating new orders with all required fields
- **Order Management**: View, search, and manage existing orders
- **Database Integration**: PostgreSQL database with Prisma ORM
- **RESTful API**: Full CRUD operations for orders
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Search & Pagination**: Advanced order search and pagination
- **Real-time Updates**: Immediate feedback on form submissions

## Database Schema

The `orders` table includes the following fields:

| Field | Type | Description |
|-------|------|-------------|
| id | String (Primary Key) | Unique order identifier |
| mobile | String | Customer mobile number |
| courier_service | String | Selected courier service |
| pincode | String | Delivery pincode |
| name | String | Customer name |
| address | String | Delivery address |
| city | String | City |
| state | String | State |
| country | String | Country |
| pickup_location | String | Pickup location |
| is_cod | Boolean | Cash on delivery flag |
| package_value | Decimal | Package value in INR |
| reference_number | String | Optional reference number |
| total_items | Integer | Number of items |
| weight | Decimal | Package weight in kg |
| tracking_id | String | Optional tracking ID |
| reseller_name | String | Optional reseller name |
| reseller_mobile | String | Optional reseller mobile |
| created_at | DateTime | Order creation timestamp |
| updated_at | DateTime | Last update timestamp |

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Development**: ESLint, TypeScript

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vanitha-logistics-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the .env file and update with your database credentials
   cp .env.example .env
   ```

   Update the `.env` file with your database connection:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/vanitha-logistics"
   JWT_SECRET="your-super-secret-jwt-key-here"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev --name init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000)

## Database Setup

### Option 1: Local PostgreSQL

1. Install PostgreSQL on your system
2. Create a new database:
   ```sql
   CREATE DATABASE order_management;
   ```
3. Update the `.env` file with your local database credentials

### Option 2: Cloud Database (Recommended for production)

- **Supabase**: Free PostgreSQL hosting
- **Neon**: Serverless PostgreSQL
- **Railway**: Easy PostgreSQL deployment

## API Endpoints

### Orders

- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get all orders with pagination and search
- `GET /api/orders/[id]` - Get a specific order
- `PUT /api/orders/[id]` - Update an order
- `DELETE /api/orders/[id]` - Delete an order

### Query Parameters

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search term for name, mobile, tracking ID, or reference number

## Usage

### Creating Orders

1. Navigate to the "New Order" tab
2. Fill in all required fields (marked with *)
3. Optional fields include reference number, tracking ID, and reseller information
4. Click "Create Order" to submit

### Managing Orders

1. Switch to the "View Orders" tab
2. Use the search bar to find specific orders
3. View order details by clicking the "View" button
4. Delete orders using the "Delete" button
5. Navigate through pages using pagination controls

## Development

### Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   │   └── orders/     # Order-related API endpoints
│   └── page.tsx        # Main page component
├── components/          # React components
│   ├── OrderForm.tsx   # Order creation form
│   └── OrderList.tsx   # Order listing and management
└── lib/                 # Utility functions
    └── db.ts           # Database connection
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma database browser

### Database Management

```bash
# View database in browser
npx prisma studio

# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name <migration-name>

# Deploy migrations to production
npx prisma migrate deploy
```

## Customization

### Adding New Fields

1. Update the Prisma schema in `prisma/schema.prisma`
2. Run `npx prisma migrate dev` to create a migration
3. Update the form component in `OrderForm.tsx`
4. Update the list component in `OrderList.tsx`
5. Update API validation in the route handlers

### Styling

The application uses Tailwind CSS for styling. Customize the design by:
- Modifying Tailwind classes in components
- Adding custom CSS in `globals.css`
- Updating the Tailwind configuration in `tailwind.config.js`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

- **Netlify**: Similar to Vercel deployment
- **Railway**: Full-stack deployment with database
- **Heroku**: Traditional hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the API endpoints

## Future Enhancements

- User authentication and authorization
- Order status tracking
- Email notifications
- Bulk order import/export
- Advanced reporting and analytics
- Mobile app support
- Integration with courier APIs
# QA Environment Fix - Thu Sep  4 23:21:20 EDT 2025
