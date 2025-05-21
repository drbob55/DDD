import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    // Not logged in
    return <div className="text-center mt-16">Please log in to view your dashboard.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-xl text-center">
        <h2 className="text-3xl font-bold mb-4 text-blue-700">Welcome, {session.user.name}!</h2>
        <p className="text-gray-600 mb-4">Role: {session.user.role}</p>
        <p>Your dashboard will show cases, status, and more depending on your role.</p>
      </div>
    </div>
  );
}