export default function DentistDashboard({ user }: { user: any }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-xl text-center">
        <h2 className="text-3xl font-bold mb-4 text-blue-700">Welcome, Dr. {user.name}!</h2>
        <p className="text-gray-600 mb-4">This is your dentist dashboard.</p>
        <ul className="mb-6 text-left">
          <li>• Submit new patient cases</li>
          <li>• Upload 3D scans</li>
          <li>• Track submitted and active cases</li>
          <li>• Schedule follow-ups</li>
        </ul>
        <a
          href="/cases/new"
          className="inline-block mt-2 bg-blue-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-800"
        >
          Submit New Case
        </a>
      </div>
    </div>
  );
}