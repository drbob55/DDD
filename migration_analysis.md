# Migration Analysis Report

## Current Project Structure

backup_20250608_184327
├── package.json
├── prisma
│   ├── migrations
│   │   ├── 20250521230715_init
│   │   │   └── migration.sql
│   │   ├── 20250521231608_add_email_confirmation
│   │   │   └── migration.sql
│   │   ├── 20250522004718_add_notifications
│   │   │   └── migration.sql
│   │   ├── 20250522015350_add_patientid
│   │   │   └── migration.sql
│   │   ├── 20250522050440_add_user_phone
│   │   │   └── migration.sql
│   │   ├── 20250531170156_add_relations
│   │   │   └── migration.sql
│   │   ├── 20250601071222_fix_relations
│   │   │   └── migration.sql
│   │   ├── 20250602183614_init
│   │   │   └── migration.sql
│   │   ├── 20250602220456_add_username_to_user
│   │   │   └── migration.sql
│   │   ├── 20250602220607_add_username_to_user
│   │   │   └── migration.sql
│   │   ├── 20250602233927_2
│   │   │   └── migration.sql
│   │   ├── 20250603160651_add_patient_id_to_case
│   │   │   └── migration.sql
│   │   ├── 20250603161014_add_patient_id_to_case
│   │   │   └── migration.sql
│   │   ├── 20250603161022_add_patient_id_to_case
│   │   │   └── migration.sql
│   │   ├── 20250603162550_add_hidden_by_dentist
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── prisma
│   │   └── dev.db
│   └── schema.prisma
└── src
    ├── app
    │   ├── api
    │   │   ├── admin
    │   │   │   └── stats
    │   │   │       ├── route
    │   │   │       └── setup
    │   │   │           └── route.ts
    │   │   ├── appointments
    │   │   │   ├── [appointmentId]
    │   │   │   │   ├── route.ts
    │   │   │   │   └── status
    │   │   │   │       └── route.ts
    │   │   │   └── route.ts
    │   │   ├── auth
    │   │   │   ├── [...nextauth]
    │   │   │   │   └── route.ts
    │   │   │   ├── complete-registration
    │   │   │   │   └── route.ts
    │   │   │   ├── login
    │   │   │   │   └── route.ts
    │   │   │   ├── register
    │   │   │   │   ├── route.ts
    │   │   │   │   └── route.ts.backup
    │   │   │   ├── verify
    │   │   │   │   └── route.ts
    │   │   │   └── verify-token
    │   │   │       └── route.ts
    │   │   ├── cases
    │   │   │   ├── [caseId]
    │   │   │   │   ├── activities
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── archive
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── assign.ts
    │   │   │   │   ├── consent
    │   │   │   │   │   └── route.tsx
    │   │   │   │   ├── edit.tsx
    │   │   │   │   ├── files
    │   │   │   │   │   ├── [fileId]
    │   │   │   │   │   │   └── route.ts
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── notes
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── payment-status
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── reassign-dentist
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── reassign-reviewer
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── review
    │   │   │   │   │   └── route.tsx
    │   │   │   │   ├── route.ts
    │   │   │   │   ├── ship
    │   │   │   │   │   └── route.tsx
    │   │   │   │   └── status
    │   │   │   │       └── route.ts
    │   │   │   └── route.ts
    │   │   ├── clinics
    │   │   │   ├── [clinicId]
    │   │   │   │   └── route.ts
    │   │   │   ├── [id].ts
    │   │   │   ├── index.ts
    │   │   │   └── route.ts
    │   │   ├── files
    │   │   │   ├── [...path]
    │   │   │   │   └── route.ts
    │   │   │   └── [filename]
    │   │   │       └── route.tsx
    │   │   ├── logs
    │   │   │   └── route.tsx
    │   │   ├── notifications
    │   │   │   └── route.tsx
    │   │   ├── payments
    │   │   │   ├── [id]
    │   │   │   │   ├── route.ts
    │   │   │   │   └── status
    │   │   │   │       └── route.ts
    │   │   │   ├── reports
    │   │   │   │   └── route.tsx
    │   │   │   └── route.tsx
    │   │   ├── register
    │   │   │   └── route.tsx
    │   │   ├── test-basic
    │   │   │   └── route.ts
    │   │   └── users
    │   │       ├── [id]
    │   │       │   ├── password
    │   │       │   │   └── route.ts
    │   │       │   ├── route.ts
    │   │       │   └── verify
    │   │       │       └── route.ts
    │   │       ├── exists
    │   │       │   └── route.ts
    │   │       ├── password
    │   │       │   └── route.ts
    │   │       ├── preferences
    │   │       │   └── route.ts
    │   │       ├── profile
    │   │       │   └── route.ts
    │   │       └── route.ts
    │   ├── dashboard
    │   │   └── page.tsx
    │   ├── favicon.png
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── login
    │   │   └── page.tsx
    │   ├── page.tsx
    │   └── register
    │       └── page.tsx
    ├── components
    │   ├── AdminDashboard.tsx
    │   ├── AppointmentScheduler.tsx
    │   ├── Appointments.tsx
    │   ├── AuthSessionProvider.tsx
    │   ├── EditCaseModal.tsx
    │   ├── LogsTable.tsx
    │   ├── ManufacturerDashboard.tsx
    │   ├── Navbar.tsx
    │   ├── PatientDashboard.tsx
    │   ├── PaymentsTable.tsx
    │   ├── PaymenyFormModal.tsx
    │   ├── ReviewerDashboard.tsx
    │   ├── admin
    │   │   ├── CaseTable.tsx
    │   │   ├── LogTable.tsx
    │   │   ├── NotificationSender.tsx
    │   │   ├── PaymentTable.tsx
    │   │   └── UserTable.tsx
    │   ├── appointments
    │   │   ├── AppointmentDetailsModal.tsx
    │   │   ├── AppointmentModal.tsx
    │   │   ├── AppointmentTimeline.tsx
    │   │   ├── Appointments.tsx
    │   │   ├── EnhancedAppointmentsView.tsx
    │   │   └── index.ts
    │   ├── cases
    │   │   ├── CaseDetails.tsx
    │   │   ├── CaseFilters.tsx
    │   │   ├── CaseList.tsx
    │   │   ├── CaseNotes.tsx
    │   │   ├── CaseTimeline.tsx
    │   │   ├── NewCaseModal.tsx
    │   │   ├── UploadAdditionalFilesModal.tsx
    │   │   └── index.ts
    │   ├── dentist
    │   │   └── DentistDashboard.tsx
    │   ├── layout
    │   │   └── Sidebar.tsx
    │   ├── modals
    │   │   └── AccountSettingsModal.tsx
    │   └── shared
    │       ├── ErrorBoundary.tsx
    │       ├── FilePreview.tsx
    │       ├── LoadingSkeleton.tsx
    │       ├── Modal.tsx
    │       ├── Pagination.tsx
    │       ├── ThreeDViewer.tsx
    │       ├── Toast.tsx
    │       ├── VirtualList.tsx
    │       └── index.ts
    ├── contexts
    │   └── DentistContext.tsx
    ├── hoc
    │   └── index.tsx
    ├── hooks
    │   ├── index.ts
    │   ├── useAsync.ts
    │   ├── useCaseActivities.ts
    │   ├── useDebounce.ts
    │   ├── useDentistData.ts
    │   ├── useForms.ts
    │   ├── useLocalStorage.ts
    │   ├── usePolling.ts
    │   ├── useTimezone.ts
    │   ├── useToast.ts
    │   └── useWebSocket.ts
    ├── lib
    │   ├── activity-logger.ts
    │   ├── auth.ts
    │   ├── constants.ts
    │   ├── fileUpload.ts
    │   └── prisma.ts
    ├── sevices
    │   ├── api.ts
    │   └── appointmentService.ts
    ├── types
    │   ├── activity.types.ts
    │   ├── appointment.types.ts
    │   ├── case.types.ts
    │   ├── clinic.ts
    │   ├── indexts
    │   ├── next-auth.d.ts
    │   └── three-extensions.d.ts
    └── utils
        ├── dateUtils.ts
        ├── fileUtils.ts
        └── validation.ts

