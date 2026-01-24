# Deploy OTP Sessions Table Migration to Production

## Migration File
- **Location:** `prisma/migrations/20250124000000_add_otp_sessions/migration.sql`
- **Safety:** ✅ 100% SAFE - Only creates new table, no data loss risk

## What This Migration Does
- Creates `otp_sessions` table for storing OTP verification sessions
- Adds indexes for performance
- **NO modifications to existing tables**
- **NO data loss risk**

## Deployment Steps

### Option 1: Using Prisma Migrate Deploy (Recommended)
```bash
# Make sure DATABASE_URL points to production
export DATABASE_URL="your_production_database_url"

# Deploy only new migrations (safe for production)
npx prisma migrate deploy
```

This command:
- ✅ Only runs migrations that haven't been applied
- ✅ Safe for production (doesn't reset database)
- ✅ Won't affect existing data
- ✅ Can be run multiple times safely

### Option 2: Manual SQL Execution
If you prefer to run SQL directly:

```bash
# Using psql
psql $DATABASE_URL -f prisma/migrations/20250124000000_add_otp_sessions/migration.sql
```

Or copy the SQL from the migration file and run it in your database client.

## Verification

After deployment, verify the table exists:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'otp_sessions';
```

Check the migration was applied:
```bash
npx prisma migrate status
```

## Rollback (If Needed)

If you need to rollback (though not necessary since it's just adding a table):
```sql
DROP TABLE IF EXISTS "otp_sessions";
```

## Notes
- This migration is idempotent (safe to run multiple times)
- Uses standard Prisma migration format
- Will be tracked in `_prisma_migrations` table
- No impact on existing data or tables
