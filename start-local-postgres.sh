#!/bin/bash

# Start Scan2Ship with Local PostgreSQL Database
echo "🚀 Starting Scan2Ship with Local PostgreSQL Database..."

# Source environment variables
if [ -f .env.local ]; then
    echo "📁 Loading environment variables from .env.local..."
    source .env.local
else
    echo "❌ .env.local file not found!"
    exit 1
fi

# Check if LOCAL_DATABASE_URL is set
if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo "❌ LOCAL_DATABASE_URL not found in .env.local"
    exit 1
fi

# Set environment variables for local development
export DATABASE_URL="$LOCAL_DATABASE_URL"
export NODE_ENV="development"

# Verify environment is set
echo "✅ Database URL: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo "✅ Environment: $NODE_ENV"

# Test database connection
echo "🔍 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your LOCAL_DATABASE_URL"
    exit 1
fi

# Start the development server
echo "🌐 Starting Next.js development server..."
npm run dev
