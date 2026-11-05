#!/usr/bin/env bash
# Operator-run backup helper. It never deletes backups; retention must be
# applied by the platform scheduler after restore testing is in place.
set -euo pipefail

: "${BACKUP_DIRECTORY:?Set an absolute encrypted-backup directory}"
: "${MONGO_ROOT_PASSWORD:?Set the Mongo root password in the execution environment}"

backup_root="$(realpath -m "$BACKUP_DIRECTORY")"
case "$backup_root" in /|.) echo "Refusing an unsafe backup directory." >&2; exit 2 ;; esac
mkdir -p "$backup_root"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$backup_root/medassist-$stamp.archive.gz"

docker compose exec -T mongo mongodump \
  --username medassist_root \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db medassist \
  --gzip --archive > "$archive"

test -s "$archive"
sha256sum "$archive" > "$archive.sha256"
echo "Backup written: $archive"
