#!/bin/bash

# Dental Platform Migration Scripts
# Main orchestrator script that runs all migration phases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Migration configuration
MIGRATION_BRANCH="migration/future-proof-architecture"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        exit 1
    fi
    
    # Check if node is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        print_warning "PNPM is not installed. Installing..."
        npm install -g pnpm
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to create backup
create_backup() {
    print_status "Creating backup of current code..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Copy important directories
    cp -r src "$BACKUP_DIR/" 2>/dev/null || true
    cp -r prisma "$BACKUP_DIR/" 2>/dev/null || true
    cp -r app "$BACKUP_DIR/" 2>/dev/null || true
    cp package.json "$BACKUP_DIR/" 2>/dev/null || true
    cp -r .env* "$BACKUP_DIR/" 2>/dev/null || true
    
    print_success "Backup created in $BACKUP_DIR"
}

# Function to create migration branch
create_migration_branch() {
    print_status "Creating migration branch..."
    
    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/$MIGRATION_BRANCH"; then
        print_warning "Migration branch already exists. Using existing branch."
        git checkout "$MIGRATION_BRANCH"
    else
        git checkout -b "$MIGRATION_BRANCH"
        print_success "Created and switched to branch: $MIGRATION_BRANCH"
    fi
}

# Main migration menu
show_menu() {
    echo
    echo "=================================="
    echo "  Dental Platform Migration Tool  "
    echo "=================================="
    echo
    echo "Select migration phase to run:"
    echo
    echo "1) Phase 1: Organize Current Code"
    echo "2) Phase 2: Extract Core Domain"
    echo "3) Phase 3: Setup Monorepo"
    echo "4) Phase 4: Implement Service Layer"
    echo "5) Phase 5: Production Optimization"
    echo
    echo "Utilities:"
    echo "6) Run all phases sequentially"
    echo "7) Validate migration status"
    echo "8) Generate migration report"
    echo "9) Rollback to backup"
    echo
    echo "0) Exit"
    echo
    read -p "Enter your choice [0-9]: " choice
}

# Function to run specific phase
run_phase() {
    case $1 in
        1)
            print_status "Running Phase 1: Organize Current Code"
            bash ./scripts/migration/phase1_organize.sh
            ;;
        2)
            print_status "Running Phase 2: Extract Core Domain"
            bash ./scripts/migration/phase2_domain.sh
            ;;
        3)
            print_status "Running Phase 3: Setup Monorepo"
            bash ./scripts/migration/phase3_monorepo.sh
            ;;
        4)
            print_status "Running Phase 4: Implement Service Layer"
            bash ./scripts/migration/phase4_services.sh
            ;;
        5)
            print_status "Running Phase 5: Production Optimization"
            bash ./scripts/migration/phase5_optimization.sh
            ;;
        *)
            print_error "Invalid phase number"
            return 1
            ;;
    esac
}

# Function to run all phases
run_all_phases() {
    print_status "Running all migration phases..."
    
    for phase in {1..5}; do
        run_phase $phase
        if [ $? -ne 0 ]; then
            print_error "Phase $phase failed. Stopping migration."
            return 1
        fi
        print_success "Phase $phase completed"
        echo
    done
    
    print_success "All migration phases completed successfully!"
}

# Function to validate migration
validate_migration() {
    print_status "Validating migration status..."
    if [ -f "./scripts/migration/validate.sh" ]; then
        bash ./scripts/migration/validate.sh
    else
        print_warning "Validation script not found"
    fi
}

# Function to generate report
generate_report() {
    print_status "Generating migration report..."
    if [ -f "./scripts/migration/report.sh" ]; then
        bash ./scripts/migration/report.sh
    else
        print_warning "Report script not found"
    fi
}

# Function to rollback
rollback() {
    print_status "Rolling back to backup..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "No backup found at $BACKUP_DIR"
        return 1
    fi
    
    read -p "Are you sure you want to rollback? This will overwrite current changes. (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        cp -r "$BACKUP_DIR"/* .
        print_success "Rollback completed"
    else
        print_warning "Rollback cancelled"
    fi
}

# Main execution
main() {
    clear
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    create_backup
    
    # Create migration branch
    create_migration_branch
    
    # Create scripts directory if it doesn't exist
    mkdir -p scripts/migration
    
    # Main loop
    while true; do
        show_menu
        
        case $choice in
            1|2|3|4|5)
                run_phase $choice
                ;;
            6)
                run_all_phases
                ;;
            7)
                validate_migration
                ;;
            8)
                generate_report
                ;;
            9)
                rollback
                ;;
            0)
                print_status "Exiting migration tool"
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please try again."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
        clear
    done
}

# Run main function
main