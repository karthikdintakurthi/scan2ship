# Deploy OTP Sessions Table to Production

## Safety Check ✅
This migration is **100% SAFE** - it only creates a new table and will NOT affect any existing data.

## What This Migration Does
- Creates a new `otp_sessions` table
- Adds indexes for performance
- No existing tables or data are modified

## Deployment Steps

### Option 1: Using Prisma Migrate (Recommended)
```bash
# Make sure DATABASE_URL points to production
export DATABASE_URL="your_production_database_url"

# Deploy the migration
npx prisma migrate deploy
```

### Option 2: Direct SQL Execution
If you prefer to run SQL directly:

```bash
# Using psql
psql $DATABASE_URL -f prisma/migrations/20250124000000_add_otp_sessions/migration.sql

# Or copy the SQL from the migration file and run it in your database client
```

### Option 3: Using the API Endpoint (Development Only)
If you're testing, you can use the setup endpoint:
```bash
curl -X POST http://localhost:3000/api/setup/create-otp-table
```

## Verification
After running the migration, verify the table was created:

```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'otp_sessions';
```

## Rollback (If Needed)
If you need to rollback (though not necessary since it's just adding a table):

```sql
DROP TABLE IF EXISTS "otp_sessions";
```

## Notes
- This migration is idempotent (safe to run multiple times)
- Uses `IF NOT EXISTS` to prevent errors if table already exists
- No data loss risk - only adds new table
