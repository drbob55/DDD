#!/usr/bin/env bash

# Automated File Migration Script for Dental Platform
# This script migrates files from your backup to the new monorepo structure

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if backup directory is provided
BACKUP_DIR="${1:-backup_20250608_184327}"

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}Error: Backup directory '$BACKUP_DIR' not found!${NC}"
    echo "Usage: $0 [backup_directory]"
    exit 1
fi

echo -e "${BLUE}Starting migration from: $BACKUP_DIR${NC}"
echo

# Function to copy with backup
copy_file() {
    local src=$1
    local dest=$2
    
    if [ -f "$src" ]; then
        # Create destination directory
        mkdir -p "$(dirname "$dest")"
        
        # Backup if destination exists
        if [ -f "$dest" ]; then
            mv "$dest" "${dest}.backup"
        fi
        
        cp "$src" "$dest"
        echo -e "${GREEN}✓${NC} Copied: $(basename "$src") → $dest"
    else
        echo -e "${YELLOW}⚠${NC} Not found: $src"
    fi
}

# Function to create directory safely
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}✓${NC} Created directory: $1"
    fi
}

# ==========================================
# PHASE 1: Create Directory Structure
# ==========================================
echo -e "${BLUE}Phase 1: Creating directory structure...${NC}"

# Shared package directories
create_dir "packages/shared/src/types"
create_dir "packages/shared/src/constants"
create_dir "packages/shared/src/utils"

# Core package directories
create_dir "packages/core/src/domain/entities/user"
create_dir "packages/core/src/domain/entities/case"
create_dir "packages/core/src/domain/entities/patient"
create_dir "packages/core/src/domain/entities/appointment"
create_dir "packages/core/src/domain/entities/payment"
create_dir "packages/core/src/domain/value-objects"
create_dir "packages/core/src/domain/repositories"
create_dir "packages/core/src/domain/services"
create_dir "packages/core/src/domain/events"
create_dir "packages/core/src/application/use-cases/auth"
create_dir "packages/core/src/application/use-cases/case"
create_dir "packages/core/src/application/use-cases/appointment"
create_dir "packages/core/src/application/use-cases/payment"
create_dir "packages/core/src/application/services"
create_dir "packages/core/src/infrastructure/persistence"
create_dir "packages/core/src/infrastructure/external"

# UI package directories
create_dir "packages/ui/src/components"
create_dir "packages/ui/src/hooks"
create_dir "packages/ui/src/utils"

# API package directories
create_dir "packages/api/src/routers"
create_dir "packages/api/src/middleware"
create_dir "packages/api/src/validators"

# Web app directories
create_dir "apps/web/src/components/features/dashboards"
create_dir "apps/web/src/components/features/cases"
create_dir "apps/web/src/components/features/appointments"
create_dir "apps/web/src/components/features/payments"
create_dir "apps/web/src/components/features/admin"
create_dir "apps/web/src/components/layout"
create_dir "apps/web/src/hooks"
create_dir "apps/web/src/lib"
create_dir "apps/web/src/contexts"

# Prisma modular schemas
create_dir "prisma/schema"

# Migration workspace for files that need refactoring
create_dir "migration_workspace/api_routes"
create_dir "migration_workspace/services"
create_dir "migration_workspace/components_to_refactor"

echo

# ==========================================
# PHASE 2: Migrate Types & Constants
# ==========================================
echo -e "${BLUE}Phase 2: Migrating types and constants...${NC}"

# Types
copy_file "$BACKUP_DIR/src/types/case.types.ts" "packages/shared/src/types/case.types.ts"
copy_file "$BACKUP_DIR/src/types/appointment.types.ts" "packages/shared/src/types/appointment.types.ts"
copy_file "$BACKUP_DIR/src/types/activity.types.ts" "packages/shared/src/types/activity.types.ts"
copy_file "$BACKUP_DIR/src/types/clinic.ts" "packages/shared/src/types/clinic.types.ts"
copy_file "$BACKUP_DIR/src/types/next-auth.d.ts" "packages/shared/src/types/next-auth.d.ts"
copy_file "$BACKUP_DIR/src/types/three-extensions.d.ts" "packages/shared/src/types/three-extensions.d.ts"

# Constants
copy_file "$BACKUP_DIR/src/lib/constants.ts" "packages/shared/src/constants/index.ts"

# Utils
copy_file "$BACKUP_DIR/src/utils/dateUtils.ts" "packages/shared/src/utils/dateUtils.ts"
copy_file "$BACKUP_DIR/src/utils/fileUtils.ts" "packages/shared/src/utils/fileUtils.ts"
copy_file "$BACKUP_DIR/src/utils/validation.ts" "packages/shared/src/utils/validation.ts"

