#!/bin/bash

# Migration Directory Check Script
# This script analyzes the current state of your migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo
}

print_section() {
    echo -e "${BLUE}📁 $1${NC}"
    echo "----------------------------------------"
}

check_directory() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $description${NC}"
        if [ "$(ls -A "$dir" 2>/dev/null)" ]; then
            echo -e "${CYAN}   Files found:${NC}"
            find "$dir" -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | head -10 | while read file; do
                echo "   - $file"
            done
            local count=$(find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | wc -l)
            if [ "$count" -gt 10 ]; then
                echo "   ... and $((count - 10)) more files"
            fi
        else
            echo -e "${YELLOW}   Directory exists but is empty${NC}"
        fi
    else
        echo -e "${RED}❌ $description - Directory not found${NC}"
    fi
    echo
}

print_header "MIGRATION DIRECTORY CHECK"

echo "Current working directory: $(pwd)"
echo "Timestamp: $(date)"
echo

# Check backup directory
print_section "BACKUP VERIFICATION"
if [ -d "backup_20250608_184327" ]; then
    echo -e "${GREEN}✅ Original backup found${NC}"
    echo "   Location: backup_20250608_184327/"
    echo "   Dashboard: $([ -f "backup_20250608_184327/src/app/dashboard/page.tsx" ] && echo "✅ Found" || echo "❌ Missing")"
    echo "   Components: $(find backup_20250608_184327/src/components -name "*.tsx" 2>/dev/null | wc -l) files"
    echo "   API Routes: $(find backup_20250608_184327/src/app/api -name "*.ts" 2>/dev/null | wc -l) files"
else
    echo -e "${RED}❌ Backup directory not found${NC}"
fi
echo

# Check migration progress
print_section "MIGRATION STRUCTURE"

# Check if monorepo structure exists
check_directory "apps" "Monorepo Apps Directory"
check_directory "packages" "Monorepo Packages Directory"
check_directory "src-new" "Migration Working Directory"

# Check specific apps/web structure
print_section "WEB APPLICATION (apps/web)"
check_directory "apps/web" "Web App Root"
check_directory "apps/web/src" "Web App Source"
check_directory "apps/web/src/app" "Next.js App Directory"
check_directory "apps/web/src/app/dashboard" "Dashboard Page"
check_directory "apps/web/src/components" "Web App Components"
check_directory "apps/web/src/components/features" "Feature Components"
check_directory "apps/web/src/components/features/dashboards" "Dashboard Components"
check_directory "apps/web/src/components/shared" "Shared Components"
check_directory "apps/web/src/hooks" "Custom Hooks"
check_directory "apps/web/src/lib" "Library Files"

# Check packages structure
print_section "SHARED PACKAGES"
check_directory "packages/core" "Core Business Logic Package"
check_directory "packages/core/src" "Core Source"
check_directory "packages/core/src/domain" "Domain Layer"
check_directory "packages/core/src/application" "Application Layer"
check_directory "packages/shared" "Shared Utilities Package"
check_directory "packages/ui" "UI Component Library"
check_directory "packages/api" "API Package"

# Check for specific important files
print_section "KEY FILES CHECK"

key_files=(
    "apps/web/src/app/dashboard/page.tsx:Dashboard Page"
    "apps/web/package.json:Web App Package Config"
    "package.json:Root Package Config"
    "pnpm-workspace.yaml:PNPM Workspace Config"
    "turbo.json:Turborepo Config"
    "apps/web/next.config.ts:Next.js Config"
    "apps/web/tsconfig.json:TypeScript Config"
    "prisma/schema.prisma:Database Schema"
)

for item in "${key_files[@]}"; do
    IFS=':' read -r file description <<< "$item"
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $description${NC} - $file"
    else
        echo -e "${RED}❌ $description${NC} - $file"
    fi
done

echo

# Check dashboard components specifically
print_section "DASHBOARD COMPONENTS ANALYSIS"

dashboard_components=(
    "AdminDashboard.tsx"
    "DentistDashboard.tsx"
    "PatientDashboard.tsx"
    "ReviewerDashboard.tsx"
    "ManufacturerDashboard.tsx"
)

echo "Searching for dashboard components in various locations..."
echo

for component in "${dashboard_components[@]}"; do
    echo -e "${CYAN}Looking for $component:${NC}"
    
    # Search in backup
    backup_location=$(find backup_20250608_184327 -name "$component" 2>/dev/null | head -1)
    if [ -n "$backup_location" ]; then
        echo -e "  ${GREEN}📦 Backup:${NC} $backup_location"
    fi
    
    # Search in current structure
    current_locations=$(find . -name "$component" -not -path "./backup_*" -not -path "./node_modules/*" 2>/dev/null)
    if [ -n "$current_locations" ]; then
        echo "$current_locations" | while read location; do
            echo -e "  ${BLUE}📁 Current:${NC} $location"
        done
    else
        echo -e "  ${RED}❌ Not found in current structure${NC}"
    fi
    echo
done

# Check package.json dependencies
print_section "PACKAGE DEPENDENCIES"

if [ -f "apps/web/package.json" ]; then
    echo -e "${GREEN}✅ Web app package.json found${NC}"
    echo "Dependencies:"
    if command -v jq &> /dev/null; then
        jq -r '.dependencies | keys[]' apps/web/package.json 2>/dev/null | head -10 | while read dep; do
            echo "  - $dep"
        done
    else
        grep -A 20 '"dependencies"' apps/web/package.json | grep '"' | head -10
    fi
