#!/bin/bash
set -e

# Start MariaDB
service mariadb start

# Start Redis
service redis-server start

# Set up initial database if it doesn't exist
echo "Creating the discuit database if it doesn't already exist..."
mysql -e "CREATE DATABASE IF NOT EXISTS discuit;"

# TODO: Ensure root access with no password is enabled
mysql -e "CREATE USER IF NOT EXISTS 'discuit'@'%' IDENTIFIED BY 'discuit';" # !!! FUCK: Don't give access from anywhere !!!
mysql -e "GRANT ALL PRIVILEGES ON discuit.* TO 'discuit'@'%';"              # !!! FUCK: Don't give access from anywhere !!!

# Run migrations
echo "Running migrations..."
/app/discuit -migrate

# Start the Discuit server
echo "Starting Discuit..."
exec "$@"