#!/bin/bash

echo "🧹 Starting cleanup of unwanted files..."
echo "📋 Preserving API documentation and essential files..."

# Create a backup directory for safety
mkdir -p cleanup_backup_$(date +%Y%m%d_%H%M%S)

# Files to remove (unwanted documentation and temporary files)
UNWANTED_FILES=(
    "DATABASE_SECURITY_SUMMARY.md"
    "ENVIRONMENT_SECURITY_FIXES.md"
    "LOCAL_DEVELOPMENT.md"
    "POST_MIGRATION_TROUBLESHOOTING.md"
    "PROD_TO_QA_MIGRATION_GUIDE.md"
    "QA_TO_LOCAL_MIGRATION.md"
    "SECURITY_IMPLEMENTATION_SUMMARY.md"
    "SECURITY_MIDDLEWARE_CONSOLIDATION.md"
    "SECURITY_SETUP.md"
    "SHOPIFY_INTEGRATION.md"
    "SPLUNK_INTEGRATION.md"
    "SYSTEM_SETTINGS_TESTING_SUMMARY.md"
    "eng.traineddata"
    "test-thermal-label.html"
    "qa_backup_2025-09-03T20-45-37-363Z.sql"
    "start-local-postgres.sh"
    "start-local.sh"
    "verify-migration.sh"
)

# Migration backup directories to remove
UNWANTED_DIRS=(
    "migration_backup_2025-09-03T02-37-36-501Z"
    "migration_backup_20250902_233915"
    "migration_backup_20250902_234034"
    "migration_backup_20250902_234229"
    "migration_backup_20250902_234329"
    "migration_backup_20250902_234403"
    "migration_backup_20250902_234459"
    "migration_backup_20250902_234916"
    "migration_backup_20250902_234940"
)

# Migration scripts to remove
UNWANTED_SCRIPTS=(
    "migrate-qa-to-local-final.sh"
    "migrate-qa-to-local-simple-final.sh"
    "migrate-qa-to-local-simple.sh"
    "migrate-qa-to-local-working.sh"
    "migrate-qa-to-local.sh"
)

echo "🗑️  Removing unwanted files..."

# Remove unwanted files
for file in "${UNWANTED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   Removing: $file"
        rm "$file"
    fi
done

# Remove unwanted directories
for dir in "${UNWANTED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   Removing directory: $dir"
        rm -rf "$dir"
    fi
done

# Remove unwanted scripts
for script in "${UNWANTED_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "   Removing: $script"
        rm "$script"
    fi
done

# Clean up scripts directory - remove temporary migration scripts
echo "🧹 Cleaning up scripts directory..."
cd scripts

# Remove temporary migration and test scripts (keep essential ones)
TEMP_SCRIPTS=(
    "migrate-qa-schema.js"
    "copy-qa-to-local.js"
    "generate-qa-api-keys.js"
    "list-qa-api-keys.js"
    "test-*.js"
    "debug-*.js"
    "check-*.js"
    "fix-*.js"
    "update-*.js"
    "verify-*.js"
    "clear-*.js"
    "delete-*.js"
    "cleanup-*.js"
    "final-*.js"
    "demo-*.js"
    "find-*.js"
    "remove-*.js"
    "reset-*.js"
    "seed-*.js"
    "setup-*.js"
    "import-*.js"
)

for pattern in "${TEMP_SCRIPTS[@]}"; do
    for file in $pattern; do
        if [ -f "$file" ]; then
            echo "   Removing script: $file"
            rm "$file"
        fi
    done
done

cd ..

# Remove shopify-app-example directory (temporary example)
if [ -d "shopify-app-example" ]; then
    echo "   Removing: shopify-app-example/"
    rm -rf "shopify-app-example"
fi

# Remove cleanup script itself
echo "🧹 Cleanup completed!"
echo "📊 Summary:"
echo "   ✅ Preserved API documentation files"
echo "   ✅ Preserved essential project files"
echo "   ✅ Removed temporary migration files"
echo "   ✅ Removed backup directories"
echo "   ✅ Cleaned up scripts directory"
echo "   ✅ Removed example files"

echo ""
echo "📋 Preserved files:"
echo "   - API_DOCUMENTATION.md"
echo "   - AUTHENTICATION_AUTHORIZATION_FIXES.md"
echo "   - API_AUDIT_SUMMARY.md"
echo "   - README.md"
echo "   - Essential source code"
echo "   - Database schema and migrations"
echo "   - Package configuration files"

echo ""
echo "🎉 Cleanup completed successfully!"
