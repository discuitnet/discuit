#!/bin/bash
set -e

# If we are not using an externally hosted/ran database or redis, start the internal one
if [[ -v "${DISCUIT_EXTERNAL_DB_REDIS}" ]]; then
# Start MariaDB
echo "Starting MariaDB..."
service mariadb start

# Start Redis
echo "Starting Redis..."
service redis-server start

# Set up initial database if it doesn't exist
echo "Creating the discuit database if it doesn't already exist..."
mysql -e "CREATE DATABASE IF NOT EXISTS discuit;"

# Create a user for the Discuit server
echo "Creating the discuit user..."
mysql -e "CREATE USER IF NOT EXISTS 'discuit'@'127.0.0.1' IDENTIFIED BY 'discuit';"
mysql -e "GRANT ALL PRIVILEGES ON discuit.* TO 'discuit'@'127.0.0.1';"
fi

# Run migrations
/app/discuit -migrate

# Build the UI
echo "Building the UI..."
cd /app/ui
npm run build:prod
cd ..

# Start the Discuit server
echo "Starting Discuit..."
exec "$@"
