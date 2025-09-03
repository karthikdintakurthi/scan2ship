#!/bin/bash

echo "🚀 Starting Scan2Ship with QA Environment..."

# Load QA environment variables safely
set -a
source .env.qa
set +a

# Set NODE_ENV to development for local QA testing
export NODE_ENV="development"

# Set the port for QA environment
export PORT=3001

echo "📋 Environment loaded:"
echo "   - NODE_ENV: $NODE_ENV"
echo "   - DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "   - PORT: $PORT"
echo "   - APP_URL: $NEXT_PUBLIC_APP_URL"

echo ""
echo "🌐 Starting Next.js development server on port $PORT..."
echo "📱 Access your QA environment at: http://localhost:$PORT"
echo ""

# Run the application with QA environment
npm run dev -- -p $PORT
