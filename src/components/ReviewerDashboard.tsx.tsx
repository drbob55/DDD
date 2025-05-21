export default function ReviewerDashboard({ user }: { user: any }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-xl text-center">
        <h2 className="text-3xl font-bold mb-4 text-blue-700">Welcome, {user.name}!</h2>
        <p className="text-gray-600 mb-4">This is your reviewer dashboard.</p>
        <ul className="mb-6 text-left">
          <li>• Review new patient cases</li>
          <li>• Approve or reject aligner plans</li>
          <li>• Message patients and dentists</li>
        </ul>
        <p>Feature: List of cases pending review coming soon.</p>
      </div>
    </div>
  );
}