echo

# ==========================================
# PHASE 3: Migrate Shared UI Components
# ==========================================
echo -e "${BLUE}Phase 3: Migrating shared UI components...${NC}"

# Shared components that belong in UI package
copy_file "$BACKUP_DIR/src/components/shared/Modal.tsx" "packages/ui/src/components/Modal.tsx"
copy_file "$BACKUP_DIR/src/components/shared/Toast.tsx" "packages/ui/src/components/Toast.tsx"
copy_file "$BACKUP_DIR/src/components/shared/Pagination.tsx" "packages/ui/src/components/Pagination.tsx"
copy_file "$BACKUP_DIR/src/components/shared/LoadingSkeleton.tsx" "packages/ui/src/components/LoadingSkeleton.tsx"
copy_file "$BACKUP_DIR/src/components/shared/FilePreview.tsx" "packages/ui/src/components/FilePreview.tsx"
copy_file "$BACKUP_DIR/src/components/shared/ThreeDViewer.tsx" "packages/ui/src/components/ThreeDViewer.tsx"
copy_file "$BACKUP_DIR/src/components/shared/VirtualList.tsx" "packages/ui/src/components/VirtualList.tsx"
copy_file "$BACKUP_DIR/src/components/shared/ErrorBoundary.tsx" "packages/ui/src/components/ErrorBoundary.tsx"

# Create index file for UI components
cat > packages/ui/src/components/index.ts << 'EOF'
export * from './Modal';
export * from './Toast';
export * from './Pagination';
export * from './LoadingSkeleton';
export * from './FilePreview';
export * from './ThreeDViewer';
export * from './VirtualList';
export * from './ErrorBoundary';
EOF

echo

# ==========================================
# PHASE 4: Migrate Feature Components
# ==========================================
echo -e "${BLUE}Phase 4: Migrating feature-specific components...${NC}"

# Dashboard components
copy_file "$BACKUP_DIR/src/components/AdminDashboard.tsx" "apps/web/src/components/features/dashboards/AdminDashboard.tsx"
copy_file "$BACKUP_DIR/src/components/dentist/DentistDashboard.tsx" "apps/web/src/components/features/dashboards/DentistDashboard.tsx"
copy_file "$BACKUP_DIR/src/components/PatientDashboard.tsx" "apps/web/src/components/features/dashboards/PatientDashboard.tsx"
copy_file "$BACKUP_DIR/src/components/ReviewerDashboard.tsx" "apps/web/src/components/features/dashboards/ReviewerDashboard.tsx"
copy_file "$BACKUP_DIR/src/components/ManufacturerDashboard.tsx" "apps/web/src/components/features/dashboards/ManufacturerDashboard.tsx"

# Case components
copy_file "$BACKUP_DIR/src/components/cases/CaseList.tsx" "apps/web/src/components/features/cases/CaseList.tsx"
copy_file "$BACKUP_DIR/src/components/cases/CaseDetails.tsx" "apps/web/src/components/features/cases/CaseDetails.tsx"
copy_file "$BACKUP_DIR/src/components/cases/CaseFilters.tsx" "apps/web/src/components/features/cases/CaseFilters.tsx"
copy_file "$BACKUP_DIR/src/components/cases/CaseNotes.tsx" "apps/web/src/components/features/cases/CaseNotes.tsx"
copy_file "$BACKUP_DIR/src/components/cases/CaseTimeline.tsx" "apps/web/src/components/features/cases/CaseTimeline.tsx"
copy_file "$BACKUP_DIR/src/components/cases/NewCaseModal.tsx" "apps/web/src/components/features/cases/NewCaseModal.tsx"
copy_file "$BACKUP_DIR/src/components/cases/UploadAdditionalFilesModal.tsx" "apps/web/src/components/features/cases/UploadAdditionalFilesModal.tsx"

# Appointment components
copy_file "$BACKUP_DIR/src/components/appointments/Appointments.tsx" "apps/web/src/components/features/appointments/Appointments.tsx"
copy_file "$BACKUP_DIR/src/components/appointments/AppointmentModal.tsx" "apps/web/src/components/features/appointments/AppointmentModal.tsx"
copy_file "$BACKUP_DIR/src/components/appointments/AppointmentDetailsModal.tsx" "apps/web/src/components/features/appointments/AppointmentDetailsModal.tsx"
copy_file "$BACKUP_DIR/src/components/appointments/AppointmentTimeline.tsx" "apps/web/src/components/features/appointments/AppointmentTimeline.tsx"
copy_file "$BACKUP_DIR/src/components/appointments/EnhancedAppointmentsView.tsx" "apps/web/src/components/features/appointments/EnhancedAppointmentsView.tsx"

