# Import Map - Old vs New Structure

## Type Imports
| Old Import | New Import |
|------------|------------|
| `@/types/*` | `@dental/shared` |
| `@/types/case.types` | `@dental/shared` |
| `@/types/appointment.types` | `@dental/shared` |
| `../types` | `@dental/shared` |

## Component Imports
| Old Import | New Import |
|------------|------------|
| `@/components/shared/*` | `@dental/ui` |
| `@/components/shared/Modal` | `@dental/ui` |
| `@/components/shared/Toast` | `@dental/ui` |
| `../shared/Component` | `@dental/ui` |

## Dashboard Imports
| Old Import | New Import |
|------------|------------|
| `@/components/AdminDashboard` | `@/components/features/dashboards/AdminDashboard` |
| `@/components/dentist/DentistDashboard` | `@/components/features/dashboards/DentistDashboard` |
| `@/components/PatientDashboard` | `@/components/features/dashboards/PatientDashboard` |

## Feature Component Imports
| Old Import | New Import |
|------------|------------|
| `@/components/cases/*` | `@/components/features/cases/*` |
| `@/components/appointments/*` | `@/components/features/appointments/*` |
| `../cases/Component` | `@/components/features/cases/Component` |

## Utility Imports
| Old Import | New Import |
|------------|------------|
| `@/utils/*` | `@dental/shared` |
| `@/lib/constants` | `@dental/shared` |

## Service/API Imports
| Old Import | New Import |
|------------|------------|
| `fetch('/api/*')` | `legacyApi.*` or tRPC |
| `@/services/*` | Use cases in `@dental/core` |

## Hook Imports
| Old Import | New Import |
|------------|------------|
| `@/hooks/*` | `@/hooks/*` (stays the same) |
| `../hooks/*` | `@/hooks/*` |
