#!/bin/bash

# Deploy scan2ship to QA environment
echo "🚀 Deploying scan2ship to QA environment..."

# Set environment variables for QA
export NODE_ENV=development
export VERCEL_ENV=preview

# Try to deploy with different SSL settings
export NODE_OPTIONS="--openssl-legacy-provider"

# Deploy to preview (QA) environment
echo "📦 Starting deployment..."
vercel deploy --target=preview \
  --env NODE_ENV=development \
  --meta environment=qa \
  --meta branch=qa-env \
  --meta version=$(git rev-parse --short HEAD) \
  --yes

echo "✅ Deployment initiated!"
echo "🔗 Check your Vercel dashboard for the QA deployment URL"
