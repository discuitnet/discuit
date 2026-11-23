#!/bin/bash
set -e

# Start MariaDB
echo "Starting MariaDB..."
service mariadb start

# Start Redis
echo "Starting Redis..."
service redis-server start

# Wait for Redis, since its init script exits 0 even if it fails
for _ in {1..60}; do
    redis-cli ping > /dev/null 2>&1 && break
    sleep 0.5
done
if ! redis-cli ping > /dev/null; then
    echo "Redis failed to start."
    exit 1
fi

# Set up initial database if it doesn't exist
echo "Creating the discuit database if it doesn't already exist..."
mysql -e "CREATE DATABASE IF NOT EXISTS discuit;"

# Create a user for the Discuit server
echo "Creating the discuit user..."
mysql -e "CREATE USER IF NOT EXISTS 'discuit'@'127.0.0.1' IDENTIFIED BY 'discuit';"
mysql -e "GRANT ALL PRIVILEGES ON discuit.* TO 'discuit'@'127.0.0.1';"

# Run migrations
/app/discuit migrate run

# Build the UI
echo "Building the UI..."
cd /app/ui
pnpm run build
cd ..

# Start the Discuit server
echo "Starting Discuit..."
exec "$@"
