#!/usr/bin/env bash

# Project Structure Analysis and Migration Planning Script
# This script analyzes your current structure and creates a migration plan

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}Project Structure Analysis & Migration${NC}"
echo -e "${PURPLE}========================================${NC}"
echo

# Function to find the backup directory
find_backup_dir() {
    local backup_dir=$(ls -d backup_* 2>/dev/null | head -n 1)
    if [ -z "$backup_dir" ]; then
        echo -e "${RED}No backup directory found!${NC}"
        echo "Please specify the backup directory path:"
        read -r backup_dir
    fi
    echo "$backup_dir"
}

# Function to analyze directory structure
analyze_structure() {
    local dir=$1
    echo -e "${BLUE}Analyzing structure of: $dir${NC}"
    echo
    
    # Create detailed structure report
    cat > migration_analysis.md << 'EOF'
# Migration Analysis Report

## Current Project Structure

EOF
    
    # Get directory tree
    if command -v tree &> /dev/null; then
        tree -I 'node_modules|.git|.next|dist|build' "$dir" >> migration_analysis.md
    else
        find "$dir" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" | sort >> migration_analysis.md
    fi
    
    echo -e "\n## File Categories\n" >> migration_analysis.md
}

# Function to categorize files
categorize_files() {
    local backup_dir=$1
    
    echo -e "${CYAN}Categorizing files...${NC}"
    
    # API Routes
    echo -e "\n### API Routes\n" >> migration_analysis.md
    find "$backup_dir" -path "*/app/api/*" -name "*.ts" -o -name "*.js" 2>/dev/null | while read -r file; do
        echo "- $file" >> migration_analysis.md
    done
    
    # Components
    echo -e "\n### Components\n" >> migration_analysis.md
    find "$backup_dir" -path "*/components/*" -name "*.tsx" -o -name "*.jsx" 2>/dev/null | while read -r file; do
        echo "- $file" >> migration_analysis.md
    done
    
    # Services
    echo -e "\n### Services/Business Logic\n" >> migration_analysis.md
    find "$backup_dir" -path "*/services/*" -name "*.ts" -o -name "*.js" 2>/dev/null | while read -r file; do
        echo "- $file" >> migration_analysis.md
    done
    
    # Database/Prisma
    echo -e "\n### Database Files\n" >> migration_analysis.md
    find "$backup_dir" -path "*/prisma/*" -name "*.prisma" -o -name "*.sql" 2>/dev/null | while read -r file; do
        echo "- $file" >> migration_analysis.md
    done
    
    # Types
    echo -e "\n### Type Definitions\n" >> migration_analysis.md
    find "$backup_dir" -name "*.d.ts" -o -path "*/types/*" 2>/dev/null | while read -r file; do
        echo "- $file" >> migration_analysis.md
    done
    
    # Configuration
    echo -e "\n### Configuration Files\n" >> migration_analysis.md
    find "$backup_dir" -maxdepth 2 -name "*.config.*" -o -name ".*rc*" -o -name ".env*" 2>/dev/null | while read -r file; do
        echo "- $file" >> migration_analysis.md
    done
}

