# Database Protection Policy

## 🚨 CRITICAL RULES - NEVER VIOLATE

### FORBIDDEN COMMANDS (Require Explicit Permission):
- `npx prisma migrate reset --force`
- `npx prisma migrate reset`
- `npx prisma db push --force-reset`
- Any `DROP DATABASE` commands
- Any commands that drop/recreate entire tables

### SAFE COMMANDS (Use These Instead):
- `npm run db:migrate:dev` - Safe development migrations
- `npm run db:migrate:deploy` - Safe production deployments
- `npm run db:backup` - Create backup before changes
- `npm run db:migrate:safe` - Interactive safe migration

## 🛡️ PROTECTION LAYERS

### 1. Automated Backups
- Every migration automatically creates a backup
- Backups stored in `./backups/` directory
- Retention policy: 30 days

### 2. Safe Migration Scripts
- All migrations go through safety checks
- User confirmation required for destructive operations
- Preview of changes before execution

### 3. Environment Protection
- Development: Use `npm run db:migrate:dev`
- Production: Use `npm run db:migrate:deploy`
- Staging: Test migrations on copy first

### 4. Rollback Procedures
- Always have rollback plan ready
- Test rollback procedures regularly
- Keep multiple backup versions

## 📋 MIGRATION WORKFLOW

### Before Any Migration:
1. Run `npm run db:backup`
2. Review migration changes
3. Test on copy of production data
4. Get explicit permission for destructive changes

### During Migration:
1. Use safe migration scripts only
2. Monitor for errors
3. Have rollback plan ready

### After Migration:
1. Verify data integrity
2. Test application functionality
3. Document changes made

## 🔄 EMERGENCY PROCEDURES

### If Migration Fails:
1. Stop application immediately
2. Restore from latest backup
3. Investigate failure cause
4. Fix issue and retry

### If Data Loss Occurs:
1. Stop all database operations
2. Restore from most recent backup
3. Assess data loss extent
4. Implement additional protections

## 📞 ESCALATION

If you encounter any issues:
1. Document the problem
2. Create backup immediately
3. Contact database administrator
4. Do not attempt risky operations

## ✅ COMPLIANCE

This policy must be followed by:
- All developers
- Database administrators
- DevOps engineers
- Any person with database access

**Remember: It's better to be safe than sorry. When in doubt, ask for help.**
