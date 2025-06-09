#!/bin/bash

# Utility functions for migration scripts

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Print functions
print_phase_header() {
    echo
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo
}

step_start() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}  ✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}  ✗ $1${NC}"
}

print_phase_complete() {
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ $1 Complete${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Utility functions
backup_file() {
    if [ -f "$1" ]; then
        cp "$1" "$1.backup.$(date +%Y%m%d_%H%M%S)"
    fi
}

ensure_directory() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}
