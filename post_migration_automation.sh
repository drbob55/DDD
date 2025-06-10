#!/usr/bin/env bash

# Post-Migration Automation Script
# This script performs all the necessary tasks after file migration

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}Post-Migration Automation Script${NC}"
echo -e "${PURPLE}========================================${NC}"
echo

# ==========================================
# DAY 1: Types & Utils
# ==========================================
echo -e "${BLUE}Day 1: Setting up Types & Utils${NC}"

# Step 1: Create index files for types
echo -e "${YELLOW}Creating index files...${NC}"

# Create main types index
cat > packages/shared/src/types/index.ts << 'EOF'
// Shared Type Exports
export * from './case.types';
export * from './appointment.types';
export * from './activity.types';
export * from './clinic.types';
export * from './next-auth';

// Re-export common types
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
EOF

# Create utils index
cat > packages/shared/src/utils/index.ts << 'EOF'
// Shared Utils Exports
export * from './dateUtils';
export * from './fileUtils';
export * from './validation';
EOF

# Create constants index (if not exists)
if [ ! -f "packages/shared/src/constants/index.ts" ]; then
    echo "// Shared Constants" > packages/shared/src/constants/index.ts
fi

# Create main shared index
cat > packages/shared/src/index.ts << 'EOF'
// Shared Package Exports
export * from './types';
export * from './utils';
export * from './constants';
EOF

echo -e "${GREEN}✓${NC} Created index files for shared package"

# Step 2: Update type imports within type files
echo -e "${YELLOW}Updating imports in type files...${NC}"

# Function to update imports in a file
update_imports_in_file() {
    local file=$1
    if [ -f "$file" ]; then
        # Common import replacements
        sed -i.bak \
            -e "s|from '\.\./\.\./|from '@dental/shared|g" \
            -e "s|from '\.\./types|from '\.|g" \
            -e "s|from '@/types|from '\.|g" \
            -e "s|from '\.\./lib/|from '@dental/shared/|g" \
            "$file"
        rm -f "${file}.bak"
        echo -e "${GREEN}✓${NC} Updated imports in $(basename "$file")"
    fi
}

