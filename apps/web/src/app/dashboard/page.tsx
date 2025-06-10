"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DentistDashboard from "@/components/dashboards/dentist/DentistDashboard";
import PatientDashboard from "@/components/dashboards/patient/PatientDashboard";
import AdminDashboard from "@/components/dashboards/admin/AdminDashboard";
import ReviewerDashboard from "@/components/dashboards/reviewer/ReviewerDashboard";
import ManufacturerDashboard from "@/components/dashboards/manufacturer/ManufacturerDashboard";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Render dashboard based on user role
  const renderDashboard = () => {
    switch (session.user.role) {
      case "ADMIN":
        return <AdminDashboard />;
      case "DENTIST":
        return <DentistDashboard />;
      case "PATIENT":
        return <PatientDashboard />;
      case "REVIEWER":
        return <ReviewerDashboard />;
      case "MANUFACTURER":
        return <ManufacturerDashboard />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Unknown Role: {session.user.role}
              </h1>
              <p className="text-gray-600">Please contact support.</p>
            </div>
          </div>
        );
    }
  };

  return renderDashboard();
}
