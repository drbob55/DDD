// src/app/dashboard/page.tsx
import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // ← Fix: Import from lib/auth.ts
import PatientDashboard from "@/components/PatientDashboard";
import DentistDashboard from "@/components/dentist/DentistDashboard";
import ReviewerDashboard from "@/components/ReviewerDashboard";
import ManufacturerDashboard from "@/components/ManufacturerDashboard";
import AdminDashboard from "@/components/AdminDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Add debug logging
  console.log("Session user:", session?.user);
  console.log("User role:", session?.user?.role);
  
  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-xl text-red-500 font-semibold">Not Logged In</h2>
          <p className="text-gray-600 mt-2">
            Please <a href="/" className="text-blue-700 underline">login</a> to view your dashboard.
          </p>
        </div>
      </div>
    );
  }
  
  switch (session.user.role) {
    case ROLES.PATIENT:
      return <PatientDashboard user={session.user} />;
    case ROLES.DENTIST:
      return <DentistDashboard user={session.user} />;
    case ROLES.REVIEWER:
      return <ReviewerDashboard user={session.user} />;
    case ROLES.MANUFACTURER:
      return <ManufacturerDashboard user={session.user} />;
    case ROLES.ADMIN:
      return <AdminDashboard user={session.user} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-semibold">Unknown role: {session.user.role}</h2>
            <p className="text-gray-600 mt-2">
              Expected one of: {Object.values(ROLES).join(", ")}
            </p>
          </div>
        </div>
      );
  }
}