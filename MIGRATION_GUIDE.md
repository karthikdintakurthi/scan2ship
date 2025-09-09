# Database Migration Guide

## 🚨 Important: Always Backup Before Migrations

This guide shows how to safely apply database migrations without losing data.

## 📋 Migration Workflow

### 1. **Before Any Migration - Create Backup**
```bash
# Create a full database backup
node scripts/backup-database.js
```

### 2. **Safe Migration Process**
```bash
# Use the safe migration script (backup + migrate + restore)
node scripts/safe-migration.js
```

### 3. **Manual Migration (if needed)**
```bash
# Step 1: Backup
node scripts/backup-database.js

# Step 2: Apply migration
npx prisma db push --force-reset

# Step 3: Restore data
node scripts/restore-from-backup.js backups/db-backup-[timestamp]
```

## 🔧 Available Scripts

### `scripts/backup-database.js`
- Creates a complete backup of all tables
- Saves to `backups/db-backup-[timestamp]/`
- Includes summary and verification data

### `scripts/restore-from-backup.js [backup-dir]`
- Restores data from a backup directory
- Handles foreign key constraints properly
- Skips duplicates and problematic records

### `scripts/safe-migration.js`
- Complete workflow: backup → migrate → restore
- Automatically handles the entire process
- Creates verification reports

## 📁 Backup Structure

```
backups/
├── db-backup-2025-09-09T10-30-00-000Z/
│   ├── backup-summary.json
│   ├── complete-backup.json
│   ├── clients.json
│   ├── users.json
│   ├── orders.json
│   └── ... (all other tables)
```

## ⚠️ What NOT to Do

- ❌ Never run `prisma migrate reset --force` without backup
- ❌ Never run `prisma db push --force-reset` without backup
- ❌ Never delete migration files without understanding impact

## ✅ What TO Do

- ✅ Always backup before migrations
- ✅ Test migrations on local database first
- ✅ Verify data integrity after restoration
- ✅ Keep multiple backup versions
- ✅ Document any manual data fixes

## 🚨 Emergency Recovery

If data is lost:

1. **Check for recent backups:**
   ```bash
   ls -la backups/
   ```

2. **Restore from most recent backup:**
   ```bash
   node scripts/restore-from-backup.js backups/db-backup-[latest-timestamp]
   ```

3. **Verify restoration:**
   ```bash
   node scripts/check-local-data.js
   ```

## 📊 Verification Commands

```bash
# Check current data
node scripts/check-local-data.js

# Count records in specific table
npx prisma studio --port 5556
```

## 🔄 Migration Types

### Schema Changes (Safe)
- Adding new optional fields
- Adding new tables
- Modifying field types (compatible)

### Schema Changes (Requires Care)
- Removing fields
- Changing field constraints
- Renaming fields/tables

### Data Migrations
- Always backup first
- Test on copy of production data
- Have rollback plan ready

## 📝 Best Practices

1. **Always backup before any database change**
2. **Test migrations on local database first**
3. **Keep multiple backup versions**
4. **Document any manual fixes**
5. **Verify data integrity after changes**
6. **Have a rollback plan ready**

---

**Remember: It's better to have too many backups than to lose data!** 🛡️
