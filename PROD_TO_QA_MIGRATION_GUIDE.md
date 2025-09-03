# 🚀 Production to QA Database Migration Guide

This guide will help you migrate your production database data to your QA environment database.

## 📋 Prerequisites

- Access to your production database
- Access to your QA environment database
- PostgreSQL client tools installed (`psql`, `pg_dump`)
- Node.js and npm installed
- Your project dependencies installed (`npm install`)

## 🔧 Setup

### 1. Set Environment Variables

Set your database connection strings as environment variables:

```bash
# Production database (source)
export PROD_DATABASE_URL="postgresql://username:password@host:port/production_db"

# QA database (destination)
export QA_DATABASE_URL="postgresql://username:password@host:port/qa_db"
```

### 2. Verify Database Access

Test your database connections:

```bash
# Test production database
psql "$PROD_DATABASE_URL" -c "SELECT version();"

# Test QA database
psql "$QA_DATABASE_URL" -c "SELECT version();"
```

## 🚀 Migration Methods

### Method 1: Using pg_dump (Recommended for large datasets)

This method uses PostgreSQL's native `pg_dump` and `psql` tools:

```bash
npm run migrate:prod-to-qa
```

**What it does:**
- Exports each table individually from production
- Creates timestamped backup files
- Imports data to QA database
- Handles dependencies between tables

**Advantages:**
- Fast for large datasets
- Native PostgreSQL tools
- Creates backup files for safety

### Method 2: Using Prisma (Recommended for complex data structures)

This method uses Prisma for more reliable data handling:

```bash
npm run migrate:prod-to-qa-prisma
```

**What it does:**
- Reads data using Prisma client
- Handles complex data types better
- More reliable for JSON fields and relationships
- Generates new IDs for records

**Advantages:**
- Better handling of complex data types
- More reliable for JSON and relationship fields
- Handles schema differences better

## 📊 Tables Being Migrated

The migration scripts will migrate these tables in dependency order:

1. **clients** - Client information
2. **users** - User accounts
3. **client_config** - Client configuration
4. **client_credit_costs** - Credit pricing
5. **client_credits** - Credit balances
6. **client_order_configs** - Order settings
7. **pickup_locations** - Pickup location data
8. **orders** - Order records
9. **order_items** - Order line items
10. **transactions** - Transaction records
11. **credit_transactions** - Credit usage logs
12. **analytics_events** - Analytics data

## ⚠️ Important Notes

### Data Safety
- **Backup your QA database first** if it contains important data
- The migration will **overwrite** existing data in QA
- Production data remains **unchanged**

### ID Handling
- **Method 1 (pg_dump)**: Preserves original IDs
- **Method 2 (Prisma)**: Generates new IDs for better isolation

### Dependencies
- Tables are migrated in dependency order
- Foreign key constraints are handled automatically
- If a table fails, subsequent tables may also fail

## 🔍 Troubleshooting

### Common Issues

#### 1. Connection Errors
```bash
# Check if databases are accessible
psql "$PROD_DATABASE_URL" -c "SELECT 1;"
psql "$QA_DATABASE_URL" -c "SELECT 1;"
```

#### 2. Permission Errors
```bash
# Ensure your user has proper permissions
# For production: SELECT permissions on all tables
# For QA: INSERT, UPDATE, DELETE permissions on all tables
```

#### 3. Schema Mismatches
```bash
# Update QA database schema first
npm run db:push

# Then run migration
npm run migrate:prod-to-qa
```

#### 4. Large Dataset Issues
```bash
# For very large datasets, consider using pg_dump with compression
pg_dump "$PROD_DATABASE_URL" | gzip > backup.sql.gz
gunzip -c backup.sql.gz | psql "$QA_DATABASE_URL"
```

### Manual Migration Steps

If automated migration fails, you can migrate manually:

```bash
# 1. Export specific table
pg_dump "$PROD_DATABASE_URL" --table=clients --data-only > clients.sql

# 2. Import to QA
psql "$QA_DATABASE_URL" < clients.sql

# 3. Repeat for other tables
```

## 🧪 Testing Migration

After migration, verify data integrity:

```bash
# 1. Check record counts
psql "$QA_DATABASE_URL" -c "SELECT COUNT(*) FROM clients;"
psql "$QA_DATABASE_URL" -c "SELECT COUNT(*) FROM orders;"

# 2. Compare with production
psql "$PROD_DATABASE_URL" -c "SELECT COUNT(*) FROM clients;"
psql "$PROD_DATABASE_URL" -c "SELECT COUNT(*) FROM orders;"

# 3. Test application functionality
npm run dev
# Navigate to your app and test key features
```

## 🔄 Rollback Plan

If migration causes issues:

```bash
# 1. Restore QA database from backup
psql "$QA_DATABASE_URL" < qa_backup.sql

# 2. Or reset QA database completely
npm run db:reset
npm run db:seed
```

## 📝 Migration Log

Keep track of your migration:

- **Date and time** of migration
- **Method used** (pg_dump or Prisma)
- **Tables migrated** successfully
- **Issues encountered** and resolutions
- **Data verification** results

## 🆘 Getting Help

If you encounter issues:

1. Check the error messages in the console
2. Verify database connections and permissions
3. Check if all required tables exist in both databases
4. Ensure schema compatibility between environments
5. Review the troubleshooting section above

## 🎯 Next Steps

After successful migration:

1. ✅ **Test your application** thoroughly
2. ✅ **Verify data integrity** across all tables
3. ✅ **Test key workflows** (orders, payments, etc.)
4. ✅ **Update any environment-specific configurations**
5. ✅ **Document any differences** between prod and QA

---

**Remember**: Always backup your QA database before migration, and test thoroughly after migration!
