#!/bin/bash

# Phase 3: Setup Monorepo
# This script converts the project to a monorepo structure

set -e

source ./scripts/migration/utils.sh

print_phase_header "Phase 3: Setup Monorepo"

# Step 1: Install pnpm if not already installed
step_start "Setting up pnpm"

if ! command -v pnpm &> /dev/null; then
    print_warning "Installing pnpm..."
    npm install -g pnpm
fi

print_success "pnpm is ready"

# Step 2: Create monorepo root structure
step_start "Creating monorepo structure"

# Create root directories
mkdir -p apps/web
mkdir -p packages/{core,shared,ui,api}
mkdir -p services  # For future microservices
mkdir -p infrastructure/{docker,kubernetes,terraform}
mkdir -p docs/{architecture,api,guides,decisions}
mkdir -p tests/{e2e,integration,performance,security}
mkdir -p tools/{generators,migrations,scripts}

print_success "Created monorepo directory structure"

# Step 3: Initialize root package.json
step_start "Initializing monorepo root"

cat > package.json << 'EOF'
{
  "name": "dental-platform",
  "version": "1.0.0",
  "private": true,
  "description": "Future-proof dental platform monorepo",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "prepare": "husky install",
    "migration:run": "bash ./scripts/migration/migrate.sh",
    "docker:dev": "docker-compose -f infrastructure/docker/development/docker-compose.yml up",
    "docker:build": "docker-compose -f infrastructure/docker/production/docker-compose.yml build"
  },
  "devDependencies": {
    "@changesets/cli": "^2.26.2",
    "@types/node": "^20.10.0",
    "eslint": "^8.53.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.1.0",
    "prettier": "^3.1.0",
    "turbo": "^1.10.16",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.10.0",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
EOF

# Create pnpm workspace configuration
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
  - "services/*"
EOF

print_success "Initialized monorepo root"

# Step 4: Move current Next.js app to apps/web
step_start "Moving current app to monorepo structure"

# Create apps/web/src directory
mkdir -p apps/web/src

# Move app files
if [ -d "src/app" ]; then
    mv src/app apps/web/src/
fi

if [ -d "src/components" ]; then
    mv src/components apps/web/src/
fi

if [ -d "public" ]; then
    mv public apps/web/
fi

# Move configuration files
for file in next.config.ts next.config.js tsconfig.json tailwind.config.js postcss.config.js; do
    if [ -f "$file" ]; then
        mv "$file" apps/web/
    fi
done

# Create apps/web package.json
cat > apps/web/package.json << 'EOF'
{
  "name": "@dental/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@dental/core": "workspace:*",
    "@dental/shared": "workspace:*",
    "@dental/ui": "workspace:*",
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.8.0",
    "zustand": "^4.4.7",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.2",
    "axios": "^1.6.2",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.0"
  }
}
EOF

print_success "Moved Next.js app to apps/web"

# Step 5: Create core package
step_start "Setting up core package"

# Create core src directory
mkdir -p packages/core/src

