#!/bin/bash

# QA to Local Database Migration Script
# This script migrates all data from QA database to local PostgreSQL database

set -e  # Exit on any error

echo "🚀 Starting QA to Local Database Migration..."

# Source environment variables
if [ -f .env.local ]; then
    echo "📁 Loading environment variables from .env.local..."
    source .env.local
else
    echo "❌ .env.local file not found!"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$QA_DATABASE_URL" ]; then
    echo "❌ QA_DATABASE_URL not found in .env.local"
    exit 1
fi

if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo "❌ LOCAL_DATABASE_URL not found in .env.local"
    exit 1
fi

echo "✅ QA Database: $(echo $QA_DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo "✅ Local Database: $(echo $LOCAL_DATABASE_URL | sed 's/:[^:]*@/:***@/')"

# Create backup directory
BACKUP_DIR="migration_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📁 Created backup directory: $BACKUP_DIR"

# Test connections
echo "🔍 Testing database connections..."

echo "Testing QA database connection..."
psql "$QA_DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ QA database connection successful"
else
    echo "❌ QA database connection failed"
    exit 1
fi

echo "Testing local database connection..."
psql "$LOCAL_DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Local database connection successful"
else
    echo "❌ Local database connection failed"
    exit 1
fi

# Get table list from QA database
echo "📋 Getting table list from QA database..."
TABLES=$(psql "$QA_DATABASE_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE '_prisma_%';" | tr -d ' ')

echo "📊 Found tables:"
echo "$TABLES"

# Create backup of local database (if it has data)
echo "💾 Creating backup of local database..."
psql "$LOCAL_DATABASE_URL" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" > "$BACKUP_DIR/local_table_count.txt" 2>&1

# Clear local database (drop all tables)
echo "🧹 Clearing local database..."
psql "$LOCAL_DATABASE_URL" -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE '_prisma_%')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
"

echo "✅ Local database cleared"

# Export schema and data from QA database
echo "📤 Exporting schema and data from QA database..."

# Export schema using psql instead of pg_dump to avoid version issues
echo "📋 Exporting schema..."
psql "$QA_DATABASE_URL" -c "
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || quote_ident(tablename) || ' (' ||
    string_agg(
        quote_ident(columnname) || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR'
            WHEN data_type = 'integer' THEN 'INTEGER'
            WHEN data_type = 'bigint' THEN 'BIGINT'
            WHEN data_type = 'boolean' THEN 'BOOLEAN'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN data_type = 'text' THEN 'TEXT'
            WHEN data_type = 'double precision' THEN 'DOUBLE PRECISION'
            WHEN data_type = 'json' THEN 'JSON'
            WHEN data_type = 'jsonb' THEN 'JSONB'
            ELSE data_type
        END ||
        CASE 
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END ||
        CASE 
            WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ', '
        ORDER BY ordinal_position
    ) || ');'
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE '_prisma_%')
GROUP BY tablename
ORDER BY tablename;
" > "$BACKUP_DIR/qa_schema.sql"

# Export data for each table using COPY commands
for table in $TABLES; do
    if [ ! -z "$table" ]; then
        echo "📤 Exporting data from table: $table"
        psql "$QA_DATABASE_URL" -c "\COPY \"$table\" TO STDOUT WITH CSV" > "$BACKUP_DIR/qa_${table}_data.csv"
    fi
done

# Import schema to local database
echo "📥 Importing schema to local database..."
psql "$LOCAL_DATABASE_URL" < "$BACKUP_DIR/qa_schema.sql"

# Import data to local database
echo "📥 Importing data to local database..."
for table in $TABLES; do
    if [ ! -z "$table" ] && [ -f "$BACKUP_DIR/qa_${table}_data.csv" ]; then
        echo "📥 Importing data to table: $table"
        # First create the table if it doesn't exist
        psql "$LOCAL_DATABASE_URL" -c "$(cat "$BACKUP_DIR/qa_schema.sql" | grep -A 100 "CREATE TABLE IF NOT EXISTS \"$table\"" | head -1)"
        # Then import the CSV data
        psql "$LOCAL_DATABASE_URL" -c "\COPY \"$table\" FROM '$BACKUP_DIR/qa_${table}_data.csv' WITH CSV"
    fi
done

# Verify migration
echo "🔍 Verifying migration..."

echo "📊 Table counts comparison:"
echo "QA Database:"
psql "$QA_DATABASE_URL" -c "
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = schemaname AND table_name = tablename) as table_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%' 
AND tablename NOT LIKE '_prisma_%'
ORDER BY tablename;
"

echo "Local Database:"
psql "$LOCAL_DATABASE_URL" -c "
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = schemaname AND table_name = tablename) as table_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%' 
AND tablename NOT LIKE '_prisma_%'
ORDER BY tablename;
"

# Sample data verification
echo "🔍 Sample data verification:"
for table in $TABLES; do
    if [ ! -z "$table" ]; then
        echo "📊 Table: $table"
        echo "QA count: $(psql "$QA_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" | tr -d ' ')"
        echo "Local count: $(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" | tr -d ' ')"
        echo "---"
    fi
done

echo "🎉 Migration completed successfully!"
echo "📁 Backup files saved in: $BACKUP_DIR"
echo "🌐 Local database is now ready at: $(echo $LOCAL_DATABASE_URL | sed 's/:[^:]*@/:***@/')"

# Update Prisma schema to use local database
echo "🔧 Updating Prisma configuration..."
echo "To use the local database, update your DATABASE_URL in .env.local:"
echo "DATABASE_URL=\"$LOCAL_DATABASE_URL\""

echo "✅ Migration script completed!"
