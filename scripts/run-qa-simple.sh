#!/bin/bash

echo "🚀 Starting Scan2Ship with QA Environment..."

# Set the port for QA environment
export PORT=3001

# Set NODE_ENV to development for local QA testing
export NODE_ENV="development"

echo "📋 Environment Configuration:"
echo "   - NODE_ENV: $NODE_ENV"
echo "   - PORT: $PORT"
echo "   - Using .env.qa file for database and API keys"
echo ""

echo "🌐 Starting Next.js development server on port $PORT..."
echo "📱 Access your QA environment at: http://localhost:$PORT"
echo ""

# Run the application with QA environment
# The .env.qa file will be automatically loaded by Next.js
npm run dev -- -p $PORT
