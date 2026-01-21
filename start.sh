#!/bin/bash

# CRM MVP Startup Script
# This script sets up and starts the CRM MVP application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CRM MVP Startup Script${NC}"
echo -e "${BLUE}=========================${NC}"

# Function to print status messages
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"
if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    print_warning "Node.js version $NODE_VERSION detected. Node.js 18+ is recommended."
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose first."
    exit 1
fi

print_info "Checking project setup..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the CRM MVP root directory."
    exit 1
fi

# Check if .env.local exists, create from example if needed
if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        print_info "Creating .env.local from .env.example..."
        cp .env.example .env.local
        print_status "Environment file created"
    else
        print_warning ".env.local not found and .env.example not available. You may need to create it manually."
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_status "Dependencies installed"
else
    print_info "Dependencies already installed"
fi

# Start Docker containers
print_info "Starting PostgreSQL database..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Wait for database to be ready
print_info "Waiting for database to be ready..."
sleep 5

# Check if database is responding
MAX_RETRIES=30
RETRY_COUNT=0

# Get the container ID for our CRM MVP postgres
CONTAINER_ID=$(docker ps -q --filter name=crm-mvp-postgres)

if [ -z "$CONTAINER_ID" ]; then
    print_error "PostgreSQL container not found. It may have failed to start due to port conflict."
    print_info "Try one of these solutions:"
    print_info "1. Stop other PostgreSQL containers: docker stop \$(docker ps -q --filter publish=5432)"
    print_info "2. Use a different port: Edit docker-compose.yml to use port 5433"
    print_info "3. Stop all containers and restart: docker stop \$(docker ps -q) && docker system prune -f"
    exit 1
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec $CONTAINER_ID pg_isready -U postgres -h localhost &> /dev/null; then
        print_status "Database is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Database failed to start after $MAX_RETRIES attempts"
    print_info "Container logs:"
    docker logs $CONTAINER_ID | tail -10
    exit 1
fi

# Load environment variables
if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
    print_info "Environment variables loaded"
else
    print_error "No .env.local file found"
    exit 1
fi

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Generate Prisma client
print_info "Generating Prisma client..."
DATABASE_URL="$DATABASE_URL" npm run db:generate
print_status "Prisma client generated"

# Check if database needs to be initialized
if ! DATABASE_URL="$DATABASE_URL" npx prisma db push --preview-feature &> /dev/null; then
    print_info "Setting up database schema..."
    DATABASE_URL="$DATABASE_URL" npm run db:migrate
    print_status "Database schema created"
else
    print_info "Database schema already exists"
fi

# Seed the database
print_info "Seeding database with demo data..."
DATABASE_URL="$DATABASE_URL" npm run db:seed
print_status "Demo data seeded"

# Start the development server
print_info "Starting development server..."
print_info "The application will be available at: http://localhost:3000"

npm run dev