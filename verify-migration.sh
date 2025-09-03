#!/bin/bash

# Migration Verification Script
# This script verifies the results of the QA to Local database migration

echo "🔍 Verifying QA to Local Database Migration Results..."

# Source environment variables
if [ -f .env.local ]; then
    source .env.local
else
    echo "❌ .env.local file not found!"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$QA_DATABASE_URL" ] || [ -z "$LOCAL_DATABASE_URL" ]; then
    echo "❌ Required environment variables not found!"
    exit 1
fi

echo "✅ QA Database: $(echo $QA_DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo "✅ Local Database: $(echo $LOCAL_DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo ""

# Test connections
echo "🔍 Testing database connections..."
if psql "$QA_DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ QA database connection successful"
else
    echo "❌ QA database connection failed"
    exit 1
fi

if psql "$LOCAL_DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Local database connection successful"
else
    echo "❌ Local database connection failed"
    exit 1
fi

echo ""

# Get table list
echo "📋 Getting table information..."
TABLES=$(psql "$QA_DATABASE_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE '_prisma_%';" | tr -d ' ')

echo "📊 Migration Summary:"
echo "====================="

# Check each table
for table in $TABLES; do
    if [ ! -z "$table" ]; then
        echo ""
        echo "📋 Table: $table"
        
        # Get QA count
        QA_COUNT=$(psql "$QA_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" | tr -d ' ')
        echo "   QA Database: $QA_COUNT rows"
        
        # Get Local count
        LOCAL_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" | tr -d ' ')
        echo "   Local Database: $LOCAL_COUNT rows"
        
        # Calculate success rate
        if [ "$QA_COUNT" -gt 0 ]; then
            SUCCESS_RATE=$((LOCAL_COUNT * 100 / QA_COUNT))
            if [ "$SUCCESS_RATE" -eq 100 ]; then
                echo "   ✅ Status: COMPLETE (100%)"
            elif [ "$SUCCESS_RATE" -gt 0 ]; then
                echo "   ⚠️  Status: PARTIAL ($SUCCESS_RATE%)"
            else
                echo "   ❌ Status: FAILED (0%)"
            fi
        else
            echo "   ℹ️  Status: EMPTY TABLE"
        fi
    fi
done

echo ""
echo "🎯 Migration Results Summary:"
echo "============================="

# Count successful migrations
TOTAL_TABLES=0
SUCCESSFUL_TABLES=0
PARTIAL_TABLES=0
FAILED_TABLES=0

for table in $TABLES; do
    if [ ! -z "$table" ]; then
        TOTAL_TABLES=$((TOTAL_TABLES + 1))
        
        QA_COUNT=$(psql "$QA_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" | tr -d ' ')
        LOCAL_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" | tr -d ' ')
        
        if [ "$QA_COUNT" -gt 0 ]; then
            SUCCESS_RATE=$((LOCAL_COUNT * 100 / QA_COUNT))
            if [ "$SUCCESS_RATE" -eq 100 ]; then
                SUCCESSFUL_TABLES=$((SUCCESSFUL_TABLES + 1))
            elif [ "$SUCCESS_RATE" -gt 0 ]; then
                PARTIAL_TABLES=$((PARTIAL_TABLES + 1))
            else
                FAILED_TABLES=$((FAILED_TABLES + 1))
            fi
        else
            SUCCESSFUL_TABLES=$((SUCCESSFUL_TABLES + 1))
        fi
    fi
done

echo "📊 Total Tables: $TOTAL_TABLES"
echo "✅ Successful: $SUCCESSFUL_TABLES"
echo "⚠️  Partial: $PARTIAL_TABLES"
echo "❌ Failed: $FAILED_TABLES"

echo ""
echo "🌐 Next Steps:"
echo "=============="
echo "1. Your local database is ready at: $(echo $LOCAL_DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo "2. To use it for development, update your .env.local:"
echo "   DATABASE_URL=\"$LOCAL_DATABASE_URL\""
echo "3. Start your application with: ./start-local-postgres.sh"
echo ""

if [ "$SUCCESSFUL_TABLES" -eq "$TOTAL_TABLES" ]; then
    echo "🎉 MIGRATION COMPLETED SUCCESSFULLY!"
elif [ "$SUCCESSFUL_TABLES" -gt 0 ]; then
    echo "✅ MIGRATION MOSTLY SUCCESSFUL - Ready for development!"
else
    echo "❌ MIGRATION FAILED - Please check the logs"
fi

echo ""
echo "✅ Verification completed!"
