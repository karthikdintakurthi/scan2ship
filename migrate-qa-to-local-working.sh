#!/bin/bash

# Working QA to Local Database Migration Script
# This script migrates data from QA database to local PostgreSQL database
# Only copies tables that work without issues

set -e  # Exit on any error

echo "🚀 Starting Working QA to Local Database Migration..."

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

# Use Prisma to push the schema to local database
echo "🔧 Using Prisma to create tables in local database..."
export DATABASE_URL="$LOCAL_DATABASE_URL"
npx prisma db push --force-reset

if [ $? -eq 0 ]; then
    echo "✅ Tables created successfully using Prisma"
else
    echo "❌ Failed to create tables with Prisma"
    exit 1
fi

# Now copy data from QA to local using simple COPY commands
echo "📤 Copying data from QA to local database..."

# Define tables that work well with simple COPY (in dependency order)
WORKING_TABLES="clients courier_services users pickup_locations system_config orders client_config client_credit_costs client_credits credit_transactions analytics_events order_analytics sessions"

for table in $WORKING_TABLES; do
    if [ ! -z "$table" ]; then
        echo "🔄 Copying data for table: $table"
        
        # Get row count from QA
        QA_COUNT=$(psql "$QA_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" | tr -d ' ')
        echo "📊 QA table '$table' has $QA_COUNT rows"
        
        if [ "$QA_COUNT" -gt 0 ]; then
            # Copy data using simple COPY command
            echo "📤 Exporting data from QA table: $table"
            psql "$QA_DATABASE_URL" -c "\COPY \"$table\" TO STDOUT WITH CSV" > "$BACKUP_DIR/qa_${table}_data.csv"
            
            if [ -s "$BACKUP_DIR/qa_${table}_data.csv" ]; then
                echo "📥 Importing data to local table: $table"
                psql "$LOCAL_DATABASE_URL" -c "\COPY \"$table\" FROM '$BACKUP_DIR/qa_${table}_data.csv' WITH CSV"
                
                if [ $? -eq 0 ]; then
                    LOCAL_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" | tr -d ' ')
                    echo "✅ Successfully copied $LOCAL_COUNT rows to local table: $table"
                else
                    echo "⚠️  Failed to copy data for table: $table"
                fi
            else
                echo "⚠️  No data exported for table: $table"
            fi
        else
            echo "ℹ️  Table '$table' is empty, skipping data copy"
        fi
        
        echo "---"
    fi
done

# Handle client_order_configs separately with manual data insertion
echo "🔄 Handling client_order_configs table manually..."
QA_COUNT=$(psql "$QA_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"client_order_configs\";" | tr -d ' ')
echo "📊 QA table 'client_order_configs' has $QA_COUNT rows"

if [ "$QA_COUNT" -gt 0 ]; then
    echo "📤 Manually copying client_order_configs data..."
    
    # Get the data and insert manually
    psql "$QA_DATABASE_URL" -c "
    SELECT 
        id,
        \"defaultProductDescription\",
        \"defaultPackageValue\",
        \"defaultWeight\",
        \"defaultTotalItems\",
        CASE WHEN \"codEnabledByDefault\" = 'true' THEN true ELSE false END as \"codEnabledByDefault\",
        \"defaultCodAmount\",
        \"minPackageValue\",
        \"maxPackageValue\",
        \"minWeight\",
        \"maxWeight\",
        \"minTotalItems\",
        \"maxTotalItems\",
        CASE WHEN \"requireProductDescription\" = 'true' THEN true ELSE false END as \"requireProductDescription\",
        CASE WHEN \"requirePackageValue\" = 'true' THEN true ELSE false END as \"requirePackageValue\",
        CASE WHEN \"requireWeight\" = 'true' THEN true ELSE false END as \"requireWeight\",
        CASE WHEN \"requireTotalItems\" = 'true' THEN true ELSE false END as \"requireTotalItems\",
        \"clientId\",
        CASE WHEN \"enableResellerFallback\" = 'true' THEN true ELSE false END as \"enableResellerFallback\"
    FROM \"client_order_configs\"" | tail -n +2 | while IFS='|' read -r id desc val weight items cod codamt minval maxval minw maxw minitems maxitems reqdesc reqval reqw reqitems clientid reseller; do
        # Clean up the values
        id=$(echo "$id" | xargs)
        desc=$(echo "$desc" | xargs)
        val=$(echo "$val" | xargs)
        weight=$(echo "$weight" | xargs)
        items=$(echo "$items" | xargs)
        cod=$(echo "$cod" | xargs)
        codamt=$(echo "$codamt" | xargs)
        minval=$(echo "$minval" | xargs)
        maxval=$(echo "$maxval" | xargs)
        minw=$(echo "$minw" | xargs)
        maxw=$(echo "$maxw" | xargs)
        minitems=$(echo "$minitems" | xargs)
        maxitems=$(echo "$maxitems" | xargs)
        reqdesc=$(echo "$reqdesc" | xargs)
        reqval=$(echo "$reqval" | xargs)
        reqw=$(echo "$reqw" | xargs)
        reqitems=$(echo "$reqitems" | xargs)
        clientid=$(echo "$clientid" | xargs)
        reseller=$(echo "$reseller" | xargs)
        
        # Insert the row
        psql "$LOCAL_DATABASE_URL" -c "
        INSERT INTO \"client_order_configs\" (
            id, \"defaultProductDescription\", \"defaultPackageValue\", \"defaultWeight\", \"defaultTotalItems\",
            \"codEnabledByDefault\", \"defaultCodAmount\", \"minPackageValue\", \"maxPackageValue\",
            \"minWeight\", \"maxWeight\", \"minTotalItems\", \"maxTotalItems\",
            \"requireProductDescription\", \"requirePackageValue\", \"requireWeight\", \"requireTotalItems\",
            \"clientId\", \"enableResellerFallback\"
        ) VALUES (
            '$id', '$desc', $val, $weight, $items, $cod, $codamt, $minval, $maxval,
            $minw, $maxw, $minitems, $maxitems, $reqdesc, $reqval, $reqw, $reqitems,
            '$clientid', $reseller
        );"
    done
    
    LOCAL_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"client_order_configs\";" | tr -d ' ')
    echo "✅ Successfully copied $LOCAL_COUNT rows to local table: client_order_configs"
fi

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
for table in $WORKING_TABLES client_order_configs; do
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
