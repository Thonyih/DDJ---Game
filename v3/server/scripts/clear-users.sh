#!/usr/bin/env bash
# Deletes every user except admin accounts from the game database.
# Usage (from anywhere): ./v3/server/scripts/clear-users.sh
set -euo pipefail

DB="$(cd "$(dirname "$0")/.." && pwd)/game.db"

if [ ! -f "$DB" ]; then
  echo "No database found at $DB (start the server once to create it)."
  exit 1
fi

deleted=$(sqlite3 "$DB" "DELETE FROM Users WHERE Role <> 'Admin'; SELECT changes();")
echo "Deleted $deleted user(s). Remaining:"
sqlite3 -column -header "$DB" "SELECT Id, Username, Role FROM Users;"
