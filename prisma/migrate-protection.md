# Database Migration Protection Guidelines

> **⚠️ Read this first — reviewed 2026-08-08**
>
> This document previously instructed you to run `./scripts/backup-db.sh` and `./scripts/safe-migrate.sh`. **Neither file exists.** `scripts/` is listed in `.gitignore:83`, so the directory is not version-controlled and contains only whatever happens to be on your machine.
>
> **Consequence: `npm run db:backup` and `npm run db:migrate:safe` fail.** Because `db:migrate:dev` and `db:migrate:deploy` are defined as `npm run db:backup && prisma migrate ...`, the backup step fails first and the migration does not run — so those commands are currently broken rather than dangerous. Do not assume a backup was taken.
>
> Until `scripts/` is version-controlled, **take backups manually** using the commands in "Taking a backup" below.

## 🚨 CRITICAL RULES

### NEVER RUN THESE COMMANDS WITHOUT EXPLICIT PERMISSION:
- `npx prisma migrate reset --force`
- `npx prisma migrate reset` — also exposed as `npm run db:reset`. This **drops and recreates the database** against whatever `DATABASE_URL` is in the ambient environment. A `.env.local` on disk makes it easy to point this at the wrong database.
- `npx prisma db push --force-reset`
- `DROP DATABASE` commands
- Any command that drops/recreates entire tables

Also treat as destructive, because they move production data:
- `npm run db:copy-prod` — copies production data (customer PII) onto a local machine
- `npm run migrate:prod-to-qa*` — four near-identical variants; none of their script files exist
- `npm run db:add-a5-to-prod` — a one-off column change aimed at production

### SAFE MIGRATION COMMANDS:
- `npx prisma migrate dev` — safe incremental migrations (development)
- `npx prisma migrate deploy` — production deployments
- `npx prisma db push` — development schema updates
- `npx prisma migrate status` — check migration status

Call these directly. The `npm run db:migrate:*` wrappers are broken (see banner).

## 🛡️ PROTECTION STRATEGIES

### 1. Taking a backup

Two scripts exist on disk but are **not tracked in git**, so they may not be present in a fresh clone:

```bash
./scripts/backup-prod-db.sh              # backup only
./scripts/deploy-migration-with-backup.sh # backup + migrate deploy + status
```

If they are absent, back up manually:

```bash
# Writes a full dump; adjust the path as needed
pg_dump "$DATABASE_URL" > "backups/prod_backup_$(date +%Y%m%d_%H%M%S).sql"
```

Verify the dump is non-empty and ends with a completion marker before proceeding:

```bash
tail -c 200 backups/prod_backup_<timestamp>.sql
```

> Backups in `backups/` are gitignored, unencrypted, and contain multi-tenant customer PII. Move them to encrypted storage and delete local copies when done.

### 2. Test on a copy first

```bash
createdb vanitha-logistics-test
psql -d vanitha-logistics-test -f backups/prod_backup_<timestamp>.sql
# point DATABASE_URL at the copy, run the migration, verify, then apply to production
```

### 3. Check for drift before migrating

`next.config.ts` disables TypeScript checking at build time, so a mismatch between `schema.prisma` and the code will not fail the build. Verify explicitly:

```bash
npx prisma migrate status
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL"
```

### 4. Environment-specific rules
- **Development**: `npx prisma migrate dev`
- **Staging**: `npx prisma migrate deploy` with a backup
- **Production**: `npx prisma migrate deploy` with a full backup + rollback plan

## 📋 MIGRATION CHECKLIST

Before any migration:
- [ ] Full database backup taken **and verified non-empty**
- [ ] Migration tested on a copy of production data
- [ ] Migration SQL reviewed for destructive operations (`DROP`, `ALTER ... TYPE`, `NOT NULL` on an existing column)
- [ ] Explicit permission obtained for any destructive change
- [ ] Rollback plan ready
- [ ] Change documented

Note when reviewing SQL: 30 of the 34 existing foreign keys are `ON DELETE CASCADE`. Deleting a single `clients` row cascades to that tenant's entire order history **and** its credit ledger.

## 🔄 ROLLBACK PROCEDURES

If migration fails:
1. Stop the application
2. Restore from backup: `psql "$DATABASE_URL" -f backups/prod_backup_<timestamp>.sql`
3. Fix the migration issue
4. Test again on a copy
5. Re-apply when ready

## 🔧 Making this document true again

The guidance above is a workaround. The real fix:

1. Remove `scripts/` from `.gitignore:83` and commit the scripts that exist.
2. Restore or delete `scripts/backup-db.sh` and `scripts/safe-migrate.sh`, and the ~20 other `package.json` scripts that point at missing files.
3. Guard `db:reset` behind an explicit environment check so it cannot run against production.
