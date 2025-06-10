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