# Admin components
copy_file "$BACKUP_DIR/src/components/admin/UserTable.tsx" "apps/web/src/components/features/admin/UserTable.tsx"
copy_file "$BACKUP_DIR/src/components/admin/CaseTable.tsx" "apps/web/src/components/features/admin/CaseTable.tsx"
copy_file "$BACKUP_DIR/src/components/admin/PaymentTable.tsx" "apps/web/src/components/features/admin/PaymentTable.tsx"
copy_file "$BACKUP_DIR/src/components/admin/LogTable.tsx" "apps/web/src/components/features/admin/LogTable.tsx"
copy_file "$BACKUP_DIR/src/components/admin/NotificationSender.tsx" "apps/web/src/components/features/admin/NotificationSender.tsx"

# Layout components
copy_file "$BACKUP_DIR/src/components/layout/Sidebar.tsx" "apps/web/src/components/layout/Sidebar.tsx"
copy_file "$BACKUP_DIR/src/components/Navbar.tsx" "apps/web/src/components/layout/Navbar.tsx"

# Other components
copy_file "$BACKUP_DIR/src/components/AuthSessionProvider.tsx" "apps/web/src/components/AuthSessionProvider.tsx"
copy_file "$BACKUP_DIR/src/components/EditCaseModal.tsx" "apps/web/src/components/features/cases/EditCaseModal.tsx"
copy_file "$BACKUP_DIR/src/components/modals/AccountSettingsModal.tsx" "apps/web/src/components/features/AccountSettingsModal.tsx"

echo

# ==========================================
# PHASE 5: Migrate Hooks
# ==========================================
echo -e "${BLUE}Phase 5: Migrating hooks...${NC}"

# Copy hooks to web app
copy_file "$BACKUP_DIR/src/hooks/useAsync.ts" "apps/web/src/hooks/useAsync.ts"
copy_file "$BACKUP_DIR/src/hooks/useCaseActivities.ts" "apps/web/src/hooks/useCaseActivities.ts"
copy_file "$BACKUP_DIR/src/hooks/useDebounce.ts" "apps/web/src/hooks/useDebounce.ts"
copy_file "$BACKUP_DIR/src/hooks/useDentistData.ts" "apps/web/src/hooks/useDentistData.ts"
copy_file "$BACKUP_DIR/src/hooks/useForms.ts" "apps/web/src/hooks/useForms.ts"
copy_file "$BACKUP_DIR/src/hooks/useLocalStorage.ts" "apps/web/src/hooks/useLocalStorage.ts"
copy_file "$BACKUP_DIR/src/hooks/usePolling.ts" "apps/web/src/hooks/usePolling.ts"
copy_file "$BACKUP_DIR/src/hooks/useTimezone.ts" "apps/web/src/hooks/useTimezone.ts"
copy_file "$BACKUP_DIR/src/hooks/useToast.ts" "apps/web/src/hooks/useToast.ts"
copy_file "$BACKUP_DIR/src/hooks/useWebSocket.ts" "apps/web/src/hooks/useWebSocket.ts"

echo

# ==========================================
# PHASE 6: Migrate Contexts & Lib
# ==========================================
echo -e "${BLUE}Phase 6: Migrating contexts and lib files...${NC}"

# Contexts
copy_file "$BACKUP_DIR/src/contexts/DentistContext.tsx" "apps/web/src/contexts/DentistContext.tsx"

# Lib files
copy_file "$BACKUP_DIR/src/lib/auth.ts" "apps/web/src/lib/auth.ts"
copy_file "$BACKUP_DIR/src/lib/prisma.ts" "apps/web/src/lib/prisma.ts"
copy_file "$BACKUP_DIR/src/lib/fileUpload.ts" "apps/web/src/lib/fileUpload.ts"
copy_file "$BACKUP_DIR/src/lib/activity-logger.ts" "apps/web/src/lib/activity-logger.ts"

echo

# ==========================================
# PHASE 7: Copy API Routes for Refactoring
# ==========================================
echo -e "${BLUE}Phase 7: Copying API routes to migration workspace...${NC}"

# Create a mapping file for API routes
cat > migration_workspace/api_routes/API_ROUTES_MAP.md << 'EOF'
# API Routes Migration Map

## Auth Routes
- auth/login → LoginUseCase
- auth/register → RegisterUseCase
- auth/verify → VerifyEmailUseCase
- auth/complete-registration → CompleteRegistrationUseCase

## Case Routes
- cases (POST) → CreateCaseUseCase
- cases (GET) → ListCasesUseCase
- cases/[id] (PUT) → UpdateCaseUseCase
- cases/[id]/status → UpdateCaseStatusUseCase
- cases/[id]/archive → ArchiveCaseUseCase
- cases/[id]/reassign-reviewer → AssignReviewerUseCase
- cases/[id]/files → UploadCaseFilesUseCase