# Update imports in all type files
for file in packages/shared/src/types/*.ts; do
    update_imports_in_file "$file"
done

# ==========================================
# Package Configuration
# ==========================================
echo -e "${BLUE}Setting up package.json files${NC}"

# Create package.json for shared package
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

# Create tsup config for shared
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

# Create package.json for UI package
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
    "type-check": "tsc --noEmit"
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
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tsup": "^8.0.1",
    "typescript": "^5.3.0"
  }
}
EOF

# Create UI index file
cat > packages/ui/src/index.ts << 'EOF'
// UI Package Exports
export * from './components';
EOF

echo -e "${GREEN}✓${NC} Created package.json files"

# ==========================================
# DAY 2: Fix Component Imports
# ==========================================
echo -e "${BLUE}Day 2: Fixing component imports${NC}"

# Create a script to update imports in all components
cat > update_component_imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Import mappings
const importMappings = {
  // Shared components
  "@/components/shared/Modal": "@dental/ui",
  "@/components/shared/Toast": "@dental/ui",
  "@/components/shared/Pagination": "@dental/ui",
  "@/components/shared/LoadingSkeleton": "@dental/ui",
  "@/components/shared/FilePreview": "@dental/ui",
  "@/components/shared/ThreeDViewer": "@dental/ui",
  "@/components/shared/VirtualList": "@dental/ui",
  "@/components/shared/ErrorBoundary": "@dental/ui",
  
  // Types
  "@/types/case.types": "@dental/shared",
  "@/types/appointment.types": "@dental/shared",
  "@/types/activity.types": "@dental/shared",
  "@/types/clinic": "@dental/shared",
  "@/types": "@dental/shared",
  
  // Utils
  "@/utils/dateUtils": "@dental/shared",
  "@/utils/fileUtils": "@dental/shared",
  "@/utils/validation": "@dental/shared",
  "@/lib/constants": "@dental/shared",
};

function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const [oldImport, newImport] of Object.entries(importMappings)) {
    const regex = new RegExp(`from ['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, `from '${newImport}'`);
      modified = true;
    }
  }

  // Fix relative imports for shared components
  content = content.replace(/from ['"]\.\.\/shared\/(Modal|Toast|Pagination|LoadingSkeleton|FilePreview|ThreeDViewer|VirtualList|ErrorBoundary)['"]/g, "from '@dental/ui'");
  
  // Fix relative imports for types
  content = content.replace(/from ['"]\.\.\/\.\.\/types['"]/g, "from '@dental/shared'");

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated imports in ${path.basename(filePath)}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      updateImports(filePath);
    }
  });
}

// Process all component directories
const componentsToUpdate = [
  'packages/ui/src/components',
  'apps/web/src/components',
  'apps/web/src/hooks',
  'apps/web/src/lib',
  'apps/web/src/contexts'
];

componentsToUpdate.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Processing ${dir}...`);
    processDirectory(dir);
  }
});

console.log('Import updates complete!');
EOF

# Run the import update script
node update_component_imports.js
rm update_component_imports.js

echo -e "${GREEN}✓${NC} Updated all component imports"

# ==========================================
# DAY 3-4: Create Domain Entities
# ==========================================
echo -e "${BLUE}Day 3-4: Creating domain entities${NC}"

# Create base Entity class
mkdir -p packages/core/src/domain/entities
cat > packages/core/src/domain/entities/Entity.ts << 'EOF'
export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  constructor(props: T, id?: string) {
    this._id = id || this.generateId();
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public equals(object?: Entity<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    return this._id === object._id;
  }
}
EOF

# Create Result type
mkdir -p packages/core/src/shared
cat > packages/core/src/shared/Result.ts << 'EOF'
export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error: string | null;
  private _value: T;

  public constructor(isSuccess: boolean, error?: string | null, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error || null;
    this._value = value as T;

    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(`Can't get the value of an error result. Use 'errorValue' instead.`);
    }
    return this._value;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, null, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }
}
EOF

# Create value objects directory
mkdir -p packages/core/src/domain/value-objects

# Create ValueObject base
cat > packages/core/src/domain/value-objects/ValueObject.ts << 'EOF'
export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
EOF

# Create CaseNumber value object
cat > packages/core/src/domain/value-objects/CaseNumber.ts << 'EOF'
import { ValueObject } from './ValueObject';

interface CaseNumberProps {
  value: string;
}

export class CaseNumber extends ValueObject<CaseNumberProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: CaseNumberProps) {
    super(props);
  }

  public static generate(): CaseNumber {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return new CaseNumber({ value: `CASE-${timestamp}-${random}` });
  }

  public static create(value: string): CaseNumber {
    return new CaseNumber({ value });
  }
}
EOF

# Create CaseStatus value object
cat > packages/core/src/domain/value-objects/CaseStatus.ts << 'EOF'
import { ValueObject } from './ValueObject';

export enum CaseStatusEnum {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY_TO_SHIP = 'READY_TO_SHIP',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

interface CaseStatusProps {
  value: CaseStatusEnum;
}

export class CaseStatus extends ValueObject<CaseStatusProps> {
  private static validTransitions: Record<CaseStatusEnum, CaseStatusEnum[]> = {
    [CaseStatusEnum.NEW]: [CaseStatusEnum.IN_REVIEW, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.IN_REVIEW]: [CaseStatusEnum.APPROVED, CaseStatusEnum.REJECTED],
    [CaseStatusEnum.APPROVED]: [CaseStatusEnum.IN_PRODUCTION, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.REJECTED]: [CaseStatusEnum.IN_REVIEW, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.IN_PRODUCTION]: [CaseStatusEnum.READY_TO_SHIP, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.READY_TO_SHIP]: [CaseStatusEnum.SHIPPED],
    [CaseStatusEnum.SHIPPED]: [CaseStatusEnum.DELIVERED],
    [CaseStatusEnum.DELIVERED]: [CaseStatusEnum.COMPLETED],
    [CaseStatusEnum.COMPLETED]: [],
    [CaseStatusEnum.CANCELLED]: []
  };

  public static NEW = new CaseStatus({ value: CaseStatusEnum.NEW });
  public static IN_REVIEW = new CaseStatus({ value: CaseStatusEnum.IN_REVIEW });
  public static APPROVED = new CaseStatus({ value: CaseStatusEnum.APPROVED });
  public static IN_PRODUCTION = new CaseStatus({ value: CaseStatusEnum.IN_PRODUCTION });
  public static SHIPPED = new CaseStatus({ value: CaseStatusEnum.SHIPPED });
  public static COMPLETED = new CaseStatus({ value: CaseStatusEnum.COMPLETED });

  get value(): CaseStatusEnum {
    return this.props.value;
  }

  private constructor(props: CaseStatusProps) {
    super(props);
  }

  public canTransitionTo(status: CaseStatus): boolean {
    const allowedTransitions = CaseStatus.validTransitions[this.props.value];
    return allowedTransitions.includes(status.value);
  }

  public toString(): string {
    return this.props.value;
  }
}
EOF

echo -e "${GREEN}✓${NC} Created domain entity base classes and value objects"

# Create the Case entity based on the types
echo -e "${YELLOW}Creating Case entity...${NC}"

mkdir -p packages/core/src/domain/entities/case
cat > packages/core/src/domain/entities/case/Case.ts << 'EOF'
import { Entity } from '../Entity';
import { CaseNumber } from '../../value-objects/CaseNumber';
import { CaseStatus } from '../../value-objects/CaseStatus';
import { Result } from '../../../shared/Result';

export interface CaseProps {
  caseNumber: CaseNumber;
  patientId: string;
  dentistId: string;
  reviewerId?: string;
  type: string;
  status: CaseStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  description: string;
  hiddenByDentist: boolean;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCaseProps {
  patientId: string;
  dentistId: string;
  type: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  files?: any[];
}

export class Case extends Entity<CaseProps> {
  get caseNumber(): CaseNumber {
    return this.props.caseNumber;
  }

  get status(): CaseStatus {
    return this.props.status;
  }

  get patientId(): string {
    return this.props.patientId;
  }

  get dentistId(): string {
    return this.props.dentistId;
  }

  private constructor(props: CaseProps, id?: string) {
    super(props, id);
  }

  public static create(props: CreateCaseProps): Result<Case> {
    // Business rule: Description is required and must be at least 10 characters
    if (!props.description || props.description.trim().length < 10) {
      return Result.fail<Case>('Case description must be at least 10 characters');
    }

    // Business rule: Valid case types
    const validTypes = ['ALIGNER', 'BRACES', 'RETAINER', 'CONSULTATION'];
    if (!validTypes.includes(props.type)) {
      return Result.fail<Case>('Invalid case type');
    }

    const caseProps: CaseProps = {
      caseNumber: CaseNumber.generate(),
      patientId: props.patientId,
      dentistId: props.dentistId,
      type: props.type,
      status: CaseStatus.NEW,
      priority: props.priority || 'NORMAL',
      description: props.description,
      hiddenByDentist: false,
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Result.ok<Case>(new Case(caseProps));
  }

  public updateStatus(newStatus: CaseStatus): Result<void> {
    if (!this.props.status.canTransitionTo(newStatus)) {
      return Result.fail<void>(`Cannot transition from ${this.props.status.toString()} to ${newStatus.toString()}`);
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public assignReviewer(reviewerId: string): Result<void> {
    if (this.props.status.value !== 'NEW') {
      return Result.fail<void>('Can only assign reviewer to new cases');
    }

    this.props.reviewerId = reviewerId;
    this.props.status = CaseStatus.IN_REVIEW;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public archive(): void {
    this.props.hiddenByDentist = true;
    this.props.updatedAt = new Date();
  }

  public updatePaymentStatus(status: 'PENDING' | 'PARTIAL' | 'PAID'): void {
    this.props.paymentStatus = status;
    this.props.updatedAt = new Date();
  }
}
EOF

echo -e "${GREEN}✓${NC} Created Case entity"

# ==========================================
# DAY 5: Create First Use Case
# ==========================================
echo -e "${BLUE}Day 5: Creating use cases${NC}"

# Create use case base interface
mkdir -p packages/core/src/application/use-cases
cat > packages/core/src/application/use-cases/UseCase.ts << 'EOF'
export interface UseCase<IRequest, IResponse> {
  execute(request: IRequest): Promise<IResponse> | IResponse;
}
EOF

# Create repository interfaces
mkdir -p packages/core/src/domain/repositories
cat > packages/core/src/domain/repositories/IUserRepository.ts << 'EOF'
export interface IUserRepository {
  findById(id: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
  save(user: any): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}
EOF

cat > packages/core/src/domain/repositories/ICaseRepository.ts << 'EOF'
import { Case } from '../entities/case/Case';
import { CaseNumber } from '../value-objects/CaseNumber';
import { CaseStatus } from '../value-objects/CaseStatus';

export interface ICaseRepository {
  findById(id: string): Promise<Case | null>;
  findByCaseNumber(caseNumber: CaseNumber): Promise<Case | null>;
  findByDentist(dentistId: string): Promise<Case[]>;
  findByPatient(patientId: string): Promise<Case[]>;
  save(case: Case): Promise<void>;
  delete(id: string): Promise<void>;
}
EOF

# Create Login Use Case
mkdir -p packages/core/src/application/use-cases/auth
cat > packages/core/src/application/use-cases/auth/LoginUseCase.ts << 'EOF'
import { UseCase } from '../UseCase';
import { Result } from '../../../shared/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    token: string;
  };
  error?: string;
}

export class LoginUseCase implements UseCase<LoginRequest, LoginResponse> {
  constructor(
    private userRepository: IUserRepository,
    private authService: any // Will be properly typed later
  ) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Verify password
      const passwordValid = await this.authService.verifyPassword(
        request.password,
        user.password
      );

      if (!passwordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Generate token
      const token = await this.authService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          token
        }
      };
    } catch (error) {
      console.error('LoginUseCase error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }
}
EOF

echo -e "${GREEN}✓${NC} Created LoginUseCase"

# Create CreateCase Use Case
mkdir -p packages/core/src/application/use-cases/case
cat > packages/core/src/application/use-cases/case/CreateCaseUseCase.ts << 'EOF'
import { UseCase } from '../UseCase';
import { Result } from '../../../shared/Result';
import { Case } from '../../../domain/entities/case/Case';
import { ICaseRepository } from '../../../domain/repositories/ICaseRepository';

export interface CreateCaseRequest {
  patientId: string;
  dentistId: string;
  type: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  files?: any[];
}

export interface CreateCaseResponse {
  success: boolean;
  data?: {
    id: string;
    caseNumber: string;
  };
  error?: string;
}

export class CreateCaseUseCase implements UseCase<CreateCaseRequest, CreateCaseResponse> {
  constructor(
    private caseRepository: ICaseRepository,
    private fileService: any,
    private activityLogger: any
  ) {}

  async execute(request: CreateCaseRequest): Promise<CreateCaseResponse> {
    try {
      // Create case entity
      const caseResult = Case.create({
        patientId: request.patientId,
        dentistId: request.dentistId,
        type: request.type,
        description: request.description,
        priority: request.priority,
        files: request.files
      });

      if (caseResult.isFailure) {
        return {
          success: false,
          error: caseResult.error
        };
      }

      const newCase = caseResult.getValue();

      // Save to repository
      await this.caseRepository.save(newCase);

      // Process files if any
      if (request.files && request.files.length > 0) {
        await this.fileService.processCaseFiles(newCase.id, request.files);
      }

      // Log activity
      await this.activityLogger.log({
        type: 'CASE_CREATED',
        caseId: newCase.id,
        userId: request.dentistId,
        description: `Case ${newCase.caseNumber.value} created`
      });

      return {
        success: true,
        data: {
          id: newCase.id,
          caseNumber: newCase.caseNumber.value
        }
      };
    } catch (error) {
      console.error('CreateCaseUseCase error:', error);
      return {
        success: false,
        error: 'Failed to create case'
      };
    }
  }
}
EOF

echo -e "${GREEN}✓${NC} Created CreateCaseUseCase"

# Create package.json for core
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
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@dental/shared": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.1",
    "typescript": "^5.3.0",
    "vitest": "^1.0.4"
  }
}
EOF

# Create core index file
cat > packages/core/src/index.ts << 'EOF'
// Core Package Exports

// Domain Entities
export * from './domain/entities/Entity';
export * from './domain/entities/case/Case';

// Value Objects
export * from './domain/value-objects/ValueObject';
export * from './domain/value-objects/CaseNumber';
export * from './domain/value-objects/CaseStatus';

// Repositories
export * from './domain/repositories/IUserRepository';
export * from './domain/repositories/ICaseRepository';

// Use Cases
export * from './application/use-cases/UseCase';
export * from './application/use-cases/auth/LoginUseCase';
export * from './application/use-cases/case/CreateCaseUseCase';

// Shared
export * from './shared/Result';
EOF

echo -e "${GREEN}✓${NC} Created core package configuration"

# ==========================================
# Fix services directory typo
# ==========================================
echo -e "${BLUE}Fixing services directory...${NC}"

if [ -d "migration_workspace/services" ]; then
    mkdir -p packages/core/src/application/services
    cp migration_workspace/services/* packages/core/src/application/services/ 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Moved services to application layer"
fi

# ==========================================
# Create tsconfig files
# ==========================================
echo -e "${BLUE}Creating TypeScript configurations...${NC}"

# Create tsconfig for each package
for pkg in shared core ui; do
    cat > packages/$pkg/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
EOF
done

echo -e "${GREEN}✓${NC} Created TypeScript configurations"

# ==========================================
# Create API package structure
# ==========================================
echo -e "${BLUE}Setting up API package...${NC}"

mkdir -p packages/api/src/{routers,context,middleware}

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
    "typescript": "^5.3.0"
  }
}
EOF

# Create tRPC context
cat > packages/api/src/context.ts << 'EOF'
import { inferAsyncReturnType } from '@trpc/server';

export interface CreateContextOptions {
  session: any | null;
}

export async function createContext({ session }: CreateContextOptions) {
  return {
    session,
    // Add your repositories and services here
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
EOF

# Create tRPC router setup
cat > packages/api/src/index.ts << 'EOF'
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new Error('Unauthorized');
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Export everything needed
export * from './context';
export * from './routers';
EOF

echo -e "${GREEN}✓${NC} Created API package structure"

# ==========================================
# Final Summary
# ==========================================
echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Post-Migration Automation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${YELLOW}What was done:${NC}"
echo "✓ Created index files for all packages"
echo "✓ Updated imports in type files"
echo "✓ Set up package.json for all packages"
echo "✓ Fixed component imports across the project"
echo "✓ Created domain entities (Entity, Case)"
echo "✓ Created value objects (CaseNumber, CaseStatus)"
echo "✓ Created use cases (Login, CreateCase)"
echo "✓ Set up repository interfaces"
echo "✓ Fixed services directory"
echo "✓ Created TypeScript configurations"
echo "✓ Set up API package with tRPC"
echo
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Run 'pnpm install' to install dependencies"
echo "2. Run 'pnpm build' to build all packages"
echo "3. Start implementing remaining use cases"
echo "4. Connect your API routes to the use cases"
echo "5. Update your database schema to match the domain model"
echo
echo -e "${PURPLE}Ready to start development! 🚀${NC}"