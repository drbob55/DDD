// src/components/AdminDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";

// Define constants locally to avoid import issues
const ROLES = {
  PATIENT: "PATIENT",
  DENTIST: "DENTIST",
  REVIEWER: "REVIEWER",
  MANUFACTURER: "MANUFACTURER",
  ADMIN: "ADMIN",
};

const CASE_STATUS = {
  PENDING_REVIEW: "PENDING_REVIEW",
  AWAITING_CONSENT: "AWAITING_CONSENT",
  IN_TREATMENT: "IN_TREATMENT",
  MANUFACTURING: "MANUFACTURING",
  SHIPPED: "SHIPPED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
};

// Import components with error handling
const UserTable = React.lazy(() => import("./admin/UserTable"));
const CaseTable = React.lazy(() => import("./admin/CaseTable"));
const PaymentTable = React.lazy(() => import("./admin/PaymentTable"));
const LogTable = React.lazy(() => import("./admin/LogTable"));
const NotificationSender = React.lazy(() => import("./admin/NotificationSender"));

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Dashboard Stats Component
const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalCases: 0,
    pendingReview: 0,
    awaitingConsent: 0,
    manufacturing: 0,
    totalUsers: 0,
    patients: 0,
    dentists: 0,
    reviewers: 0,
    manufacturers: 0,
    pendingPayments: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch cases
      const casesRes = await fetch("/api/cases");
      const casesData = await casesRes.json();
      const cases = casesData.cases || [];

      // Fetch users
      const usersRes = await fetch("/api/users");
      const usersData = await usersRes.json();
      const users = usersData.users || [];

      // Fetch payments
      const paymentsRes = await fetch("/api/payments");
      const paymentsData = await paymentsRes.json();
      const payments = paymentsData.payments || [];

      // Calculate stats
      setStats({
        totalCases: cases.length,
        pendingReview: cases.filter((c: any) => c.status === CASE_STATUS.PENDING_REVIEW).length,
        awaitingConsent: cases.filter((c: any) => c.status === CASE_STATUS.AWAITING_CONSENT).length,
        manufacturing: cases.filter((c: any) => c.status === CASE_STATUS.MANUFACTURING && !c.manufacturerId).length,
        totalUsers: users.length,
        patients: users.filter((u: any) => u.role === ROLES.PATIENT).length,
        dentists: users.filter((u: any) => u.role === ROLES.DENTIST).length,
        reviewers: users.filter((u: any) => u.role === ROLES.REVIEWER).length,
        manufacturers: users.filter((u: any) => u.role === ROLES.MANUFACTURER).length,
        pendingPayments: payments.filter((p: any) => p.status === "PENDING").length,
        totalRevenue: payments
          .filter((p: any) => p.status === "PAID")
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Cases Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Cases</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCases}</p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-yellow-600">Pending Review</span>
            <span className="font-medium">{stats.pendingReview}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-orange-600">Awaiting Consent</span>
            <span className="font-medium">{stats.awaitingConsent}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-purple-600">Need Manufacturer</span>
            <span className="font-medium">{stats.manufacturing}</span>
          </div>
        </div>
      </div>

      {/* Users Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-blue-600">Patients</span>
            <span className="font-medium">{stats.patients}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Dentists</span>
            <span className="font-medium">{stats.dentists}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-purple-600">Service Providers</span>
            <span className="font-medium">{stats.reviewers + stats.manufacturers}</span>
          </div>
        </div>
      </div>

      {/* Payments Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingPayments}</p>
          </div>
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            ${stats.totalRevenue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <button 
            onClick={() => window.location.href = '#cases'}
            className="w-full text-left px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            Assign Manufacturers ({stats.manufacturing})
          </button>
          <button 
            onClick={() => window.location.href = '#users'}
            className="w-full text-left px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            Verify New Users
          </button>
          <button 
            onClick={() => window.location.href = '#payments'}
            className="w-full text-left px-3 py-2 text-sm bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
          >
            Process Payments ({stats.pendingPayments})
          </button>
        </div>
      </div>
    </div>
  );
};

// Main tabs configuration
const MAIN_SECTIONS = [
  { 
    label: "Dashboard", 
    key: "dashboard", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  { 
    label: "Cases", 
    key: "cases", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  { 
    label: "Users", 
    key: "users", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  { 
    label: "Payments", 
    key: "payments", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
  { 
    label: "Activity Logs", 
    key: "logs", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  },
  { 
    label: "Notifications", 
    key: "notifications", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )
  },
];

export default function AdminDashboard({ user }: { user?: any }) {
  const [activeSection, setActiveSection] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Welcome, {user?.name || "Admin"}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white dark:bg-gray-800 shadow-lg min-h-screen">
          <nav className="p-4 space-y-1">
            {MAIN_SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === section.key
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {section.icon}
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <React.Suspense 
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
              </div>
            }
          >
            <ErrorBoundary
              fallback={
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-400">
                    Error loading component. Please refresh the page.
                  </p>
                </div>
              }
            >
              {activeSection === "dashboard" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Overview</h2>
                  <DashboardStats />
                  
                  {/* Recent Activity */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Recent Activity</h3>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                      <p className="text-gray-500 dark:text-gray-400">Recent logs will appear here...</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "users" && <UserTable />}
              {activeSection === "cases" && <CaseTable />}
              {activeSection === "payments" && <PaymentTable />}
              {activeSection === "logs" && <LogTable />}
              {activeSection === "notifications" && <NotificationSender />}
            </ErrorBoundary>
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}