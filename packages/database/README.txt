# @dental/database

Database infrastructure layer for the dental portal application using Domain-Driven Design principles and the Repository pattern.

## Features

- 🏗️ **Repository Pattern**: Clean abstraction over Prisma ORM
- 🎯 **Domain-Driven Design**: Encapsulates business logic in repositories
- 🔒 **Type Safety**: Full TypeScript support with interfaces
- 🧪 **Testable**: Easy to mock for unit testing
- 🚀 **Performance**: Built-in query optimization
- 🛡️ **Error Handling**: Custom error classes for different scenarios

## Installation

```bash
pnpm add @dental/database
```

## Usage

### Basic Usage

```typescript
import { repositoryFactory } from '@dental/database';

// Get a repository
const userRepo = repositoryFactory.createUserRepository();

// Find a user by email
const user = await userRepo.findByEmail('user@example.com');

// Create a new user
const newUser = await userRepo.create({
  email: 'new@example.com',
  username: 'newuser',
  firstName: 'John',
  lastName: 'Doe',
  role: 'PATIENT',
  password: 'hashed_password'
});
```

### Using in Next.js API Routes

```typescript
import { repositoryFactory, BusinessError, NotFoundError } from '@dental/database';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const caseRepo = repositoryFactory.createCaseRepository();
    const cases = await caseRepo.findActiveCases();
    
    return NextResponse.json({ cases });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (error instanceof BusinessError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
```

### Error Handling

The package provides custom error classes:

- `NotFoundError`: Entity not found
- `BusinessError`: Business rule violation
- `ValidationError`: Input validation error
- `UniqueConstraintError`: Unique constraint violation
- `TransactionError`: Transaction failed

### Available Repositories

#### UserRepository
- `findByEmail(email: string)`
- `findByUsername(username: string)`
- `verifyUser(userId: string)`
- `updateLastLogin(userId: string)`
- `lockUser(userId: string, until: Date)`

#### CaseRepository
- `findByCaseNumber(caseNumber: string)`
- `findByDentist(dentistId: string)`
- `findActiveCases()`
- `updateStatus(caseId: string, status: string)`
- `assignReviewer(caseId: string, reviewerId: string)`

#### AppointmentRepository
- `findUpcomingAppointments(userId: string, role: string)`
- `findConflictingAppointments(dentistId: string, start: Date, end: Date)`
- `confirmAppointment(appointmentId: string)`
- `cancelAppointment(appointmentId: string, reason: string)`
- `getAvailableSlots(dentistId: string, date: Date, duration: number)`

#### PaymentRepository
- `createPayment(data: PaymentData)`
- `processPayment(paymentId: string, transactionId: string)`
- `refundPayment(paymentId: string, amount: number, reason: string)`
- `getCaseBalance(caseId: string)`
- `getTotalRevenue(startDate?: Date, endDate?: Date)`

#### NotificationRepository
- `findUnread(userId: string)`
- `markAsRead(notificationId: string)`
- `markAllAsRead(userId: string)`
- `createBulkNotifications(notifications: NotificationData[])`

## Database Management

### Run Migrations

```bash
# Development
pnpm migrate

# Production
pnpm migrate:prod
```

### Generate Prisma Client

```bash
pnpm generate
```

### Open Prisma Studio

```bash
pnpm studio
```

### Seed Database

```bash
pnpm seed
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn()
      }
    };
    
    repository = new UserRepository();
    repository['prismaClient'] = mockPrisma;
  });

  it('should find user by email', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await repository.findByEmail('test@example.com');

    expect(result).toEqual(mockUser);
  });
});
```

## Architecture

```
packages/database/
├── src/
│   ├── index.ts                    # Main exports
│   ├── client.ts                   # Prisma client configuration
│   ├── errors.ts                   # Custom error classes
│   ├── repositories/
│   │   ├── base/                   # Base repository implementation
│   │   ├── user/                   # User repository
│   │   ├── case/                   # Case repository
│   │   ├── appointment/            # Appointment repository
│   │   ├── payment/                # Payment repository
│   │   └── notification/           # Notification repository
│   └── __tests__/                  # Test files
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Contributing

1. Follow the existing repository pattern
2. Add proper TypeScript interfaces
3. Include comprehensive tests
4. Update documentation

## License

ISC