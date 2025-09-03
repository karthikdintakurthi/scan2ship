#!/bin/bash

# Start Scan2Ship with local database
echo "🚀 Starting Scan2Ship with local SQLite database..."

# Set environment variables for local development
export DATABASE_URL="file:./prisma/dev.db"
export NODE_ENV="development"
export JWT_SECRET="local-dev-jwt-secret-key-minimum-32-characters-long"
export ENCRYPTION_KEY="local-dev-encryption-key-minimum-32-chars"

# Verify environment is set
echo "✅ Database URL: $DATABASE_URL"
echo "✅ Environment: $NODE_ENV"

# Start the development server
echo "🌐 Starting Next.js development server..."
npm run dev
