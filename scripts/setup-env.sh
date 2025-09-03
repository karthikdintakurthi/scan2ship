#!/bin/bash

# Environment Setup Script for Vanitha Logistics CI/CD Pipeline
# This script helps set up the required environment variables for testing

echo "🚀 Setting up environment for Vanitha Logistics CI/CD Pipeline"
echo "================================================================"

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
    source .env
else
    echo "⚠️  .env file not found, creating from template..."
    if [ -f "env-template.env" ]; then
        cp env-template.env .env
        echo "✅ .env file created from template"
        echo "⚠️  Please update .env with your actual database credentials"
    else
        echo "❌ env-template.env not found"
        exit 1
    fi
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env file"
    echo "Please add your database connection string to .env file:"
    echo "DATABASE_URL=\"postgresql://user:pass@host:port/db\""
    exit 1
else
    echo "✅ DATABASE_URL is set"
fi

# Create staging and production env files if they don't exist
if [ ! -f ".env.staging" ]; then
    echo "📝 Creating .env.staging file..."
    cat > .env.staging << EOF
# Staging Environment Configuration
DATABASE_URL="${DATABASE_URL}"
NODE_ENV=staging
EOF
    echo "✅ .env.staging created"
fi

if [ ! -f ".env.production" ]; then
    echo "📝 Creating .env.production file..."
    cat > .env.production << EOF
# Production Environment Configuration
DATABASE_URL="${DATABASE_URL}"
NODE_ENV=production
EOF
    echo "✅ .env.production created"
fi

# Test Prisma connection
echo "🔍 Testing Prisma connection..."
if npx prisma validate > /dev/null 2>&1; then
    echo "✅ Prisma connection successful"
else
    echo "❌ Prisma connection failed"
    echo "Please check your DATABASE_URL and ensure the database is accessible"
    exit 1
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env files with your actual database credentials"
echo "2. Set up GitHub secrets for staging and production"
echo "3. Test the migration pipeline: npm run test:migration-setup"
echo ""
echo "Available commands:"
echo "  npm run test:migration-setup    # Test pipeline setup"
echo "  npm run db:migrate:staging      # Test staging migration"
echo "  npm run db:backup:staging       # Create staging backup"
echo ""
