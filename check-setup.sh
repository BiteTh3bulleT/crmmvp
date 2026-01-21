#!/bin/bash

# CRM MVP Setup Validation Script
# This script checks if the environment is properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 CRM MVP Setup Validation${NC}"
echo -e "${BLUE}============================${NC}"

PASSED=0
FAILED=0

# Function to print test results
print_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" = "18.0.0" ]; then
        print_pass "Node.js $NODE_VERSION (18+ required)"
    else
        print_fail "Node.js $NODE_VERSION (18+ required)"
    fi
else
    print_fail "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_pass "npm $NPM_VERSION"
else
    print_fail "npm not found"
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | sed 's/Docker version //' | cut -d',' -f1)
    print_pass "Docker $DOCKER_VERSION"
else
    print_fail "Docker not found"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | sed 's/.*version //' | cut -d',' -f1)
    print_pass "Docker Compose $COMPOSE_VERSION"
elif docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version | sed 's/.*version //' | cut -d',' -f1)
    print_pass "Docker Compose (plugin) $COMPOSE_VERSION"
else
    print_fail "Docker Compose not found"
fi

# Check if in correct directory
if [ -f "package.json" ]; then
    print_pass "In CRM MVP directory"
else
    print_fail "Not in CRM MVP directory (package.json not found)"
fi

# Check package.json dependencies
if [ -f "package.json" ]; then
    if grep -q '"next":' package.json; then
        print_pass "Next.js dependency found"
    else
        print_fail "Next.js dependency not found"
    fi

    if grep -q '"prisma":' package.json; then
        print_pass "Prisma dependency found"
    else
        print_fail "Prisma dependency not found"
    fi
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_pass "node_modules directory exists"
else
    print_warn "node_modules directory missing (run 'npm install')"
fi

# Check environment file
if [ -f ".env.local" ]; then
    print_pass ".env.local file exists"
elif [ -f ".env.example" ]; then
    print_warn ".env.local missing (copy from .env.example)"
else
    print_fail "Environment file not found"
fi

# Check Prisma schema
if [ -f "prisma/schema.prisma" ]; then
    print_pass "Prisma schema exists"
else
    print_fail "Prisma schema not found"
fi

# Check startup script
if [ -f "start.sh" ]; then
    if [ -x "start.sh" ]; then
        print_pass "Startup script is executable"
    else
        print_warn "Startup script exists but is not executable (run 'chmod +x start.sh')"
    fi
else
    print_fail "Startup script not found"
fi

# Check Docker Compose file
if [ -f "docker-compose.yml" ]; then
    print_pass "Docker Compose configuration exists"
else
    print_fail "Docker Compose configuration not found"
fi

echo ""
echo -e "${BLUE}Validation Summary:${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Ready to start!${NC}"
fi

if [ $FAILED -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Fix the failed checks before running the startup script.${NC}"
    exit 1
fi