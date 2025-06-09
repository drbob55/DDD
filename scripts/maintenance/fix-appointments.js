// fix-appointments.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAppointments() {
  try {
    // Get all appointments with their case data
    const appointments = await prisma.appointment.findMany({
      include: {
        case: {
          include: {
            patient: true
          }
        }
      }
    });
    
    console.log(`Found ${appointments.length} appointments to fix\n`);
    
    for (const appointment of appointments) {
      if (!appointment.patientId && appointment.case) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            patientId: appointment.case.patient.id,
            patientName: appointment.case.patient.name
          }
        });
        console.log(`✅ Fixed appointment ${appointment.id}`);
      }
    }
    
    console.log('\n✅ All appointments fixed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAppointments();