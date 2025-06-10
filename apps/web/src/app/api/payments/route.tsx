// src/app/api/payments/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@dental/database";
import { 
  USER_ROLES, 
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  ACTIVITY_TYPE,
  TARGET_TYPE,
  LOG_SEVERITY,
  validators
} from "@dental/shared/constants";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized" 
      }, { status: 401 });
    }
    
    // Only admin can access payment reports
    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json({ 
        success: false,
        error: "Not authorized to access payment reports" 
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const userId = searchParams.get('userId');
    const caseId = searchParams.get('caseId');
    const groupBy = searchParams.get('groupBy'); // 'day', 'week', 'month', 'status', 'method'
    
    // Validate filters
    if (status && !validators.isValidPaymentStatus(status)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid payment status",
        validValues: Object.values(PAYMENT_STATUS)
      }, { status: 400 });
    }
    
    if (method && !validators.isValidPaymentMethod(method)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid payment method",
        validValues: Object.values(PAYMENT_METHOD)
      }, { status: 400 });
    }
    
    // Build filter conditions
    const where: any = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (userId) where.userId = userId;
    if (caseId) where.caseId = caseId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    // Fetch payments with relations
    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            patient: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate aggregations
    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      averageAmount: payments.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0,
      
      // By status
      byStatus: Object.values(PAYMENT_STATUS).reduce((acc, status) => {
        const filtered = payments.filter(p => p.status === status);
        acc[status] = {
          count: filtered.length,
          amount: filtered.reduce((sum, p) => sum + p.amount, 0),
          percentage: payments.length > 0 ? (filtered.length / payments.length) * 100 : 0
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number; percentage: number }>),
      
      // By method
      byMethod: Object.values(PAYMENT_METHOD).reduce((acc, method) => {
        const filtered = payments.filter(p => p.method === method);
        acc[method] = {
          count: filtered.length,
          amount: filtered.reduce((sum, p) => sum + p.amount, 0),
          percentage: payments.length > 0 ? (filtered.length / payments.length) * 100 : 0
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number; percentage: number }>),
      
      // Time-based metrics
      metrics: {
        pendingAmount: payments.filter(p => p.status === PAYMENT_STATUS.PENDING).reduce((sum, p) => sum + p.amount, 0),
        paidAmount: payments.filter(p => p.status === PAYMENT_STATUS.PAID).reduce((sum, p) => sum + p.amount, 0),
        refundedAmount: payments.filter(p => p.status === PAYMENT_STATUS.REFUNDED).reduce((sum, p) => sum + p.amount, 0),
        failedAmount: payments.filter(p => p.status === PAYMENT_STATUS.FAILED).reduce((sum, p) => sum + p.amount, 0),
        conversionRate: payments.length > 0 
          ? (payments.filter(p => p.status === PAYMENT_STATUS.PAID).length / payments.length) * 100 
          : 0
      }
    };
    
    // Group by time period if requested
    let groupedData = null;
    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      groupedData = groupPaymentsByPeriod(payments, groupBy);
    }
    
    // Log report generation
    await prisma.log.create({
      data: {
        userId: session.user.id,
        action: ACTIVITY_TYPE.REPORT_GENERATED,
        targetType: TARGET_TYPE.PAYMENT,
        targetId: 'payment-report',
        description: 'Payment report generated',
        severity: LOG_SEVERITY.INFO,
        metadata: {
          filters: {
            startDate,
            endDate,
            status,
            method,
            userId,
            caseId,
            groupBy
          },
          resultCount: payments.length,
          totalAmount: summary.totalAmount
        }
      }
    });
    
    return NextResponse.json({ 
      success: true,
      data: {
        payments,
        summary,
        groupedData,
        filters: {
          startDate,
          endDate,
          status,
          method,
          userId,
          caseId
        }
      }
    });
  } catch (error) {
    console.error("Payment report generation error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to generate payment report" 
    }, { status: 500 });
  }
}

// Helper function to group payments by time period
function groupPaymentsByPeriod(payments: any[], period: 'day' | 'week' | 'month') {
  const grouped: Record<string, { count: number; amount: number; payments: any[] }> = {};
  
  payments.forEach(payment => {
    let key: string;
    const date = new Date(payment.createdAt);
    
    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = { count: 0, amount: 0, payments: [] };
    }
    
    grouped[key].count++;
    grouped[key].amount += payment.amount;
    grouped[key].payments.push(payment);
  });
  
  // Sort by date
  const sortedKeys = Object.keys(grouped).sort();
  const sortedGrouped: Record<string, any> = {};
  sortedKeys.forEach(key => {
    sortedGrouped[key] = grouped[key];
  });
  
  return sortedGrouped;
}