else
    echo -e "${RED}❌ Web app package.json not found${NC}"
fi

echo

# Check import patterns
print_section "IMPORT PATTERN ANALYSIS"

if [ -f "apps/web/src/app/dashboard/page.tsx" ]; then
    echo -e "${GREEN}✅ Dashboard page found - analyzing imports:${NC}"
    grep -n "^import\|^const.*= require" apps/web/src/app/dashboard/page.tsx 2>/dev/null | head -10
    echo
else
    echo -e "${RED}❌ Dashboard page not found${NC}"
fi

# Migration status summary
print_section "MIGRATION STATUS SUMMARY"

migration_phases=(
    "migration_status_phase1.md:Phase 1 - Code Organization"
    "migration_status_phase2.md:Phase 2 - Domain Extraction"
    "migration_status_phase3.md:Phase 3 - Monorepo Setup"
    "migration_status_phase4.md:Phase 4 - Service Layer"
    "migration_status_phase5.md:Phase 5 - Production Optimization"
)

echo "Migration phase reports:"
for phase in "${migration_phases[@]}"; do
    IFS=':' read -r file description <<< "$phase"
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $description${NC}"
    else
        echo -e "${YELLOW}⏳ $description${NC} - Not completed"
    fi
done

echo

# Recommendations
print_section "RECOMMENDATIONS"

echo -e "${YELLOW}Based on the directory analysis:${NC}"
echo

if [ ! -d "apps/web/src/app/dashboard" ]; then
    echo -e "${RED}🔧 CRITICAL:${NC} Dashboard directory missing"
    echo "   → Run: mkdir -p apps/web/src/app/dashboard"
    echo "   → Copy: cp backup_20250608_184327/src/app/dashboard/page.tsx apps/web/src/app/dashboard/"
    echo
fi

if [ ! -d "apps/web/src/components/features/dashboards" ]; then
    echo -e "${RED}🔧 CRITICAL:${NC} Dashboard components directory missing"
    echo "   → Run: mkdir -p apps/web/src/components/features/dashboards"
    echo "   → Copy dashboard components from backup"
    echo
fi

if [ ! -f "apps/web/package.json" ]; then
    echo -e "${RED}🔧 CRITICAL:${NC} Web app package.json missing"
    echo "   → Run Phase 3 of migration to set up monorepo properly"
    echo
fi

echo -e "${CYAN}💡 Next Steps:${NC}"
echo "1. If monorepo structure is missing, run: ./migrate.sh and choose Phase 3"
echo "2. Copy dashboard files from backup using the restoration script"
echo "3. Update import paths in dashboard components"
echo "4. Install dependencies with: cd apps/web && pnpm install"
echo "5. Start development server: cd apps/web && pnpm dev"
echo

print_header "DIRECTORY CHECK COMPLETE"

# Generate a quick fix script
echo -e "${BLUE}🛠️  Generating quick fix script...${NC}"

cat > fix_dashboard.sh << 'FIX_EOF'
#!/bin/bash

# Quick Dashboard Fix Script
set -e

echo "🔧 Fixing dashboard structure..."

# Create necessary directories
mkdir -p apps/web/src/app/dashboard
mkdir -p apps/web/src/components/features/dashboards
mkdir -p apps/web/src/components/shared
mkdir -p apps/web/src/hooks
mkdir -p apps/web/src/lib

# Copy dashboard page
if [ -f "backup_20250608_184327/src/app/dashboard/page.tsx" ]; then
    cp backup_20250608_184327/src/app/dashboard/page.tsx apps/web/src/app/dashboard/
    echo "✅ Dashboard page copied"
fi

# Copy dashboard components
dashboard_components=(
    "AdminDashboard.tsx"
    "PatientDashboard.tsx"
    "ReviewerDashboard.tsx"
    "ManufacturerDashboard.tsx"
)

for component in "${dashboard_components[@]}"; do
    source_file=$(find backup_20250608_184327/src/components -name "$component" 2>/dev/null | head -1)
    if [ -n "$source_file" ]; then
        cp "$source_file" "apps/web/src/components/features/dashboards/"
        echo "✅ Copied $component"
    fi
done

# Copy DentistDashboard from subdirectory
if [ -f "backup_20250608_184327/src/components/dentist/DentistDashboard.tsx" ]; then
    cp backup_20250608_184327/src/components/dentist/DentistDashboard.tsx apps/web/src/components/features/dashboards/
    echo "✅ Copied DentistDashboard.tsx"
fi

# Copy shared components
if [ -d "backup_20250608_184327/src/components/shared" ]; then
    cp -r backup_20250608_184327/src/components/shared/* apps/web/src/components/shared/ 2>/dev/null || true
    echo "✅ Copied shared components"
fi

# Copy hooks
if [ -d "backup_20250608_184327/src/hooks" ]; then
    cp -r backup_20250608_184327/src/hooks/* apps/web/src/hooks/ 2>/dev/null || true
    echo "✅ Copied hooks"
fi

# Copy lib files
if [ -d "backup_20250608_184327/src/lib" ]; then
    cp -r backup_20250608_184327/src/lib/* apps/web/src/lib/ 2>/dev/null || true
    echo "✅ Copied lib files"
fi

echo "🎉 Dashboard fix complete!"
echo "📝 Next: Update import paths and test at http://localhost:3000/dashboard"
FIX_EOF

chmod +x fix_dashboard.sh

echo -e "${GREEN}✅ Quick fix script created: ./fix_dashboard.sh${NC}"
echo "Run this script to automatically copy dashboard files from backup!"