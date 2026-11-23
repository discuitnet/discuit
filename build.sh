#!/usr/bin/env bash

# Exit on error
set -e

# Build the backend
go build

# Build the React app
cd ui
pnpm ci
pnpm run build
cd ..

