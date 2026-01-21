#!/bin/bash

# CRM MVP Startup Script (Alternative Port)
# This script uses port 5434 instead of 5432 to avoid conflicts

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CRM MVP Startup Script (Alt Port)${NC}"
echo -e "${BLUE}=====================================${NC}"

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

print_info "Using alternative port 5434 to avoid conflicts..."
print_info "Checking project setup..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the CRM MVP root directory."
    exit 1
fi

# Create .env.local with alternative port if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_info "Creating .env.local with alternative port (5434)..."
    cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5434/crm_mvp?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-change-in-production"

# Seed User (for development)
SEED_USER_EMAIL="admin@example.com"
SEED_USER_PASSWORD="password123"
EOF
    print_status "Environment file created (port 5434)"
else
    print_info "Environment file already exists"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_status "Dependencies installed"
else
    print_info "Dependencies already installed"
fi

# Start Docker containers with alternative config
print_info "Starting PostgreSQL database on port 5434..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.alt.yml up -d
else
    docker compose -f docker-compose.alt.yml up -d
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
    print_error "PostgreSQL container not found. It may have failed to start."
    print_info "Check if port 5434 is available: netstat -tlnp | grep :5434"
    exit 1
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec $CONTAINER_ID pg_isready -U postgres -h localhost &> /dev/null; then
        print_status "Database is ready on port 5434"
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
print_info "Database is running on port 5434"
print_info "Login credentials:"
print_info "  Email: admin@example.com"
print_info "  Password: password123"
echo ""

npm run dev