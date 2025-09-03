# CI/CD Pipeline for Database Migrations

This document describes the CI/CD pipeline setup for safely migrating database changes to production in the Vanitha Logistics application.

## Overview

The CI/CD pipeline ensures that database migrations are:
- ✅ Validated before execution
- ✅ Tested on staging environment first
- ✅ Backed up before production deployment
- ✅ Monitored and verifiable
- ✅ Rollback-capable in case of issues

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │───▶│    Staging      │───▶│   Production    │
│   (Local)       │    │   (Validation)  │    │   (Deployment)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### 1. GitHub Secrets Setup

Add the following secrets to your GitHub repository:

```bash
# Database URLs
STAGING_DATABASE_URL=postgresql://user:pass@host:port/db
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:port/db

# Vercel Deployment (if using Vercel)
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

### 2. Environment Setup

Create environment-specific `.env` files:

```bash
# .env.staging
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=staging

# .env.production
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production
```

### 3. GitHub Environments

Set up environments in GitHub:
- Go to Settings → Environments
- Create `staging` and `production` environments
- Add required protection rules (e.g., required reviewers)

## Workflow Details

### 1. Validation Job (`validate-migrations`)

**Triggers:** Pull requests, pushes to main/develop
**Purpose:** Validate schema and migration files

```yaml
- Validates Prisma schema
- Checks migration status
- Creates migration plan
- Runs on staging database for safety
```

### 2. Staging Testing (`test-migrations-staging`)

**Triggers:** After validation passes
**Purpose:** Test migrations on staging environment

```yaml
- Creates database backup
- Runs migrations on staging
- Verifies migration success
- Runs database tests
```

### 3. Production Deployment (`deploy-production`)

**Triggers:** Push to main branch only
**Purpose:** Deploy to production

```yaml
- Creates production backup
- Runs migrations on production
- Verifies migration success
- Deploys to Vercel
```

## Local Development Workflow

### 1. Create Migration

```bash
# Create a new migration
npx prisma migrate dev --name add_new_field

# This will:
# - Create migration files in prisma/migrations/
# - Apply migration to local database
# - Regenerate Prisma client
```

### 2. Test Locally

```bash
# Test the migration locally
npm run db:migrate

# Or use the custom script
node scripts/migrate-database.js migrate
```

### 3. Push Changes

```bash
git add .
git commit -m "feat: add new database field"
git push origin feature/new-field
```

## CI/CD Pipeline Usage

### Automatic Triggers

The pipeline automatically runs when:
- **Pull Request:** Any changes to `prisma/` folder
- **Push to Main:** Triggers production deployment
- **Manual Trigger:** Use GitHub Actions UI

### Manual Execution

1. Go to GitHub Actions tab
2. Select "Database Migration Pipeline"
3. Click "Run workflow"
4. Choose environment and options

### Environment Selection

- **Staging:** Safe testing environment
- **Production:** Live production database

## Database Migration Scripts

### Available Commands

```bash
# Migration
npm run db:migrate:staging      # Migrate staging database
npm run db:migrate:production   # Migrate production database

# Backup
npm run db:backup:staging      # Create staging backup
npm run db:backup:production   # Create production backup

# Validation
npm run db:validate:staging    # Validate staging migrations
npm run db:validate:production # Validate production migrations

# Status
npm run db:status:staging      # Check staging migration status
npm run db:status:production   # Check production migration status
```

### Direct Script Usage

```bash
# Full migration with backup and validation
node scripts/migrate-database.js migrate staging

# Create backup only
node scripts/migrate-database.js backup production

# Check migration status
node scripts/migrate-database.js status production
```

## Safety Features

### 1. Automatic Backups

- **Before Migration:** Creates timestamped backup
- **Backup Location:** `./backups/{environment}/`
- **Backup Format:** SQL dump (pg_dump) or Prisma schema

### 2. Validation Steps

- **Schema Validation:** Ensures Prisma schema is valid
- **Migration Status:** Checks current database state
- **Environment Checks:** Prevents destructive operations

### 3. Rollback Capability

- **Automatic Rollback:** On migration failure
- **Manual Rollback:** Via GitHub Actions UI
- **Backup Restoration:** Uses created backups

## Monitoring and Troubleshooting

### 1. Pipeline Status

Check GitHub Actions for:
- ✅ Job completion status
- ⚠️ Warnings or non-critical errors
- ❌ Failed migrations

### 2. Database Health Checks

```bash
# Check migration status
npx prisma migrate status

# Verify database connection
npx prisma db pull

# Check Prisma client
npx prisma generate
```

### 3. Common Issues

#### Migration Conflicts

```bash
# Reset local migrations
npx prisma migrate reset

# Regenerate from schema
npx prisma db push
```

#### Connection Issues

```bash
# Test database connection
node scripts/test-db-connection.js

# Check environment variables
echo $DATABASE_URL
```

#### Rollback Issues

```bash
# Manual rollback using backup
psql -h host -U user -d database -f backup_file.sql

# Or use Prisma reset (development only)
npx prisma migrate reset --force
```

## Best Practices

### 1. Migration Development

- **Test Locally:** Always test migrations locally first
- **Small Changes:** Keep migrations small and focused
- **Descriptive Names:** Use clear migration names
- **Documentation:** Document complex migrations

### 2. Deployment Process

- **Staging First:** Always test on staging before production
- **Review Changes:** Have team review migration changes
- **Monitor Closely:** Watch production deployment
- **Have Rollback Plan:** Know how to rollback quickly

### 3. Database Management

- **Regular Backups:** Schedule regular database backups
- **Monitor Performance:** Watch for performance impacts
- **Test Rollbacks:** Practice rollback procedures
- **Document Procedures:** Keep procedures updated

## Security Considerations

### 1. Environment Variables

- **Never Commit:** `.env` files to version control
- **Use Secrets:** Store sensitive data in GitHub secrets
- **Rotate Keys:** Regularly rotate database credentials

### 2. Access Control

- **Limited Access:** Restrict production database access
- **Audit Logs:** Monitor database access
- **Principle of Least Privilege:** Minimal required permissions

### 3. Backup Security

- **Encrypted Backups:** Encrypt sensitive backup data
- **Secure Storage:** Store backups in secure location
- **Access Control:** Limit backup access

## Support and Maintenance

### 1. Regular Maintenance

- **Update Dependencies:** Keep Prisma and tools updated
- **Review Workflows:** Periodically review CI/CD workflows
- **Test Procedures:** Test backup and rollback procedures

### 2. Team Training

- **Migration Process:** Train team on migration process
- **Emergency Procedures:** Document emergency procedures
- **Regular Reviews:** Schedule regular process reviews

### 3. Documentation Updates

- **Keep Current:** Update documentation with changes
- **Process Changes:** Document any process modifications
- **Lessons Learned:** Document issues and solutions

## Troubleshooting Guide

### Pipeline Won't Start

1. Check file paths in workflow trigger
2. Verify branch names match
3. Ensure GitHub Actions are enabled

### Migration Fails

1. Check database connection
2. Verify schema validity
3. Check for migration conflicts
4. Review error logs

### Rollback Issues

1. Verify backup file exists
2. Check database permissions
3. Ensure rollback script compatibility

### Performance Issues

1. Monitor migration duration
2. Check database performance
3. Consider running during low-traffic periods

## Contact and Support

For issues with the CI/CD pipeline:

1. Check GitHub Actions logs
2. Review this documentation
3. Check database migration scripts
4. Contact development team

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Maintainer:** Development Team
