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
