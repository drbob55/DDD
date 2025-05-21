export default function AdminDashboard({ user }: { user: any }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-xl text-center">
        <h2 className="text-3xl font-bold mb-4 text-blue-700">Welcome, Admin {user.name}!</h2>
        <p className="text-gray-600 mb-4">This is your admin dashboard.</p>
        <ul className="mb-6 text-left">
          <li>• View all cases and users</li>
          <li>• Troubleshoot and audit</li>
        </ul>
        <p>Feature: User/case management coming soon.</p>
      </div>
    </div>
  );
}