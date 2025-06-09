#!/bin/bash

# Migration Validation Script
set -e

source ./scripts/migration/utils.sh

print_phase_header "Migration Validation"

# Check if all phases completed
validate_phase() {
    local phase_name="$1"
    local report_file="$2"
    
    if [ -f "$report_file" ]; then
        print_success "$phase_name completed"
        return 0
    else
        print_error "$phase_name not completed"
        return 1
    fi
}

step_start "Validating migration phases"

validate_phase "Phase 1" "migration_status_phase1.md"
validate_phase "Phase 2" "migration_status_phase2.md"  
validate_phase "Phase 3" "migration_status_phase3.md"
validate_phase "Phase 4" "migration_status_phase4.md"
validate_phase "Phase 5" "migration_status_phase5.md"

step_start "Checking directory structure"

# Check if all required directories exist
required_dirs=(
    "apps/web"
    "packages/core"
    "packages/shared"
    "packages/ui"
    "packages/api"
    "infrastructure/docker"
    "scripts/migration"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_success "$dir exists"
    else
        print_error "$dir missing"
    fi
done

step_start "Checking package files"

# Check if all package.json files exist
package_files=(
    "package.json"
    "apps/web/package.json"
    "packages/core/package.json"
    "packages/shared/package.json"
    "packages/ui/package.json"
    "packages/api/package.json"
)

for file in "${package_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file missing"
    fi
done

print_phase_complete "Migration Validation"
