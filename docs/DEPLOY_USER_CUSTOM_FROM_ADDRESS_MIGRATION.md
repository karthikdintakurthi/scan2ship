# Deploy user_custom_from_address migration (with backup)

> **Note (reviewed 2026-08-08):** the content below is accurate — migration `20260123120000_add_user_custom_from_address` exists and its columns match `prisma/schema.prisma:448-459`. However, **`scripts/` is gitignored** (`.gitignore:83`), so `scripts/deploy-migration-with-backup.sh` and `scripts/backup-prod-db.sh` are not in version control. They exist on machines where they were created; in a fresh clone they will be missing. If so, use the manual `pg_dump` commands in `prisma/migrate-protection.md`.

This migration **only adds** a new table `user_custom_from_address`. It does **not** alter or drop any existing tables, so there is no risk of data loss to current data. A full backup is still required before any production deploy.

## Option A: One command (backup + migrate)

From the repo root, with production `DATABASE_URL` set (e.g. in `.env.production` or exported):

```bash
./scripts/deploy-migration-with-backup.sh
```

This will:

1. Ask for confirmation if `DATABASE_URL` looks like production.
2. Run a **full backup** (pg_dump) into `backups/prod_backup_YYYYMMDD_HHMMSS.sql`.
3. Run **prisma migrate deploy** (applies pending migrations).
4. Run **prisma migrate status** to verify.

If the migration step fails, the database is unchanged and you can restore from the backup if needed.

## Option B: Manual steps

1. **Backup only** (deep clone of prod):

   ```bash
   # Set prod DATABASE_URL, e.g.:
   # export DATABASE_URL="postgresql://..."
   # or create .env.production with DATABASE_URL
   ./scripts/backup-prod-db.sh
   ```

   Backups are written to `backups/prod_backup_<timestamp>.sql`.

2. **Run migration**:

   ```bash
   npx prisma migrate deploy
   ```

3. **Verify**:

   ```bash
   npx prisma migrate status
   ```

## Restore (only if something goes wrong)

```bash
psql "$DATABASE_URL" -f backups/prod_backup_YYYYMMDD_HHMMSS.sql
```

Use the backup file from the run you want to restore to.

## Migration content

- Creates table `user_custom_from_address` (id, userId, overwriteFromAddress, courierServiceCode, customAddress, createdAt, updatedAt).
- No existing tables or data are modified.
