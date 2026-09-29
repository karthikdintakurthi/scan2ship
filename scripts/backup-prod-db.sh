#!/usr/bin/env bash
# =============================================================================
# Production database full backup (deep clone)
# Uses DATABASE_URL from environment. Run against PROD only when intended.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUPS_DIR="${REPO_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUPS_DIR}/prod_backup_${TIMESTAMP}.sql"

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

# Confirm when URL looks like production (contains common prod indicators)
# Skip confirmation if NON_INTERACTIVE=1 (e.g. CI or when called from deploy script)
if [ "${NON_INTERACTIVE:-0}" != "1" ]; then
  if [[ "$DATABASE_URL" == *"railway"* ]] || [[ "$DATABASE_URL" == *"rlwy.net"* ]] || [[ "$DATABASE_URL" == *"prod"* ]]; then
    echo "WARNING: DATABASE_URL looks like PRODUCTION."
    echo "You are about to create a full backup of the production database."
    read -r -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      echo "Aborted."
      exit 1
    fi
  fi
fi

mkdir -p "$BACKUPS_DIR"

echo "Creating full backup at: $BACKUP_FILE"
echo "This may take a few minutes for large databases..."

# Full dump: schema + data, no owner/acl for portability
# --no-owner --no-acl so restore works on different roles
if pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f "$BACKUP_FILE"; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup completed successfully."
  echo "  File: $BACKUP_FILE"
  echo "  Size: $SIZE"
  echo ""
  echo "To restore (only if needed): psql \$DATABASE_URL -f $BACKUP_FILE"
  exit 0
else
  echo "ERROR: pg_dump failed."
  exit 1
fi
