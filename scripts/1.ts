// scripts/migrate-to-new-constants.ts
// Run this script to migrate your existing database to use the new constants

import { PrismaClient } from '@prisma/client';
import * as constants from '@dental/shared/constants';

const prisma = new PrismaClient();

/**
 * Maps old values to new constant values
 */
const MIGRATION_MAPPINGS = {
  // Case status mappings (from your current schema)
  caseStatus: {
    'PENDING_REVIEW': constants.CASE_STATUS.PENDING_REVIEW,
    'AWAITING_CONSENT': constants.CASE_STATUS.AWAITING_CONSENT,
    'IN_TREATMENT': constants.CASE_STATUS.IN_PRODUCTION, // Changed
    'MANUFACTURING': constants.CASE_STATUS.MANUFACTURING,
    'SHIPPED': constants.CASE_STATUS.SHIPPED,
    'COMPLETED': constants.CASE_STATUS.COMPLETED,
    'REJECTED': constants.CASE_STATUS.REJECTED,
  },
  
  // Sex options mappings
  sex: {
    'Male': constants.SEX_OPTIONS.MALE,
    'Female': constants.SEX_OPTIONS.FEMALE,
    'Prefer not to reply': constants.SEX_OPTIONS.PREFER_NOT_TO_SAY,
  },
  
  // Add more mappings as needed
};

async function migrateDatabase() {
  console.log('🚀 Starting database migration...\n');

  try {
    // 1. Migrate User sex values
    console.log('📝 Migrating User sex values...');
    for (const [oldValue, newValue] of Object.entries(MIGRATION_MAPPINGS.sex)) {
      const result = await prisma.user.updateMany({
        where: { sex: oldValue },
        data: { sex: newValue }
      });
      console.log(`  Updated ${result.count} users from sex="${oldValue}" to "${newValue}"`);
    }

    // 2. Migrate Case statuses
    console.log('\n📝 Migrating Case statuses...');
    for (const [oldStatus, newStatus] of Object.entries(MIGRATION_MAPPINGS.caseStatus)) {
      const result = await prisma.case.updateMany({
        where: { status: oldStatus },
        data: { status: newStatus }
      });
      console.log(`  Updated ${result.count} cases from status="${oldStatus}" to "${newStatus}"`);
    }

    // 3. Set default values for any null fields
    console.log('\n📝 Setting default values for null fields...');
    
    // Set default case priorities
    const casesWithNullPriority = await prisma.case.updateMany({
      where: { priority: null },
      data: { priority: constants.CASE_PRIORITY.NORMAL }
    });
    console.log(`  Set default priority for ${casesWithNullPriority.count} cases`);

    // Set default appointment types
    const appointmentsWithNullType = await prisma.appointment.updateMany({
      where: { type: null },
      data: { type: constants.APPOINTMENT_TYPE.FOLLOW_UP }
    });
    console.log(`  Set default type for ${appointmentsWithNullType.count} appointments`);

    // 4. Validate all data
    console.log('\n🔍 Validating migrated data...');
    const validationResults = await validateAllData();
    
    if (validationResults.errors.length > 0) {
      console.error('\n❌ Validation errors found:');
      validationResults.errors.forEach(error => {
        console.error(`  - ${error}`);
      });
    } else {
      console.log('✅ All data validated successfully!');
    }

    // 5. Generate migration report
    console.log('\n📊 Migration Report:');
    console.log('==================');
    const report = await generateMigrationReport();
    console.log(report);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Validates all data against constants
 */
async function validateAllData(): Promise<{ errors: string[] }> {
  const errors: string[] = [];

  // Validate Users
  const invalidUserRoles = await prisma.$queryRaw<Array<{role: string, count: bigint}>>`
    SELECT role, COUNT(*) as count 
    FROM "User" 
    WHERE role NOT IN (${Object.values(constants.USER_ROLES).join(',')})
    GROUP BY role
  `;
  
  invalidUserRoles.forEach(({ role, count }) => {
    errors.push(`${count} users have invalid role: "${role}"`);
  });

  // Validate Cases
  const invalidCaseStatuses = await prisma.$queryRaw<Array<{status: string, count: bigint}>>`
    SELECT status, COUNT(*) as count 
    FROM "Case" 
    WHERE status NOT IN (${Object.values(constants.CASE_STATUS).join(',')})
    GROUP BY status
  `;
  
  invalidCaseStatuses.forEach(({ status, count }) => {
    errors.push(`${count} cases have invalid status: "${status}"`);
  });

  // Add more validations as needed...

  return { errors };
}

/**
 * Generates a comprehensive migration report
 */
async function generateMigrationReport(): Promise<string> {
  const report: string[] = [];

  // User statistics
  const userStats = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
  });
  
  report.push('User Distribution by Role:');
  userStats.forEach(stat => {
    report.push(`  ${stat.role}: ${stat._count} users`);
  });

  // Case statistics
  const caseStats = await prisma.case.groupBy({
    by: ['status'],
    _count: true,
  });
  
  report.push('\nCase Distribution by Status:');
  caseStats.forEach(stat => {
    report.push(`  ${stat.status}: ${stat._count} cases`);
  });

  // Appointment statistics
  const appointmentStats = await prisma.appointment.groupBy({
    by: ['status'],
    _count: true,
  });
  
  report.push('\nAppointment Distribution by Status:');
  appointmentStats.forEach(stat => {
    report.push(`  ${stat.status}: ${stat._count} appointments`);
  });

  return report.join('\n');
}

/**
 * Dry run mode - shows what would be changed without making changes
 */
async function dryRun() {
  console.log('🔍 Running in DRY RUN mode - no changes will be made\n');

  // Show what would be migrated
  for (const [oldValue, newValue] of Object.entries(MIGRATION_MAPPINGS.sex)) {
    const count = await prisma.user.count({
      where: { sex: oldValue }
    });
    if (count > 0) {
      console.log(`Would update ${count} users from sex="${oldValue}" to "${newValue}"`);
    }
  }

  for (const [oldStatus, newStatus] of Object.entries(MIGRATION_MAPPINGS.caseStatus)) {
    const count = await prisma.case.count({
      where: { status: oldStatus }
    });
    if (count > 0) {
      console.log(`Would update ${count} cases from status="${oldStatus}" to "${newStatus}"`);
    }
  }

  await prisma.$disconnect();
}

// ===========================
// CLI INTERFACE
// ===========================

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
Database Migration Script for Constants

Usage:
  npm run migrate:constants [options]

Options:
  --dry-run    Show what would be changed without making changes
  --help, -h   Show this help message

Examples:
  npm run migrate:constants           # Run the migration
  npm run migrate:constants --dry-run # Preview changes without applying them
`);
  process.exit(0);
}

if (isDryRun) {
  dryRun();
} else {
  console.log('⚠️  This will modify your database. Make sure you have a backup!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  setTimeout(() => {
    migrateDatabase();
  }, 5000);
}