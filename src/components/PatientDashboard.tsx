export default function PatientDashboard({ user }: { user: any }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-xl text-center">
        <h2 className="text-3xl font-bold mb-4 text-blue-700">Welcome, {user.name}!</h2>
        <p className="text-gray-600 mb-4">This is your patient dashboard.</p>
        <ul className="mb-6 text-left">
          <li>• View your aligner cases and status</li>
          <li>• Consent to new treatments</li>
          <li>• See follow-up appointments</li>
        </ul>
        <p>More features coming soon!</p>
      </div>
    </div>
  );
}