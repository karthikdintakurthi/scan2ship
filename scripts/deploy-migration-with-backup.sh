#!/usr/bin/env bash
# =============================================================================
# Deploy migration to production: full backup first, then migrate.
# Ensures no data loss by taking a deep-clone backup before applying migration.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load DATABASE_URL from .env.production or .env.local
if [ -f "${REPO_ROOT}/.env.production" ]; then
  set -a
  source "${REPO_ROOT}/.env.production"
  set +a
elif [ -f "${REPO_ROOT}/.env.local" ]; then
  set -a
  source "${REPO_ROOT}/.env.local"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Export it or create .env.production with DATABASE_URL."
  exit 1
fi

echo "This will: 1) Take a full backup of the database  2) Run pending Prisma migrations."
if [[ "$DATABASE_URL" == *"railway"* ]] || [[ "$DATABASE_URL" == *"rlwy.net"* ]] || [[ "$DATABASE_URL" == *"prod"* ]]; then
  read -r -p "DATABASE_URL looks like PRODUCTION. Proceed? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

echo ""
echo "=============================================="
echo "Step 1/3: Full backup of production database"
echo "=============================================="
NON_INTERACTIVE=1 "$SCRIPT_DIR/backup-prod-db.sh"
BACKUP_EXIT=$?
if [ $BACKUP_EXIT -ne 0 ]; then
  echo "Backup failed. Aborting migration."
  exit $BACKUP_EXIT
fi

echo ""
echo "=============================================="
echo "Step 2/3: Run pending migrations"
echo "=============================================="
cd "$REPO_ROOT"
npx prisma migrate deploy
MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "Migration failed. Production DB is unchanged; backup is available in ./backups/"
  exit $MIGRATE_EXIT
fi

echo ""
echo "=============================================="
echo "Step 3/3: Verify migration status"
echo "=============================================="
npx prisma migrate status

echo ""
echo "Done. The pre-migration backup is in ./backups/ ."