# Function to create migration mapping
create_migration_map() {
    local backup_dir=$1
    
    echo -e "${GREEN}Creating migration mapping...${NC}"
    
    cat >> migration_analysis.md << 'EOF'

## Migration Mapping

### Phase 1: Core Business Logic Migration

#### 1. API Routes → Use Cases + Controllers
EOF

    # Map API routes to new structure
    if [ -d "$backup_dir/src/app/api" ] || [ -d "$backup_dir/app/api" ]; then
        echo '```
Old: app/api/[route]/route.ts
New: 
  - packages/core/src/application/use-cases/[feature]/[UseCase].ts
  - packages/api/src/routers/[feature].router.ts
  - apps/web/src/app/api/trpc/[trpc]/route.ts
```' >> migration_analysis.md
    fi

    cat >> migration_analysis.md << 'EOF'

#### 2. Components → Feature-based Organization
```
Old: src/components/[Component].tsx
New: 
  - packages/ui/src/components/[Component].tsx (shared)
  - apps/web/src/components/features/[feature]/[Component].tsx (feature-specific)
```

#### 3. Services → Domain Services
```
Old: src/services/[service].ts
New: packages/core/src/domain/services/[Service].ts
```

#### 4. Types → Shared Types
```
Old: src/types/[type].ts
New: packages/shared/src/types/[type].types.ts
```

#### 5. Database → Infrastructure Layer
```
Old: prisma/schema.prisma
New: 
  - prisma/schema/ (modular schemas)
  - packages/core/src/infrastructure/persistence/
```

### Migration Priority Order

1. **Types & Interfaces** (No dependencies)
2. **Domain Entities & Value Objects** (Depends on types)
3. **Repository Interfaces** (Depends on entities)
4. **Use Cases** (Depends on repositories)
5. **API Routes** (Depends on use cases)
6. **UI Components** (Can be done in parallel)

EOF
}

# Function to create file mapping script
create_file_mapping() {
    local backup_dir=$1
    
    echo -e "${YELLOW}Creating automated file mapping script...${NC}"
    
    cat > migrate_files.sh << 'SCRIPT_EOF'
#!/usr/bin/env bash

# Automated File Migration Script
# This script helps move files from backup to new structure

set -e

BACKUP_DIR="$1"
if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

echo "Starting file migration from $BACKUP_DIR"

# Create directories if they don't exist
mkdir -p packages/shared/src/types
mkdir -p packages/core/src/{domain,application,infrastructure}
mkdir -p packages/ui/src/components
mkdir -p packages/api/src/routers
mkdir -p apps/web/src/components/features

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
        echo "✓ Copied: $src → $dest"
    fi
}

# Migrate Types
echo -e "\n📁 Migrating Types..."
if [ -d "$BACKUP_DIR/src/types" ]; then
    find "$BACKUP_DIR/src/types" -name "*.ts" -not -name "*.d.ts" | while read -r file; do
        filename=$(basename "$file")
        copy_file "$file" "packages/shared/src/types/${filename}"
    done
fi

# Migrate Services
echo -e "\n📁 Migrating Services..."
if [ -d "$BACKUP_DIR/src/services" ]; then
    find "$BACKUP_DIR/src/services" -name "*.ts" | while read -r file; do
        filename=$(basename "$file")
        # Services need to be refactored into use cases
        copy_file "$file" "packages/core/src/application/services/${filename}.todo"
    done
fi

# Migrate Components
echo -e "\n📁 Migrating Components..."
if [ -d "$BACKUP_DIR/src/components" ]; then
    # Identify shared vs feature components
    find "$BACKUP_DIR/src/components" -name "*.tsx" -o -name "*.jsx" | while read -r file; do
        filename=$(basename "$file")
        
        # Check if it's a UI component (Button, Card, etc.) or feature component
        if [[ "$filename" =~ ^(Button|Card|Input|Modal|Table|Form) ]]; then
            copy_file "$file" "packages/ui/src/components/${filename}"
        else
            # Feature component - need to determine which feature
            copy_file "$file" "apps/web/src/components/features/temp/${filename}"
        fi
    done
fi

# Migrate API Routes
echo -e "\n📁 Migrating API Routes..."
if [ -d "$BACKUP_DIR/src/app/api" ] || [ -d "$BACKUP_DIR/app/api" ]; then
    # These need significant refactoring
    mkdir -p migration_workspace/api_routes
    find "$BACKUP_DIR" -path "*/api/*" -name "route.ts" -o -name "route.js" | while read -r file; do
        # Extract route name from path
        route_path=$(echo "$file" | grep -o "api/.*" | sed 's/\/route\.[tj]s$//')
        route_name=$(echo "$route_path" | tr '/' '_')
        copy_file "$file" "migration_workspace/api_routes/${route_name}.todo"
    done
fi

# Migrate Prisma Schema
echo -e "\n📁 Migrating Database Schema..."
if [ -f "$BACKUP_DIR/prisma/schema.prisma" ]; then
    copy_file "$BACKUP_DIR/prisma/schema.prisma" "prisma/schema/base.prisma.todo"
fi

# Copy environment files
echo -e "\n📁 Copying Environment Files..."
if [ -f "$BACKUP_DIR/.env.local" ]; then
    copy_file "$BACKUP_DIR/.env.local" ".env.local"
fi

echo -e "\n✅ File migration complete!"
echo -e "\n📋 Next steps:"
echo "1. Review files marked with .todo extension"
echo "2. Refactor API routes into use cases"
echo "3. Split services into domain and application layers"
echo "4. Update import paths"
echo "5. Run 'pnpm install' to install dependencies"

SCRIPT_EOF

    chmod +x migrate_files.sh
}

# Function to create adaptation guide
create_adaptation_guide() {
    cat > ADAPTATION_GUIDE.md << 'GUIDE_EOF'
# Code Adaptation Guide

## 🚀 Migration Workflow

### Step 1: Environment Setup
```bash
# Install dependencies
pnpm install

# Start development services
pnpm docker:dev

# Run development server
pnpm dev
```

### Step 2: Type Migration (Start Here!)

1. **Move type definitions**:
   ```typescript
   // Old: src/types/user.ts
   export interface User {
     id: string;
     email: string;
   }
   
   // New: packages/shared/src/types/user.types.ts
   export interface UserDTO {
     id: string;
     email: string;
   }
   ```

2. **Update imports**:
   ```typescript
   // Old
   import { User } from '@/types/user';
   
   // New
   import { UserDTO } from '@dental/shared';
   ```

### Step 3: Domain Entity Creation

Transform your types into domain entities:

```typescript
// packages/core/src/domain/entities/user/User.ts
import { Entity } from '../Entity';
import { Email } from '../../value-objects/Email';

export class User extends Entity<UserProps> {
  // Business logic here
}
```

### Step 4: API Route Refactoring

Transform API routes into use cases:

#### Before (API Route):
```typescript
// app/api/cases/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  
  // Validation
  if (!data.patientId) {
    return NextResponse.json({ error: 'Patient required' }, { status: 400 });
  }
  
  // Business logic
  const case = await prisma.case.create({
    data: {
      ...data,
      caseNumber: generateCaseNumber(),
    }
  });
  
  // Send email
  await sendEmail(...);
  
  return NextResponse.json(case);
}
```

#### After (Use Case):
```typescript
// packages/core/src/application/use-cases/case/CreateCaseUseCase.ts
export class CreateCaseUseCase {
  async execute(request: CreateCaseRequest): Promise<Result<Case>> {
    // Validation in domain
    const caseResult = Case.create(request);
    if (caseResult.isFailure) {
      return Result.fail(caseResult.error);
    }
    
    // Save via repository
    await this.caseRepository.save(caseResult.value);
    
    // Publish event
    await this.eventBus.publish(new CaseCreatedEvent(...));
    
    return Result.ok(caseResult.value);
  }
}

