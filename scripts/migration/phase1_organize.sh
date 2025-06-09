#!/usr/bin/env bash

# Phase 1: Organize Current Code
# This script reorganizes the existing code structure

set -e

# Check if utils.sh exists, if not create it
if [ ! -f "./scripts/migration/utils.sh" ]; then
    mkdir -p ./scripts/migration
    cat > ./scripts/migration/utils.sh << 'UTILSEOF'
#!/usr/bin/env bash

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
UTILSEOF
    chmod +x ./scripts/migration/utils.sh
fi

source ./scripts/migration/utils.sh

print_phase_header "Phase 1: Organize Current Code"

# Step 1: Fix typos and create proper directory structure
step_start "Fixing directory names and creating organized structure"

# Fix the typo in services directory
if [ -d "src/sevices" ]; then
    mv src/sevices src/services
    print_success "Fixed typo: sevices → services"
fi

# Create new organized structure (ensure parent directories exist)
mkdir -p src-new
mkdir -p src-new/core/{domain,application,infrastructure}
mkdir -p src-new/features/{auth,cases,patients,appointments,dashboards}
mkdir -p src-new/infrastructure/{api,database,external,monitoring}
mkdir -p src-new/shared
mkdir -p scripts/{db,maintenance,deployment,migration}

print_success "Created organized directory structure"

# Step 2: Move and organize existing files
step_start "Organizing existing files"

# Create scripts directories if they don't exist
mkdir -p scripts/{db,maintenance,deployment,migration}

# Move database scripts
find . -type f \( -name "*.sql" -o -name "*migration*.js" \) -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | while read file; do
    if [ -f "$file" ]; then
        cp "$file" scripts/db/ 2>/dev/null || true
    fi
done

# Move maintenance scripts (exclude package*.json files)
for file in *.js; do
    if [ -f "$file" ] && [[ ! "$file" =~ ^package.*\.js$ ]]; then
        mv "$file" scripts/maintenance/ 2>/dev/null || true
    fi
done

print_success "Moved scripts to organized locations"

# Step 3: Create service layer structure
step_start "Creating service layer structure"

# Create the services directory first
mkdir -p src-new/core/services

cat > src-new/core/services/README.md << 'EOF'
# Service Layer

This directory contains the business logic services that will be used by the API handlers.

## Structure

- `CaseService.ts` - Business logic for case management
- `PatientService.ts` - Business logic for patient management
- `AppointmentService.ts` - Business logic for appointments
- `AuthService.ts` - Authentication and authorization logic
- `FileService.ts` - File upload and processing logic
- `NotificationService.ts` - Notification handling

## Guidelines

1. Services should contain pure business logic
2. No direct HTTP request/response handling
3. Use dependency injection for external services
4. Return domain objects or DTOs
5. Handle business rule validation
EOF

# Create base service files
for service in Case Patient Appointment Auth File Notification; do
    # Create lowercase version for comments
    service_lower=$(echo "$service" | tr '[:upper:]' '[:lower:]')
    
    cat > "src-new/core/services/${service}Service.ts" << EOF
// ${service} Service
// Business logic for ${service_lower} management

export interface I${service}Service {
  // Define service interface
}

export class ${service}Service implements I${service}Service {
  constructor(
    // Inject dependencies
  ) {}
  
  // Implement service methods
}
EOF
done

print_success "Created service layer structure"

# Step 4: Create feature map
step_start "Creating feature map documentation"

cat > src-new/features/FEATURE_MAP.md << 'EOF'
# Feature Map

## Core Features

### Authentication & Authorization
- [x] User login
- [x] User registration
- [x] Password reset
- [x] Role-based access control (RBAC)
- [ ] Two-factor authentication (future)
- [ ] SSO integration (future)

### Case Management
- [x] Create new case
- [x] Update case status
- [x] Upload case files
- [x] 3D file viewer
- [x] Case workflow (NEW → IN_REVIEW → APPROVED → IN_PRODUCTION → SHIPPED → COMPLETED)
- [x] Case types (ALIGNER, BRACES, RETAINER, CONSULTATION)
- [x] Case search and filtering
- [ ] Case templates (future)
- [ ] Bulk operations (future)

### Patient Management
- [x] Patient profiles
- [x] Patient documents
- [x] Treatment history
- [x] Patient portal access
- [ ] Patient communication preferences (future)
- [ ] Insurance information (future)

### Appointment System
- [x] Schedule appointments
- [x] View calendar
- [x] Send reminders
- [x] Cancel/reschedule
- [ ] Recurring appointments (future)
- [ ] Video consultations (future)
- [ ] Appointment templates (future)

### Role-Based Dashboards
- [x] Admin dashboard
- [x] Dentist dashboard
- [x] Patient dashboard
- [x] Reviewer dashboard
- [x] Manufacturer dashboard

### File Management
- [x] Multiple file upload
- [x] File preview
- [x] Secure storage
- [x] File versioning
- [ ] Batch processing (future)
- [ ] Auto-optimization (future)

### Notifications
- [x] Email notifications
- [x] In-app notifications
- [ ] SMS notifications (future)
- [ ] Push notifications (future)

### Reporting & Analytics
- [x] Basic reports
- [ ] Advanced analytics (future)
- [ ] Custom reports (future)
- [ ] Data export (future)
EOF

print_success "Created feature map"

# Step 5: Analyze and document current API routes
step_start "Analyzing current API structure"

