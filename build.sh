#!/bin/bash

# Exit on error
set -e

# Build the backend
go build

# Build the React app
cd ui
npm ci
npm run build
cd ..