// packages/api/src/routers/case.router.ts
caseRouter.create.mutation(async ({ ctx, input }) => {
  const result = await createCaseUseCase.execute(input);
  if (!result.success) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
  }
  return result.value;
});
```

### Step 5: Component Migration

1. **Shared UI Components** → `packages/ui/src/components/`
2. **Feature Components** → `apps/web/src/components/features/[feature]/`
3. **Update imports to use package names**

### Step 6: Service Layer Refactoring

Split services into:
- **Domain Services**: Business rules (packages/core/src/domain/services/)
- **Application Services**: Use case orchestration (packages/core/src/application/services/)
- **Infrastructure Services**: External integrations (packages/core/src/infrastructure/external/)

## 📝 Refactoring Checklist

- [ ] Move all types to packages/shared
- [ ] Create domain entities for core concepts
- [ ] Transform API routes to use cases
- [ ] Implement repository pattern for data access
- [ ] Move components to appropriate packages
- [ ] Update all import paths
- [ ] Add proper error handling with Result type
- [ ] Implement domain events
- [ ] Add caching layer
- [ ] Set up job queues for async operations

## 🔧 Common Patterns

### Repository Pattern
```typescript
// Instead of direct Prisma calls
const user = await prisma.user.findUnique({ where: { id } });

// Use repository
const user = await userRepository.findById(id);
```

### Error Handling
```typescript
// Instead of throwing errors
if (!user) throw new Error('User not found');

// Use Result type
if (!user) return Result.fail('User not found');
```

### Dependency Injection
```typescript
// Instead of importing directly
import { sendEmail } from '@/lib/email';

// Inject dependencies
constructor(private emailService: IEmailService) {}
```

## 🎯 Migration Priorities

1. **Week 1**: Types, Entities, Basic Use Cases
2. **Week 2**: API Migration, Repository Implementation
3. **Week 3**: Component Migration, UI Package
4. **Week 4**: Service Layer, Infrastructure
5. **Week 5**: Testing, Performance Optimization

GUIDE_EOF
}

# Main execution
main() {
    echo -e "${CYAN}Finding backup directory...${NC}"
    BACKUP_DIR=$(find_backup_dir)
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}Error: Directory $BACKUP_DIR does not exist${NC}"
        exit 1
    fi
    
    # Run analysis
    analyze_structure "$BACKUP_DIR"
    categorize_files "$BACKUP_DIR"
    create_migration_map "$BACKUP_DIR"
    create_file_mapping "$BACKUP_DIR"
    create_adaptation_guide
    
    echo
    echo -e "${GREEN}✅ Analysis Complete!${NC}"
    echo
    echo -e "${YELLOW}Generated files:${NC}"
    echo "  - migration_analysis.md    : Detailed structure analysis"
    echo "  - migrate_files.sh        : Automated file migration script"
    echo "  - ADAPTATION_GUIDE.md     : Step-by-step adaptation guide"
    echo
    echo -e "${CYAN}Next steps:${NC}"
    echo "1. Review migration_analysis.md for your project structure"
    echo "2. Run: ./migrate_files.sh $BACKUP_DIR"
    echo "3. Follow ADAPTATION_GUIDE.md for code refactoring"
    echo
}

# Run main function
main