88 directories, 149 files

## File Categories


### API Routes

- backup_20250608_184327/src/app/api/test-basic/route.ts
- backup_20250608_184327/src/app/api/payments/[id]/status/route.ts
- backup_20250608_184327/src/app/api/payments/[id]/route.ts
- backup_20250608_184327/src/app/api/appointments/route.ts
- backup_20250608_184327/src/app/api/appointments/[appointmentId]/status/route.ts
- backup_20250608_184327/src/app/api/appointments/[appointmentId]/route.ts
- backup_20250608_184327/src/app/api/auth/verify/route.ts
- backup_20250608_184327/src/app/api/auth/complete-registration/route.ts
- backup_20250608_184327/src/app/api/auth/verify-token/route.ts
- backup_20250608_184327/src/app/api/auth/register/route.ts
- backup_20250608_184327/src/app/api/auth/[...nextauth]/route.ts
- backup_20250608_184327/src/app/api/auth/login/route.ts
- backup_20250608_184327/src/app/api/admin/stats/setup/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/archive/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/reassign-dentist/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/payment-status/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/assign.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/reassign-reviewer/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/status/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/notes/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/files/[fileId]/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/files/route.ts
- backup_20250608_184327/src/app/api/cases/[caseId]/activities/route.ts
- backup_20250608_184327/src/app/api/cases/route.ts
- backup_20250608_184327/src/app/api/clinics/[clinicId]/route.ts
- backup_20250608_184327/src/app/api/clinics/[id].ts
- backup_20250608_184327/src/app/api/clinics/route.ts
- backup_20250608_184327/src/app/api/clinics/index.ts
- backup_20250608_184327/src/app/api/users/preferences/route.ts
- backup_20250608_184327/src/app/api/users/password/route.ts
- backup_20250608_184327/src/app/api/users/exists/route.ts
- backup_20250608_184327/src/app/api/users/profile/route.ts
- backup_20250608_184327/src/app/api/users/route.ts
- backup_20250608_184327/src/app/api/users/[id]/password/route.ts
- backup_20250608_184327/src/app/api/users/[id]/verify/route.ts
- backup_20250608_184327/src/app/api/users/[id]/route.ts
- backup_20250608_184327/src/app/api/files/[...path]/route.ts

