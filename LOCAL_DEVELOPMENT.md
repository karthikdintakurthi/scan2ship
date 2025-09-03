# Local Development Guide

## 🚀 Quick Start with Local Database

Your Scan2Ship application is now configured to use a local SQLite database for development.

### Option 1: Use the Startup Script (Recommended)

```bash
# Start the application with local database
./start-local.sh
```

This script automatically sets the correct environment variables and starts the development server.

### Option 2: Manual Environment Setup

If you prefer to set environment variables manually:

```bash
# Set local database environment
export DATABASE_URL="file:./prisma/dev.db"
export NODE_ENV="development"
export JWT_SECRET="local-dev-jwt-secret-key-minimum-32-characters-long"
export ENCRYPTION_KEY="local-dev-encryption-key-minimum-32-chars"

# Start the development server
npm run dev
```

## 📊 Database Information

- **Database Type**: SQLite
- **Database File**: `prisma/dev.db`
- **Location**: `./prisma/dev.db`
- **Current Tables**: 
  - `Order` - Order management
  - `_prisma_migrations` - Database migrations

## 🔧 Database Management

### View Database Contents
```bash
# Open SQLite database
sqlite3 prisma/dev.db

# List tables
.tables

# View data
SELECT * FROM "Order";

# Exit
.quit
```

### Reset Database
```bash
# Remove existing database
rm prisma/dev.db

# Regenerate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

## 🌐 Access Points

- **Main Application**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **API Endpoints**: http://localhost:3000/api/*

## ⚠️ Important Notes

1. **Environment Variables**: The startup script sets temporary environment variables for the current session
2. **Database Persistence**: Your local database data persists between sessions
3. **Remote Database**: The `.env.local` file still contains remote database configuration for production use
4. **Schema Changes**: If you modify the Prisma schema, run `npx prisma generate` to update the client

## 🚨 Troubleshooting

### Database Connection Issues
- Ensure `prisma/dev.db` exists
- Check if the database file is readable
- Verify Prisma client is generated: `npx prisma generate`

### Port Already in Use
```bash
# Kill existing processes
pkill -f "next dev"

# Or use a different port
PORT=3001 npm run dev
```

### Prisma Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset

# Push schema changes
npx prisma db push
```

## 📝 Development Workflow

1. **Start Development**: `./start-local.sh`
2. **Make Changes**: Edit your code
3. **View Changes**: Browser automatically refreshes
4. **Database Changes**: Use Prisma Studio or SQLite commands
5. **Stop Server**: `Ctrl+C` in terminal

Happy coding! 🎉