## Appointment Routes
- appointments (POST) → ScheduleAppointmentUseCase
- appointments (GET) → ListAppointmentsUseCase
- appointments/[id]/status → UpdateAppointmentStatusUseCase

## Payment Routes
- payments (POST) → CreatePaymentUseCase
- payments/[id]/status → UpdatePaymentStatusUseCase
EOF

# Copy API routes for reference
find "$BACKUP_DIR/src/app/api" -name "route.ts" -o -name "route.tsx" | while read -r file; do
    # Extract relative path
    rel_path=$(echo "$file" | sed "s|$BACKUP_DIR/src/app/api/||")
    # Replace slashes with underscores for flat structure
    filename=$(echo "$rel_path" | tr '/' '_')
    copy_file "$file" "migration_workspace/api_routes/$filename"
done

echo

# ==========================================
# PHASE 8: Copy Services for Refactoring
# ==========================================
echo -e "${BLUE}Phase 8: Copying services...${NC}"

# Note the typo in the original directory name
if [ -d "$BACKUP_DIR/src/sevices" ]; then
    copy_file "$BACKUP_DIR/src/sevices/api.ts" "migration_workspace/services/api.ts"
    copy_file "$BACKUP_DIR/src/sevices/appointmentService.ts" "migration_workspace/services/appointmentService.ts"
fi

echo

# ==========================================
# PHASE 9: Copy Database Schema
# ==========================================
echo -e "${BLUE}Phase 9: Copying database schema...${NC}"

copy_file "$BACKUP_DIR/prisma/schema.prisma" "prisma/schema/original.prisma.backup"

# Copy environment file
if [ -f "$BACKUP_DIR/.env" ]; then
    copy_file "$BACKUP_DIR/.env" ".env.example"
    echo -e "${YELLOW}⚠${NC} Copied .env to .env.example - Remember to create .env.local"
fi

echo

# ==========================================
# PHASE 10: Create Migration TODO List
# ==========================================
echo -e "${BLUE}Creating migration TODO list...${NC}"

cat > MIGRATION_TODO.md << 'EOF'
# Migration TODO List

## ✅ Completed
- [x] Types migrated to packages/shared
- [x] Utils migrated to packages/shared
- [x] UI components migrated to packages/ui
- [x] Feature components migrated to apps/web
- [x] Hooks migrated to apps/web
- [x] Contexts and lib files copied

## 🔄 In Progress

### 1. Update Imports (High Priority)
- [ ] Update type imports to use @dental/shared
- [ ] Update UI component imports to use @dental/ui
- [ ] Fix relative import paths

### 2. Create Domain Entities
- [ ] User entity with authentication logic
- [ ] Case entity with status transitions
- [ ] Patient entity
- [ ] Appointment entity with scheduling rules
- [ ] Payment entity with status management

### 3. Implement Use Cases
- [ ] Authentication use cases (login, register, verify)
- [ ] Case management use cases
- [ ] Appointment scheduling use cases
- [ ] Payment processing use cases

### 4. Create Repositories
- [ ] UserRepository with Prisma implementation
- [ ] CaseRepository with caching
- [ ] AppointmentRepository
- [ ] PaymentRepository

### 5. Setup tRPC
- [ ] Create routers for each domain
- [ ] Migrate API routes to tRPC procedures
- [ ] Setup authentication middleware

### 6. Refactor Services
- [ ] ActivityLogger → Domain service with events
- [ ] AppointmentService → Use cases
- [ ] FileUpload → Application service

### 7. Database Migration
- [ ] Split schema.prisma into modular schemas
- [ ] Update relations for new structure
- [ ] Create seed data

### 8. Testing
- [ ] Unit tests for domain entities
- [ ] Integration tests for use cases
- [ ] E2E tests for critical flows

## 📝 Notes
- API routes are in migration_workspace/api_routes/ for reference
- Original services are in migration_workspace/services/
- Remember to update all imports after moving files
- Start with types and work your way up to API routes
EOF

echo -e "${GREEN}✅ Migration completed successfully!${NC}"
echo
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Review MIGRATION_TODO.md for the complete task list"
echo "2. Update imports in the migrated files:"
echo "   - Change '@/types' to '@dental/shared'"
echo "   - Change '@/components/shared' to '@dental/ui'"
echo "3. Install dependencies: pnpm install"
echo "4. Start with updating type imports (lowest risk)"
echo "5. Create domain entities based on your types"
echo
echo -e "${BLUE}Files have been organized in the new structure.${NC}"
echo -e "${YELLOW}API routes and services are in migration_workspace/ for refactoring.${NC}"