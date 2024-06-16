#!/bin/bash
set -e

# Start MariaDB
service mariadb start

# Start Redis
service redis-server start

# Set up initial database if it doesn't exist
echo "Creating the discuit database if it doesn't already exist..."
mysql -e "CREATE DATABASE IF NOT EXISTS discuit;"

# Create a user for the Discuit server
mysql -e "CREATE USER IF NOT EXISTS 'discuit'@'127.0.0.1' IDENTIFIED BY 'discuit';"
mysql -e "GRANT ALL PRIVILEGES ON discuit.* TO 'discuit'@'127.0.0.1';"

# Build the UI
echo "Building the UI..."
cd /app/ui
npm run build:prod
cd ..

# Run migrations
echo "Running migrations..."
/app/discuit migrate

# Start the Discuit server
echo "Starting Discuit..."
exec "$@"
