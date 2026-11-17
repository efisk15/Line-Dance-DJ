#!/bin/bash
# Requires Bash and the sqlite3 command-line program.
# Rebuilds line_dance_dj.db in the directory containing this script.
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
DB="line_dance_dj.db"

if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "Error: sqlite3 must be installed and available on PATH." >&2
    exit 1
fi

for file in schema.sql insert_data.sql queries.sql transaction.sql; do
    if [ ! -f "$file" ]; then
        echo "Error: missing $file in the script directory." >&2
        exit 1
    fi
done

echo "Recreating database..."
rm -f -- "$DB"
sqlite3 -bail "$DB" < schema.sql
sqlite3 -bail "$DB" < insert_data.sql

echo
echo "Running queries (requirements 1 through 9, in order)..."
# Echo displays each requirement's comment beside its query and results.
# Each SQL file turns on foreign-key enforcement (PRAGMA foreign_keys = ON)
# because SQLite enables it separately for each connection.
sqlite3 -bail -echo -header -column -nullvalue NULL \
    "$DB" < queries.sql

echo
echo "Running transaction..."
if sqlite3 -bail -header -column -nullvalue NULL \
    "$DB" < transaction.sql; then
    echo "Transaction demonstration completed successfully; changes were rolled back."
else
    echo "Transaction failed; uncommitted changes were rolled back on disconnect." >&2
    exit 1
fi

echo
echo "Done. Database recreation, queries, and transaction demonstration are complete."
