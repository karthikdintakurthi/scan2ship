# Database Migration Protection Guidelines

## 🚨 CRITICAL RULES

### NEVER RUN THESE COMMANDS WITHOUT EXPLICIT PERMISSION:
- `npx prisma migrate reset --force`
- `npx prisma migrate reset`
- `npx prisma db push --force-reset`
- `DROP DATABASE` commands
- Any command that drops/recreates entire tables

### SAFE MIGRATION COMMANDS:
- `npx prisma migrate dev` - Safe incremental migrations
- `npx prisma migrate deploy` - Production deployments
- `npx prisma db push` - Development schema updates
- `npx prisma migrate status` - Check migration status

## 🛡️ PROTECTION STRATEGIES

### 1. Always Create Backups
```bash
# Before any migration
./scripts/backup-db.sh
```

### 2. Use Safe Migration Script
```bash
# Instead of direct prisma commands
./scripts/safe-migrate.sh
```

### 3. Test on Copy First
```bash
# Create test database
createdb vanitha-logistics-test
# Test migration on copy
# Only apply to production after verification
```

### 4. Environment-Specific Rules
- **Development**: Use `npx prisma migrate dev`
- **Staging**: Use `npx prisma migrate deploy` with backup
- **Production**: Use `npx prisma migrate deploy` with full backup + rollback plan

## 📋 MIGRATION CHECKLIST

Before any migration:
- [ ] Create full database backup
- [ ] Test migration on copy of production data
- [ ] Review migration SQL for destructive operations
- [ ] Get explicit user permission for any destructive changes
- [ ] Have rollback plan ready
- [ ] Document what will change

## 🔄 ROLLBACK PROCEDURES

If migration fails:
1. Stop the application
2. Restore from backup: `psql -d vanitha-logistics < backup.sql`
3. Fix the migration issue
4. Test again on copy
5. Re-apply when ready