### Components

- backup_20250608_184327/src/components/Navbar.tsx
- backup_20250608_184327/src/components/EditCaseModal.tsx
- backup_20250608_184327/src/components/appointments/AppointmentModal.tsx
- backup_20250608_184327/src/components/appointments/AppointmentTimeline.tsx
- backup_20250608_184327/src/components/appointments/EnhancedAppointmentsView.tsx
- backup_20250608_184327/src/components/appointments/AppointmentDetailsModal.tsx
- backup_20250608_184327/src/components/appointments/Appointments.tsx
- backup_20250608_184327/src/components/ManufacturerDashboard.tsx
- backup_20250608_184327/src/components/layout/Sidebar.tsx
- backup_20250608_184327/src/components/PatientDashboard.tsx
- backup_20250608_184327/src/components/admin/UserTable.tsx
- backup_20250608_184327/src/components/admin/NotificationSender.tsx
- backup_20250608_184327/src/components/admin/LogTable.tsx
- backup_20250608_184327/src/components/admin/CaseTable.tsx
- backup_20250608_184327/src/components/admin/PaymentTable.tsx
- backup_20250608_184327/src/components/cases/CaseFilters.tsx
- backup_20250608_184327/src/components/cases/CaseDetails.tsx
- backup_20250608_184327/src/components/cases/CaseList.tsx
- backup_20250608_184327/src/components/cases/UploadAdditionalFilesModal.tsx
- backup_20250608_184327/src/components/cases/CaseNotes.tsx
- backup_20250608_184327/src/components/cases/CaseTimeline.tsx
- backup_20250608_184327/src/components/cases/NewCaseModal.tsx
- backup_20250608_184327/src/components/modals/AccountSettingsModal.tsx
- backup_20250608_184327/src/components/PaymentsTable.tsx
- backup_20250608_184327/src/components/AppointmentScheduler.tsx
- backup_20250608_184327/src/components/shared/Pagination.tsx
- backup_20250608_184327/src/components/shared/FilePreview.tsx
- backup_20250608_184327/src/components/shared/VirtualList.tsx
- backup_20250608_184327/src/components/shared/LoadingSkeleton.tsx
- backup_20250608_184327/src/components/shared/ThreeDViewer.tsx
- backup_20250608_184327/src/components/shared/Modal.tsx
- backup_20250608_184327/src/components/shared/Toast.tsx
- backup_20250608_184327/src/components/shared/ErrorBoundary.tsx
- backup_20250608_184327/src/components/dentist/DentistDashboard.tsx
- backup_20250608_184327/src/components/LogsTable.tsx
- backup_20250608_184327/src/components/AuthSessionProvider.tsx
- backup_20250608_184327/src/components/ReviewerDashboard.tsx
- backup_20250608_184327/src/components/PaymenyFormModal.tsx
- backup_20250608_184327/src/components/AdminDashboard.tsx
- backup_20250608_184327/src/components/Appointments.tsx

