// packages/database/src/__tests__/repositories.test.ts
/**
 * Basic test to verify repository pattern implementation
 * Run with: npm test or pnpm test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  db,
  repositoryFactory,
  IUserRepository,
  ICaseRepository,
  IAppointmentRepository,
  IPaymentRepository,
  INotificationRepository,
  BusinessError,
  NotFoundError
} from '../index';

describe('Repository Pattern Tests', () => {
  let userRepo: IUserRepository;
  let caseRepo: ICaseRepository;
  let appointmentRepo: IAppointmentRepository;
  let paymentRepo: IPaymentRepository;
  let notificationRepo: INotificationRepository;

  beforeAll(async () => {
    // Initialize repositories
    userRepo = repositoryFactory.createUserRepository();
    caseRepo = repositoryFactory.createCaseRepository();
    appointmentRepo = repositoryFactory.createAppointmentRepository();
    paymentRepo = repositoryFactory.createPaymentRepository();
    notificationRepo = repositoryFactory.createNotificationRepository();

    // Ensure database connection
    await db.connect();
  });

  afterAll(async () => {
    // Clean up
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear test data if in test environment
    if (process.env.NODE_ENV === 'test') {
      await db.clearDatabase();
    }
  });

  describe('UserRepository', () => {
    it('should create and find a user', async () => {
      // Create a user
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'PATIENT' as const,
        isActive: true,
        isVerified: false
      };

      const user = await userRepo.create(userData);
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);

      // Find by email
      const foundUser = await userRepo.findByEmail(userData.email);
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(user.id);

      // Find by ID
      const userById = await userRepo.findById(user.id);
      expect(userById).toBeDefined();
      expect(userById?.email).toBe(userData.email);
    });

    it('should handle user not found', async () => {
      const user = await userRepo.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should verify a user', async () => {
      const user = await userRepo.create({
        email: 'verify@example.com',
        username: 'verifyuser',
        password: 'hashedpassword',
        firstName: 'Verify',
        lastName: 'User',
        role: 'PATIENT',
        isActive: true,
        isVerified: false
      });

      const verifiedUser = await userRepo.verifyUser(user.id);
      expect(verifiedUser.isVerified).toBe(true);
    });
  });

  describe('CaseRepository', () => {
    let dentistId: string;
    let patientId: string;

    beforeEach(async () => {
      // Create test users
      const dentist = await userRepo.create({
        email: 'dentist@example.com',
        username: 'dentist',
        password: 'hashedpassword',
        firstName: 'Dr',
        lastName: 'Dentist',
        role: 'DENTIST',
        isActive: true,
        isVerified: true
      });
      dentistId = dentist.id;

      const patient = await userRepo.create({
        email: 'patient@example.com',
        username: 'patient',
        password: 'hashedpassword',
        firstName: 'Patient',
        lastName: 'Name',
        role: 'PATIENT',
        isActive: true,
        isVerified: true
      });
      patientId = patient.id;
    });

    it('should create and find a case', async () => {
      const caseData = {
        caseNumber: 'CASE-2024-001',
        dentistId,
        patientId,
        patientName: 'Patient Name',
        type: 'CROWN',
        status: 'NEW' as const,
        priority: 'NORMAL' as const,
        description: 'Test case',
        toothNumber: '14',
        shade: 'A2',
        totalAmount: 500
      };

      const createdCase = await caseRepo.create(caseData);
      expect(createdCase.id).toBeDefined();
      expect(createdCase.caseNumber).toBe(caseData.caseNumber);

      // Find by case number
      const foundCase = await caseRepo.findByCaseNumber(caseData.caseNumber);
      expect(foundCase).toBeDefined();
      expect(foundCase?.id).toBe(createdCase.id);

      // Find by dentist
      const dentistCases = await caseRepo.findByDentist(dentistId);
      expect(dentistCases).toHaveLength(1);
      expect(dentistCases[0].id).toBe(createdCase.id);
    });

    it('should update case status', async () => {
      const caseData = await caseRepo.create({
        caseNumber: 'CASE-2024-002',
        dentistId,
        patientId,
        patientName: 'Patient Name',
        type: 'CROWN',
        status: 'NEW',
        priority: 'NORMAL',
        totalAmount: 500
      });

      const updatedCase = await caseRepo.updateStatus(caseData.id, 'IN_PROGRESS');
      expect(updatedCase.status).toBe('IN_PROGRESS');
    });

    it('should throw error when assigning reviewer to non-existent case', async () => {
      await expect(
        caseRepo.assignReviewer('non-existent-id', 'reviewer-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('AppointmentRepository', () => {
    let dentistId: string;
    let patientId: string;
    let caseId: string;

    beforeEach(async () => {
      // Create test data
      const dentist = await userRepo.create({
        email: 'appt-dentist@example.com',
        username: 'apptdentist',
        password: 'hashedpassword',
        firstName: 'Dr',
        lastName: 'Appointment',
        role: 'DENTIST',
        isActive: true,
        isVerified: true
      });
      dentistId = dentist.id;

      const patient = await userRepo.create({
        email: 'appt-patient@example.com',
        username: 'apptpatient',
        password: 'hashedpassword',
        firstName: 'Appointment',
        lastName: 'Patient',
        role: 'PATIENT',
        isActive: true,
        isVerified: true
      });
      patientId = patient.id;

      const testCase = await caseRepo.create({
        caseNumber: 'CASE-APPT-001',
        dentistId,
        patientId,
        patientName: 'Appointment Patient',
        type: 'CROWN',
        status: 'NEW',
        priority: 'NORMAL',
        totalAmount: 500
      });
      caseId = testCase.id;
    });

    it('should create and find appointments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(11, 0, 0, 0);

      const appointment = await appointmentRepo.create({
        caseId,
        patientId,
        dentistId,
        type: 'CONSULTATION',
        status: 'SCHEDULED',
        scheduledAt: tomorrow,
        scheduledEndTime: endTime,
        duration: 60,
        notes: 'Initial consultation'
      });

      expect(appointment.id).toBeDefined();

      // Find by patient
      const patientAppointments = await appointmentRepo.findByPatient(patientId);
      expect(patientAppointments).toHaveLength(1);
      expect(patientAppointments[0].id).toBe(appointment.id);

      // Check availability
      const isAvailable = await appointmentRepo.isDentistAvailable(
        dentistId,
        tomorrow,
        endTime
      );
      expect(isAvailable).toBe(false);
    });

    it('should handle appointment cancellation', async () => {
      const appointment = await appointmentRepo.create({
        caseId,
        patientId,
        dentistId,
        type: 'CONSULTATION',
        status: 'SCHEDULED',
        scheduledAt: new Date(),
        scheduledEndTime: new Date(),
        duration: 60
      });

      const cancelled = await appointmentRepo.cancelAppointment(
        appointment.id,
        'Patient requested cancellation'
      );
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellationReason).toBe('Patient requested cancellation');
    });
  });

  describe('PaymentRepository', () => {
    let userId: string;
    let caseId: string;

    beforeEach(async () => {
      const user = await userRepo.create({
        email: 'payment-user@example.com',
        username: 'paymentuser',
        password: 'hashedpassword',
        firstName: 'Payment',
        lastName: 'User',
        role: 'PATIENT',
        isActive: true,
        isVerified: true
      });
      userId = user.id;

      const testCase = await caseRepo.create({
        caseNumber: 'CASE-PAY-001',
        dentistId: userId,
        patientId: userId,
        patientName: 'Payment User',
        type: 'CROWN',
        status: 'NEW',
        priority: 'NORMAL',
        totalAmount: 1000
      });
      caseId = testCase.id;
    });

    it('should create and process payments', async () => {
      const payment = await paymentRepo.createPayment({
        caseId,
        userId,
        amount: 500,
        currency: 'USD',
        method: 'CREDIT_CARD',
        description: 'Initial payment'
      });

      expect(payment.status).toBe('PENDING');

      // Process payment
      const processed = await paymentRepo.processPayment(
        payment.id,
        'txn_123456'
      );
      expect(processed.status).toBe('COMPLETED');
      expect(processed.transactionId).toBe('txn_123456');

      // Get case balance
      const balance = await paymentRepo.getCaseBalance(caseId);
      expect(balance.paid).toBe(500);
      expect(balance.balance).toBe(500);
    });

    it('should handle payment failures', async () => {
      const payment = await paymentRepo.createPayment({
        caseId,
        userId,
        amount: 100,
        currency: 'USD',
        method: 'CREDIT_CARD'
      });

      const failed = await paymentRepo.markAsFailed(
        payment.id,
        'Insufficient funds'
      );
      expect(failed.status).toBe('FAILED');
      expect(failed.failureReason).toBe('Insufficient funds');
    });

    it('should throw error for invalid payment amount', async () => {
      await expect(
        paymentRepo.createPayment({
          caseId,
          userId,
          amount: -100,
          currency: 'USD',
          method: 'CREDIT_CARD'
        })
      ).rejects.toThrow(BusinessError);
    });
  });

  describe('NotificationRepository', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await userRepo.create({
        email: 'notif-user@example.com',
        username: 'notifuser',
        password: 'hashedpassword',
        firstName: 'Notif',
        lastName: 'User',
        role: 'PATIENT',
        isActive: true,
        isVerified: true
      });
      userId = user.id;
    });

    it('should create and manage notifications', async () => {
      const notification = await notificationRepo.create({
        userId,
        type: 'APPOINTMENT_REMINDER',
        channel: 'EMAIL',
        title: 'Appointment Tomorrow',
        content: 'You have an appointment tomorrow at 10 AM',
        retryCount: 0
      });

      expect(notification.id).toBeDefined();

      // Find unread
      const unread = await notificationRepo.findUnread(userId);
      expect(unread).toHaveLength(1);

      // Mark as read
      const read = await notificationRepo.markAsRead(notification.id);
      expect(read.readAt).toBeDefined();

      // Check unread count
      const unreadCount = await notificationRepo.getUnreadCount(userId);
      expect(unreadCount).toBe(0);
    });

    it('should handle bulk notifications', async () => {
      const notifications = await notificationRepo.createBulkNotifications([
        {
          userId,
          type: 'CASE_UPDATE',
          channel: 'IN_APP',
          title: 'Case Updated',
          content: 'Your case has been updated'
        },
        {
          userId,
          type: 'PAYMENT_RECEIVED',
          channel: 'EMAIL',
          title: 'Payment Received',
          content: 'We have received your payment'
        }
      ]);

      expect(notifications.length).toBeGreaterThanOrEqual(2);

      // Get stats
      const stats = await notificationRepo.getNotificationStats(userId);
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.unread).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Repository Factory', () => {
    it('should return singleton instance', () => {
      const factory1 = repositoryFactory;
      const factory2 = repositoryFactory;
      expect(factory1).toBe(factory2);
    });

    it('should create all repositories', () => {
      expect(repositoryFactory.createUserRepository()).toBeDefined();
      expect(repositoryFactory.createCaseRepository()).toBeDefined();
      expect(repositoryFactory.createAppointmentRepository()).toBeDefined();
      expect(repositoryFactory.createPaymentRepository()).toBeDefined();
      expect(repositoryFactory.createNotificationRepository()).toBeDefined();
    });
  });
});