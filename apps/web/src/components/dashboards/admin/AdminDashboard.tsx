"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { 
  Users, 
  FileText, 
  DollarSign, 
  Activity,
  TrendingUp,
  AlertCircle,
  Settings,
  Database
} from "lucide-react";

// Import admin components from features folder
const UserTable = React.lazy(() => import("@/components/features/admin/UserTable"));
const CaseTable = React.lazy(() => import("@/components/features/admin/CaseTable"));
const PaymentTable = React.lazy(() => import("@/components/features/admin/PaymentTable"));
const LogTable = React.lazy(() => import("@/components/features/admin/LogTable"));
const SystemSettings = React.lazy(() => import("@/components/features/admin/SystemSettings"));

// Loading component
const TableLoading = () => (
  <div className="p-8 text-center">
    <div className="inline-flex items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCases: 0,
    totalRevenue: 0,
    systemHealth: "Good",
    userGrowth: 0,
    caseGrowth: 0,
    revenueGrowth: 0,
    activeUsers: 0
  });

  // Fetch dashboard statistics
  useEffect(() => {
    // TODO: Replace with actual API calls
    setStats({
      totalUsers: 1543,
      totalCases: 892,
      totalRevenue: 425000,
      systemHealth: "Good",
      userGrowth: 15.2,
      caseGrowth: 22.5,
      revenueGrowth: 18.7,
      activeUsers: 387
    });
  }, []);

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "Users", icon: Users },
    { id: "cases", label: "Cases", icon: FileText },
    { id: "payments", label: "Payments", icon: DollarSign },
    { id: "logs", label: "System Logs", icon: Database },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                System overview and management
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">System Status</p>
                <p className="text-sm font-semibold text-green-600">All Systems Operational</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="flex space-x-8 border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div>
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers.toLocaleString()}</p>
                    <p className="text-sm text-green-600 mt-1">
                      <TrendingUp className="inline h-4 w-4" /> {stats.userGrowth}% growth
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Cases</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCases.toLocaleString()}</p>
                    <p className="text-sm text-green-600 mt-1">
                      <TrendingUp className="inline h-4 w-4" /> {stats.caseGrowth}% growth
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-green-600 mt-1">
                      <TrendingUp className="inline h-4 w-4" /> {stats.revenueGrowth}% growth
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeUsers}</p>
                    <p className="text-sm text-gray-600 mt-1">Last 30 days</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setActiveTab("users")}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Users className="h-6 w-6 text-gray-600 mb-2" />
                  <h3 className="font-medium">Manage Users</h3>
                  <p className="text-sm text-gray-600">Add, edit, or remove users</p>
                </button>
                <button 
                  onClick={() => setActiveTab("settings")}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Settings className="h-6 w-6 text-gray-600 mb-2" />
                  <h3 className="font-medium">System Settings</h3>
                  <p className="text-sm text-gray-600">Configure system parameters</p>
                </button>
                <button 
                  onClick={() => setActiveTab("logs")}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Database className="h-6 w-6 text-gray-600 mb-2" />
                  <h3 className="font-medium">View Logs</h3>
                  <p className="text-sm text-gray-600">Monitor system activity</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow">
            <Suspense fallback={<TableLoading />}>
              <UserTable />
            </Suspense>
          </div>
        )}

        {/* Cases Tab */}
        {activeTab === "cases" && (
          <div className="bg-white rounded-lg shadow">
            <Suspense fallback={<TableLoading />}>
              <CaseTable />
            </Suspense>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-lg shadow">
            <Suspense fallback={<TableLoading />}>
              <PaymentTable />
            </Suspense>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="bg-white rounded-lg shadow">
            <Suspense fallback={<TableLoading />}>
              <LogTable />
            </Suspense>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-lg shadow">
            <Suspense fallback={<TableLoading />}>
              <SystemSettings />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
