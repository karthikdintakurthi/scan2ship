# QA to Local PostgreSQL Database Migration Guide

## 🎯 Overview

This guide will help you migrate all data from your QA PostgreSQL database to your local PostgreSQL database, giving you a complete local copy for development.

## 📋 Prerequisites

- ✅ `psql` command-line tool installed
- ✅ Access to QA database (`QA_DATABASE_URL`)
- ✅ Access to local database (`LOCAL_DATABASE_URL`)
- ✅ Both databases are accessible from your machine

## 🚀 Quick Migration

### Step 1: Run the Migration Script

```bash
# Execute the migration script
./migrate-qa-to-local.sh
```

This script will:
- ✅ Test both database connections
- ✅ Create backups of existing data
- ✅ Export schema and data from QA
- ✅ Import everything to local database
- ✅ Verify the migration was successful

### Step 2: Start Development with Local Database

```bash
# Start the application with local PostgreSQL database
./start-local-postgres.sh
```

## 🔧 Manual Migration (Alternative)

If you prefer to run commands manually:

### 1. Test Connections

```bash
# Test QA database
psql "$QA_DATABASE_URL" -c "SELECT version();"

# Test local database  
psql "$LOCAL_DATABASE_URL" -c "SELECT version();"
```

### 2. Export from QA Database

```bash
# Export complete schema and data
pg_dump "$QA_DATABASE_URL" --no-owner --no-privileges > qa_complete_backup.sql

# Or export schema and data separately
pg_dump "$QA_DATABASE_URL" --schema-only --no-owner --no-privileges > qa_schema.sql
pg_dump "$QA_DATABASE_URL" --data-only --no-owner --no-privileges > qa_data.sql
```

### 3. Import to Local Database

```bash
# Import schema first
psql "$LOCAL_DATABASE_URL" < qa_schema.sql

# Then import data
psql "$LOCAL_DATABASE_URL" < qa_data.sql
```

## 📊 What Gets Migrated

The migration includes:
- ✅ **Database Schema**: All tables, indexes, constraints
- ✅ **Data**: All records from every table
- ✅ **Relationships**: Foreign keys and references
- ✅ **Sequences**: Auto-incrementing IDs

## 🗂️ Backup and Safety

- **Automatic Backups**: The script creates timestamped backup directories
- **Local Database Backup**: Existing local data is backed up before migration
- **Rollback**: You can restore from backups if needed

## 🔍 Verification

After migration, the script verifies:
- ✅ Table counts match between QA and local
- ✅ Schema structure is identical
- ✅ Data records are transferred correctly

## 🚨 Important Notes

1. **Data Overwrite**: The local database will be completely replaced with QA data
2. **Connection Requirements**: Both databases must be accessible during migration
3. **Large Datasets**: Migration time depends on data volume
4. **Network Stability**: Ensure stable connection during migration

## 🛠️ Troubleshooting

### Connection Issues
```bash
# Check if databases are reachable
ping $(echo $QA_DATABASE_URL | sed 's/.*@\([^:]*\).*/\1/')
ping $(echo $LOCAL_DATABASE_URL | sed 's/.*@\([^:]*\).*/\1/')
```

### Permission Issues
```bash
# Check database permissions
psql "$QA_DATABASE_URL" -c "\du"
psql "$LOCAL_DATABASE_URL" -c "\du"
```

### Schema Conflicts
```bash
# Check existing tables in local database
psql "$LOCAL_DATABASE_URL" -c "\dt"
```

## 📝 Post-Migration Steps

1. **Update Environment**: Ensure `DATABASE_URL` points to local database
2. **Test Application**: Verify all features work with local data
3. **Update Prisma**: Run `npx prisma generate` if schema changed
4. **Start Development**: Use `./start-local-postgres.sh` for development

## 🔄 Switching Between Databases

### For Local Development
```bash
export DATABASE_URL="$LOCAL_DATABASE_URL"
./start-local-postgres.sh
```

### For Production/QA Testing
```bash
export DATABASE_URL="$QA_DATABASE_URL"
npm run dev
```

## 📁 File Structure After Migration

```
scan2ship/
├── migrate-qa-to-local.sh          # Migration script
├── start-local-postgres.sh         # Local PostgreSQL startup
├── migration_backup_YYYYMMDD_HHMMSS/  # Backup directory
│   ├── qa_schema.sql              # QA database schema
│   ├── qa_[table]_data.sql        # Data for each table
│   └── local_table_count.txt      # Local database backup info
└── .env.local                     # Environment configuration
```

## 🎉 Success Indicators

Migration is successful when:
- ✅ No error messages during migration
- ✅ Table counts match between QA and local
- ✅ Application starts without database errors
- ✅ All features work with local data

## 🆘 Need Help?

If you encounter issues:
1. Check the backup directory for error logs
2. Verify database connections manually
3. Ensure sufficient permissions on both databases
4. Check network connectivity to both database servers

Happy migrating! 🚀