### Services/Business Logic


### Database Files

- backup_20250608_184327/prisma/migrations/20250603160651_add_patient_id_to_case/migration.sql
- backup_20250608_184327/prisma/migrations/20250531170156_add_relations/migration.sql
- backup_20250608_184327/prisma/migrations/20250601071222_fix_relations/migration.sql
- backup_20250608_184327/prisma/migrations/20250522015350_add_patientid/migration.sql
- backup_20250608_184327/prisma/migrations/20250603161022_add_patient_id_to_case/migration.sql
- backup_20250608_184327/prisma/migrations/20250602220607_add_username_to_user/migration.sql
- backup_20250608_184327/prisma/migrations/20250603161014_add_patient_id_to_case/migration.sql
- backup_20250608_184327/prisma/migrations/20250521230715_init/migration.sql
- backup_20250608_184327/prisma/migrations/20250603162550_add_hidden_by_dentist/migration.sql
- backup_20250608_184327/prisma/migrations/20250602220456_add_username_to_user/migration.sql
- backup_20250608_184327/prisma/migrations/20250522050440_add_user_phone/migration.sql
- backup_20250608_184327/prisma/migrations/20250602183614_init/migration.sql
- backup_20250608_184327/prisma/migrations/20250521231608_add_email_confirmation/migration.sql
- backup_20250608_184327/prisma/migrations/20250602233927_2/migration.sql
- backup_20250608_184327/prisma/migrations/20250522004718_add_notifications/migration.sql
- backup_20250608_184327/prisma/schema.prisma

### Type Definitions

- backup_20250608_184327/src/types/case.types.ts
- backup_20250608_184327/src/types/next-auth.d.ts
- backup_20250608_184327/src/types/three-extensions.d.ts
- backup_20250608_184327/src/types/clinic.ts
- backup_20250608_184327/src/types/activity.types.ts
- backup_20250608_184327/src/types/indexts
- backup_20250608_184327/src/types/appointment.types.ts

### Configuration Files

- backup_20250608_184327/.env

## Migration Mapping

### Phase 1: Core Business Logic Migration

#### 1. API Routes → Use Cases + Controllers
```
Old: app/api/[route]/route.ts
New: 
  - packages/core/src/application/use-cases/[feature]/[UseCase].ts
  - packages/api/src/routers/[feature].router.ts
  - apps/web/src/app/api/trpc/[trpc]/route.ts
```

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

