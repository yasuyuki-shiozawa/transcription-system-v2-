#!/bin/bash

# Vercel build script

echo "Starting Vercel build process..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run TypeScript build
echo "Building TypeScript..."
npm run build

echo "Build completed successfully!"