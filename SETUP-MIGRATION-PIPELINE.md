# Quick Setup Guide: Database Migration CI/CD Pipeline

This guide will help you set up the database migration CI/CD pipeline for Vanitha Logistics in under 10 minutes.

## 🚀 Quick Start

### 1. Test Current Setup
```bash
npm run test:migration-setup
```

This will verify that all required files and configurations are in place.

### 2. Set Up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, then add:

**Required Secrets:**
- `STAGING_DATABASE_URL` - Your staging PostgreSQL connection string
- `PRODUCTION_DATABASE_URL` - Your production PostgreSQL connection string

**Optional (for Vercel deployment):**
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### 3. Create Environment Files

Create `.env.staging` and `.env.production` files:

```bash
# .env.staging
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=staging

# .env.production  
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production
```

### 4. Test Local Migration

```bash
# Test staging migration
npm run db:migrate:staging

# Test production migration (be careful!)
npm run db:migrate:production
```

## 🔧 How It Works

### Pipeline Flow
1. **Pull Request** → Triggers validation on staging
2. **Merge to Main** → Automatically deploys to production
3. **Manual Trigger** → Run migrations on demand

### Safety Features
- ✅ Automatic backups before migration
- ✅ Staging validation first
- ✅ Rollback capability
- ✅ Environment protection rules

## 📋 Available Commands

```bash
# Migration
npm run db:migrate:staging      # Safe staging migration
npm run db:migrate:production   # Production migration

# Backup
npm run db:backup:staging      # Create staging backup
npm run db:backup:production   # Create production backup

# Validation
npm run db:validate:staging    # Validate staging
npm run db:validate:production # Validate production

# Status
npm run db:status:staging      # Check staging status
npm run db:status:production   # Check production status

# Testing
npm run test:migration-setup   # Test pipeline setup
```

## 🚨 Important Notes

### Before First Production Migration
1. **Test on staging first** - Always validate on staging
2. **Have a rollback plan** - Know how to quickly revert
3. **Monitor closely** - Watch the first few migrations
4. **Backup strategy** - Ensure backups are working

### Environment Variables
- Never commit `.env` files
- Use GitHub secrets for sensitive data
- Test environment variables locally first

## 🆘 Troubleshooting

### Common Issues

**Pipeline won't start:**
- Check file paths in workflow trigger
- Verify branch names match
- Ensure GitHub Actions are enabled

**Migration fails:**
- Check database connection
- Verify schema validity
- Check for migration conflicts

**Rollback issues:**
- Verify backup file exists
- Check database permissions
- Ensure rollback script compatibility

### Get Help
1. Check GitHub Actions logs
2. Review `docs/CI-CD-PIPELINE.md`
3. Run `npm run test:migration-setup`
4. Check database connection scripts

## 🎯 Next Steps

1. **Test the pipeline** with a small schema change
2. **Set up monitoring** for production migrations
3. **Train your team** on the migration process
4. **Document procedures** for your specific use cases

## 📚 Full Documentation

For detailed information, see:
- `docs/CI-CD-PIPELINE.md` - Complete pipeline documentation
- `.github/workflows/database-migration.yml` - Workflow configuration
- `scripts/migrate-database.js` - Migration script details

---

**Need help?** Check the troubleshooting section or review the full documentation.