# Move domain logic to core package if it exists
if [ -d "src-new/core" ]; then
    cp -r src-new/core/* packages/core/src/ 2>/dev/null || true
fi

# Create core package.json
cat > packages/core/package.json << 'EOF'
{
  "name": "@dental/core",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@dental/shared": "workspace:*",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.7",
    "@vitest/coverage-v8": "^1.0.4",
    "tsup": "^8.0.1",
    "vitest": "^1.0.4"
  },
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"
    }
  }
}
EOF

# Create tsup configuration for core
cat > packages/core/tsup.config.ts << 'EOF'
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  treeshake: true,
  external: ['@dental/shared'],
});
EOF

# Create core index file
cat > packages/core/src/index.ts << 'EOF'
// Core Package Exports

// Domain Entities
export * from './domain/entities/user/User';
export * from './domain/entities/case/Case';
export * from './domain/entities/patient/Patient';
export * from './domain/entities/appointment/Appointment';

// Value Objects
export * from './domain/value-objects/Email';
export * from './domain/value-objects/CaseNumber';
export * from './domain/value-objects/CaseStatus';
export * from './domain/value-objects/PatientNumber';

// Repository Interfaces
export * from './domain/repositories/IUserRepository';
export * from './domain/repositories/ICaseRepository';
export * from './domain/repositories/IPatientRepository';
export * from './domain/repositories/IAppointmentRepository';

// Use Cases
export * from './application/use-cases/case/CreateCaseUseCase';
export * from './application/use-cases/auth/LoginUseCase';

// Domain Events
export * from './domain/events/DomainEvent';
export * from './domain/events/CaseCreatedEvent';

// Shared
export * from './shared/Result';
EOF

print_success "Created core package"

# Step 6: Create shared package
step_start "Setting up shared package"

# Create shared src directory
mkdir -p packages/shared/src

# Move shared types if they exist
if [ -d "src-new/shared" ]; then
    cp -r src-new/shared/* packages/shared/src/ 2>/dev/null || true
fi

# Create shared package.json
cat > packages/shared/package.json << 'EOF'
{
  "name": "@dental/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.0.1",
    "typescript": "^5.3.0"
  },
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"
    }
  }
}
EOF

# Create shared tsup config
cat > packages/shared/tsup.config.ts << 'EOF'
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
});
EOF

# Create shared index
cat > packages/shared/src/index.ts << 'EOF'
// Shared Package Exports

export * from './types';
export * from './constants';
export * from './utils';
export * from './config';
EOF

print_success "Created shared package"

# Step 7: Create UI package
step_start "Setting up UI package"

mkdir -p packages/ui/src/{components,hooks,utils}

# Create UI package.json
cat > packages/ui/package.json << 'EOF'
{
  "name": "@dental/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "@dental/shared": "workspace:*",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@storybook/addon-essentials": "^7.6.3",
    "@storybook/addon-interactions": "^7.6.3",
    "@storybook/addon-links": "^7.6.3",
    "@storybook/react": "^7.6.3",
    "@storybook/react-vite": "^7.6.3",
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "storybook": "^7.6.3",
    "tsup": "^8.0.1",
    "typescript": "^5.3.0"
  },
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/styles.css"
  }
}
EOF

# Create sample UI component
cat > packages/ui/src/components/Button.tsx << 'EOF'
import React from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    fullWidth = false,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus-visible:ring-gray-600',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 focus-visible:ring-gray-600',
      ghost: 'hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-600',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
EOF

# Create UI utilities
cat > packages/ui/src/utils/cn.ts << 'EOF'
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF

# Create UI index
cat > packages/ui/src/index.ts << 'EOF'
// UI Package Exports

// Components
export * from './components/Button';

// Hooks
export * from './hooks';

// Utils
export * from './utils/cn';
EOF

print_success "Created UI package"

# Step 8: Create API package
step_start "Setting up API package"

mkdir -p packages/api/src/{http,websocket,validators,middleware}

# Create API package.json
cat > packages/api/package.json << 'EOF'
{
  "name": "@dental/api",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@dental/core": "workspace:*",
    "@dental/shared": "workspace:*",
    "@trpc/server": "^10.44.1",
    "superjson": "^2.2.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "tsup": "^8.0.1",
    "vitest": "^1.0.4"
  }
}
EOF

print_success "Created API package"

# Step 9: Setup Turborepo
step_start "Configuring Turborepo"

cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": ["NODE_ENV"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": [],
      "env": ["NODE_ENV"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
EOF

print_success "Configured Turborepo"

# Step 10: Create development Docker setup
step_start "Creating Docker development environment"

mkdir -p infrastructure/docker/development

cat > infrastructure/docker/development/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: dental_postgres
    environment:
      POSTGRES_USER: dental
      POSTGRES_PASSWORD: dental_dev_password
      POSTGRES_DB: dental_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dental"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: dental_redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: dental_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  mailhog:
    image: mailhog/mailhog:latest
    container_name: dental_mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  default:
    name: dental_network
EOF

print_success "Created Docker development environment"

# Step 11: Create root configuration files
step_start "Creating root configuration files"

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage
*.lcov
.nyc_output

# Next.js
.next/
out/
build

# Production
dist

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# Typescript
*.tsbuildinfo

# Turbo
.turbo

# IDE
.idea
.vscode
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Cache
.cache
.parcel-cache

# Temporary files
tmp
temp
EOF

# Create .prettierrc
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF

# Create root tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", "build", ".next", ".turbo"]
}
EOF

print_success "Created root configuration files"

# Step 12: Create migration utilities
step_start "Creating migration utilities"

cat > scripts/migration/utils.sh << 'EOF'
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
EOF

chmod +x scripts/migration/utils.sh

print_success "Created migration utilities"

# Step 13: Generate Phase 3 status report
step_start "Generating Phase 3 status report"

cat > migration_status_phase3.md << 'EOF'
# Phase 3 Migration Status

## Completed Tasks

### Monorepo Setup
- ✅ Installed and configured pnpm
- ✅ Created monorepo structure with Turborepo
- ✅ Configured workspace packages
- ✅ Set up build pipelines

### Package Structure
- ✅ Created @dental/core package (business logic)
- ✅ Created @dental/shared package (shared types/utils)
- ✅ Created @dental/ui package (component library)
- ✅ Created @dental/api package (API layer)
- ✅ Moved Next.js app to apps/web

### Development Environment
- ✅ Docker Compose for local development
- ✅ PostgreSQL database
- ✅ Redis for caching/sessions
- ✅ MinIO for S3-compatible storage
- ✅ MailHog for email testing

### Configuration
- ✅ TypeScript configuration
- ✅ Prettier formatting
- ✅ Git ignore patterns
- ✅ Turborepo pipelines

## Monorepo Structure

```
dental-platform/
├── apps/
│   └── web/                    # Next.js application
├── packages/
│   ├── core/                   # Business logic & domain
│   ├── shared/                 # Shared types & utilities
│   ├── ui/                     # Component library
│   └── api/                    # API layer
├── services/                   # Future microservices
├── infrastructure/
│   ├── docker/                 # Docker configurations
│   ├── kubernetes/             # K8s manifests
│   └── terraform/              # Infrastructure as Code
├── docs/                       # Documentation
├── tests/                      # Global test suites
└── tools/                      # Development tools
```

## Package Dependencies

```
@dental/web
  ├── @dental/core
  ├── @dental/shared
  └── @dental/ui

@dental/core
  └── @dental/shared

@dental/api
  ├── @dental/core
  └── @dental/shared

@dental/ui
  └── @dental/shared
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Type checking
pnpm type-check

# Start Docker services
pnpm docker:dev
```

## Next Steps

1. Install dependencies with `pnpm install`
2. Start Docker services for database
3. Run migrations to set up database schema
4. Begin implementing service layer
5. Connect frontend to new architecture

## Benefits Achieved

1. **Code Sharing**: Packages can be shared across apps
2. **Independent Versioning**: Each package has its own version
3. **Parallel Development**: Teams can work on different packages
4. **Build Optimization**: Turborepo caches and optimizes builds
5. **Type Safety**: Shared types across all packages
6. **Scalability**: Easy to add new apps or services
EOF

print_success "Generated Phase 3 status report"

print_phase_complete "Phase 3: Setup Monorepo"

echo
echo "Monorepo structure has been set up successfully!"
echo "Next steps:"
echo "1. Run 'pnpm install' to install dependencies"
echo "2. Run 'pnpm docker:dev' to start development services"
echo "3. Check migration_status_phase3.md for details"
echo "4. Run Phase 4 to implement the service layer"