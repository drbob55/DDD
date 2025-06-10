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