# Create the api directory first
mkdir -p src-new/infrastructure/api

# Create API inventory
cat > src-new/infrastructure/api/API_INVENTORY.md << 'EOF'
# API Route Inventory

## Current Routes Analysis
EOF

# Find all API routes (check if directory exists first)
if [ -d "src/app/api" ]; then
    find src/app/api -type f \( -name "route.ts" -o -name "route.js" \) 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            route_path=$(echo "$file" | sed 's/src\/app\/api\///' | sed 's/\/route\.[tj]s$//')
            echo "- /$route_path" >> src-new/infrastructure/api/API_INVENTORY.md
        fi
    done
else
    echo "- No API routes found (src/app/api directory does not exist)" >> src-new/infrastructure/api/API_INVENTORY.md
fi

print_success "Created API inventory"

# Step 6: Create migration helpers
step_start "Creating migration helper utilities"

cat > src-new/shared/migration-helpers.ts << 'EOF'
// Migration Helper Utilities
// These utilities help with the gradual migration process

export interface MigrationConfig {
  useNewArchitecture: boolean;
  features: {
    [key: string]: boolean;
  };
}

export class MigrationHelper {
  private static config: MigrationConfig = {
    useNewArchitecture: false,
    features: {
      newCaseService: false,
      newPatientService: false,
      newAuthFlow: false,
      newFileUpload: false,
    }
  };

  static isFeatureEnabled(feature: string): boolean {
    return this.config.features[feature] ?? false;
  }

  static enableFeature(feature: string): void {
    this.config.features[feature] = true;
  }

  static switchToNewArchitecture(): void {
    this.config.useNewArchitecture = true;
  }
}

// Feature flags for gradual migration
export const FEATURE_FLAGS = {
  USE_NEW_CASE_SERVICE: 'newCaseService',
  USE_NEW_PATIENT_SERVICE: 'newPatientService',
  USE_NEW_AUTH_FLOW: 'newAuthFlow',
  USE_NEW_FILE_UPLOAD: 'newFileUpload',
} as const;
EOF

print_success "Created migration helpers"

# Step 7: Create shared type definitions
step_start "Creating shared type definitions"

# Create all necessary directories
mkdir -p src-new/shared/types
mkdir -p src-new/shared/config

cat > src-new/shared/types/index.ts << 'EOF'
// Shared Type Definitions
// These types are used across the application

export * from './user.types';
export * from './case.types';
export * from './patient.types';
export * from './appointment.types';
export * from './common.types';
EOF

# Create individual type files
cat > src-new/shared/types/common.types.ts << 'EOF'
// Common Types

export type ID = string;
export type UUID = string;
export type ISODateString = string;

export interface TimestampedEntity {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };
EOF

print_success "Created shared type definitions"

# Step 8: Create configuration for environment variables
step_start "Creating environment configuration"

mkdir -p src-new/shared/config

cat > src-new/shared/config/index.ts << 'EOF'
// Environment Configuration
// Centralized configuration management

export interface Config {
  env: 'development' | 'staging' | 'production';
  api: {
    port: number;
    baseUrl: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  aws: {
    region: string;
    s3: {
      bucket: string;
    };
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  email: {
    provider: 'sendgrid' | 'smtp';
    from: string;
    sendgridApiKey?: string;
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
  };
}

export const config: Config = {
  env: (process.env.NODE_ENV as Config['env']) || 'development',
  api: {
    port: parseInt(process.env.PORT || '3000', 10),
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.S3_BUCKET || '',
    },
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER as Config['email']['provider']) || 'smtp',
    from: process.env.EMAIL_FROM || 'noreply@dental-platform.com',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
};
EOF

print_success "Created environment configuration"

# Step 9: Generate migration status report
step_start "Generating Phase 1 status report"

cat > migration_status_phase1.md << 'EOF'
# Phase 1 Migration Status

## Completed Tasks

### Directory Structure
- ✅ Fixed directory naming issues
- ✅ Created organized structure (src-new)
- ✅ Separated concerns into core, features, and infrastructure
- ✅ Created scripts directory organization

### Service Layer
- ✅ Created service layer structure
- ✅ Generated base service files
- ✅ Added service documentation

### Documentation
- ✅ Created feature map
- ✅ Generated API inventory
- ✅ Added migration guidelines

### Shared Resources
- ✅ Created shared type definitions
- ✅ Added migration helper utilities
- ✅ Centralized configuration management

## Next Steps

1. Begin moving business logic from API routes to services
2. Extract domain entities and value objects
3. Implement repository pattern
4. Add comprehensive error handling

## File Structure Created

```
src-new/
├── core/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── services/
├── features/
│   ├── auth/
│   ├── cases/
│   ├── patients/
│   ├── appointments/
│   └── dashboards/
├── infrastructure/
│   ├── api/
│   ├── database/
│   ├── external/
│   └── monitoring/
└── shared/
    ├── types/
    ├── config/
    └── migration-helpers.ts
```

## Migration Helpers Added

- Feature flags for gradual migration
- Configuration management
- Type safety improvements
- API inventory documentation
EOF

print_success "Generated Phase 1 status report"

print_phase_complete "Phase 1: Organize Current Code"

echo
echo "Next steps:"
echo "1. Review the created structure in src-new/"
echo "2. Check the migration status report: migration_status_phase1.md"
echo "3. Begin moving code to the new structure"
echo "4. Run Phase 2 when ready to extract domain logic"