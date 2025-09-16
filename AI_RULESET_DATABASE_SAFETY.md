# AI Assistant Database Safety Ruleset - Scan2Ship Project

## 🚨 CRITICAL RULES - NEVER VIOLATE

### FORBIDDEN COMMANDS (Require Explicit User Permission):
- ❌ `npx prisma migrate reset --force`
- ❌ `npx prisma migrate reset`
- ❌ `npx prisma db push --force-reset`
- ❌ Any `DROP DATABASE` commands
- ❌ Any commands that drop/recreate entire tables
- ❌ Any destructive database operations without explicit permission

### SAFE COMMANDS (Use These Instead):
- ✅ `npm run db:migrate:dev` - Safe development migrations
- ✅ `npm run db:migrate:deploy` - Safe production deployments
- ✅ `npm run db:backup` - Create manual backup
- ✅ `npm run db:status` - Check migration status
- ✅ `npm run db:studio` - Open Prisma Studio

## 🛡️ MANDATORY WORKFLOW

### Before ANY Database Operation:
1. **ALWAYS** run `npm run db:backup` first
2. **ALWAYS** check `npm run db:status` to understand current state
3. **NEVER** run destructive commands without explicit user permission
4. **ALWAYS** explain what will happen before proceeding

### For Schema Changes:
1. Use `npm run db:migrate:dev` for development
2. Use `npm run db:migrate:deploy` for production
3. **NEVER** use direct Prisma commands
4. **ALWAYS** create backup before changes

### For Data Operations:
1. **ALWAYS** backup before any data changes
2. **ALWAYS** verify data integrity after changes
3. **NEVER** assume data is safe without backup

## 📋 SAFETY CHECKLIST

Before any database operation, I must:
- [ ] Create backup using `npm run db:backup`
- [ ] Check current status using `npm run db:status`
- [ ] Explain what will happen to the user
- [ ] Get explicit permission for any destructive operations
- [ ] Use only safe commands from the approved list
- [ ] Verify data integrity after changes

## 🚨 EMERGENCY PROCEDURES

If I accidentally run a destructive command:
1. **STOP** immediately
2. **INFORM** the user of what happened
3. **RESTORE** from backup if available
4. **DOCUMENT** the incident
5. **LEARN** from the mistake

## ✅ COMPLIANCE

This ruleset is MANDATORY for:
- All database operations in this project
- Any migration or schema changes
- Any data manipulation
- Any Prisma-related commands

**Remember: Data safety is paramount. When in doubt, ask the user for explicit permission.**
