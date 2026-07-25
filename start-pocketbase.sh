#!/bin/bash
# Start PocketBase server
# First time: ./pocketbase.exe serve --http=127.0.0.1:8090
# Then create admin account via the web UI at http://127.0.0.1:8090/_/admin

cd "$(dirname "$0")"

echo "Starting PocketBase on http://127.0.0.1:8090"
echo "Admin UI: http://127.0.0.1:8090/_/admin"
echo ""
echo "First time setup:"
echo "  1. Open http://127.0.0.1:8090/_/admin in your browser"
echo "  2. Create an admin account"
echo "  3. Run: node pocketbase-setup.js"
echo ""

./pocketbase.exe serve --http=127.0.0.1:8090 --dir ./pb_data
