# 🔧 Post-Migration Troubleshooting Guide

This guide addresses common issues that occur after migrating data from production to QA environments.

## 🚨 Common Issues & Solutions

### 1. Unique Constraint Failed on ID Fields

**Error Message:**
```
Unique constraint failed on the fields: (`id`)
Error [PrismaClientKnownRequestError]: Invalid `prisma.orders.create()` invocation
```

**Root Cause:**
When migrating data with SERIAL (auto-increment) columns, the database sequences are not automatically updated to account for existing IDs. This causes conflicts when trying to create new records.

**Solution:**
Run the sequence fixing script:
```bash
npm run fix:sequences
```

**What it does:**
- Identifies tables with SERIAL columns
- Finds the maximum existing ID value
- Updates the sequence to start from the next available ID
- Prevents future ID conflicts

### 2. Foreign Key Constraint Violations

**Error Message:**
```
Foreign key constraint failed on the field: `clientId`
```

**Root Cause:**
Data migration order doesn't respect foreign key dependencies, or some referenced records are missing.

**Solution:**
Ensure proper migration order and verify all referenced records exist:
```bash
# Check if referenced clients exist
psql "$QA_DATABASE_URL" -c "SELECT COUNT(*) FROM clients;"

# Check if referenced users exist  
psql "$QA_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

### 3. Data Type Mismatches

**Error Message:**
```
Invalid input syntax for type timestamp
```

**Root Cause:**
Date/time formats from production don't match QA environment expectations.

**Solution:**
Check and standardize date formats in the migration script, or update the QA database schema to match production.

### 4. Missing Tables or Columns

**Error Message:**
```
relation "table_name" does not exist
```

**Root Cause:**
Schema differences between production and QA environments.

**Solution:**
1. Update QA database schema: `npm run db:push`
2. Re-run migration: `npm run migrate:prod-to-qa-corrected`

## 🔍 Verification Steps

After migration and fixing sequences, verify everything works:

### 1. Check Record Counts
```bash
# Compare production vs QA record counts
psql "$PROD_DATABASE_URL" -c "SELECT COUNT(*) FROM orders;"
psql "$QA_DATABASE_URL" -c "SELECT COUNT(*) FROM orders;"
```

### 2. Test Sequence Generation
```bash
# Verify sequences work correctly
psql "$QA_DATABASE_URL" -c "SELECT nextval('orders_id_seq');"
```

### 3. Test Application Functionality
- Try creating a new order
- Test user authentication
- Verify all workflows function correctly

## 🛠️ Available Scripts

### Migration Scripts
- **`npm run migrate:prod-to-qa-corrected`** - ✅ **Recommended migration method**
- `npm run migrate:prod-to-qa` - Uses pg_dump (version compatibility issues)
- `npm run migrate:prod-to-qa-prisma` - Uses Prisma (data type issues)
- `npm run migrate:prod-to-qa-direct` - Uses direct SQL (ID field issues)

### Maintenance Scripts
- **`npm run fix:sequences`** - Fixes auto-increment sequence conflicts
- `npm run db:push` - Updates database schema
- `npm run db:studio` - Opens Prisma Studio for database inspection

## 📋 Pre-Migration Checklist

Before running migration:
- [ ] Backup QA database
- [ ] Verify database connections
- [ ] Check schema compatibility
- [ ] Ensure sufficient disk space
- [ ] Plan maintenance window

## 📋 Post-Migration Checklist

After migration:
- [ ] Verify all tables migrated successfully
- [ ] Check record counts match production
- [ ] Run sequence fixing script
- [ ] Test application functionality
- [ ] Verify all workflows work correctly
- [ ] Document any differences or issues

## 🚨 Emergency Rollback

If migration causes critical issues:

```bash
# Option 1: Restore from backup
psql "$QA_DATABASE_URL" < qa_backup.sql

# Option 2: Reset completely
npm run db:reset
npm run db:seed
```

## 🔧 Manual Sequence Fix

If the automated script fails, fix manually:

```sql
-- For orders table
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders), true);

-- Verify
SELECT nextval('orders_id_seq');
```

## 📞 Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review migration logs for specific error messages
3. Verify database connections and permissions
4. Check if all required tables exist
5. Ensure schema compatibility between environments

## 🎯 Best Practices

1. **Always backup** before migration
2. **Test migration** on a copy first
3. **Run sequence fixes** after every migration
4. **Verify data integrity** thoroughly
5. **Test application functionality** before considering migration complete

---

**Remember**: The sequence fixing script (`npm run fix:sequences`) is essential after every data migration to prevent ID conflicts! 🔧
