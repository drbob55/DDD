// test-validation.ts
import { prisma } from './packages/core/src/infrastructure/prisma/client';
import { USER_ROLES, CASE_STATUS } from './packages/shared/src/constants';

async function testValidation() {
  console.log('Testing Prisma validation...\n');

  try {
    // Test 1: Valid user creation
    console.log('1. Creating user with valid role...');
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        role: USER_ROLES.DENTIST,
      }
    });
    console.log('✅ User created successfully\n');

    // Test 2: Invalid role (should fail)
    console.log('2. Testing invalid role validation...');
    try {
      await prisma.user.create({
        data: {
          email: `invalid-${Date.now()}@example.com`,
          firstName: 'Invalid',
          lastName: 'User',
          role: 'INVALID_ROLE',
        }
      });
      console.log('❌ Validation failed - invalid role was accepted!');
    } catch (error: any) {
      console.log('✅ Validation working:', error.message, '\n');
    }

    // Test 3: Create a case
    console.log('3. Creating case with valid status...');
    const newCase = await prisma.case.create({
      data: {
        caseNumber: `CASE-${Date.now()}`,
        patientId: user.id,
        dentistId: user.id,
        status: CASE_STATUS.NEW,
        priority: 'NORMAL',
        type: 'ALIGNER',
        description: 'Test case',
      }
    });
    console.log('✅ Case created successfully\n');

    // Test 4: Invalid status transition
    console.log('4. Testing invalid status transition...');
    try {
      await prisma.case.update({
        where: { id: newCase.id },
        data: { status: CASE_STATUS.COMPLETED } // Invalid: NEW -> COMPLETED
      });
      console.log('❌ Validation failed - invalid transition was accepted!');
    } catch (error: any) {
      console.log('✅ Transition validation working:', error.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testValidation();