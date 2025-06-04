import { ROLES, CASE_STATUS, PAYMENT_STATUS, SEX_OPTIONS } from "@/lib/constants";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import PatientDashboard from "../../components/PatientDashboard";
import DentistDashboard from "../../components/DentistDashboard";
import ReviewerDashboard from "../../components/ReviewerDashboard";
import ManufacturerDashboard from "../../components/ManufacturerDashboard";
import AdminDashboard from "../../components/AdminDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-xl text-red-500 font-semibold">Not Logged In</h2>
          <p className="text-gray-600 mt-2">
            Please <a href="/login" className="text-blue-700 underline">login</a> to view your dashboard.
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
            <h2 className="text-xl font-semibold">Unknown role</h2>
          </div>
        </div>
      );
  }
}