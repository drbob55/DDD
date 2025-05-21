import Navbar from "../components/Navbar.tsx";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center">
          <h1 className="text-4xl font-bold text-blue-700 mb-4">
            Welcome to Aligner Portal
          </h1>
          <p className="text-gray-700 mb-6">
            The easiest way to manage custom aligner treatment from scan to delivery.<br />
            For Patients, Dentists & Manufacturers.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition">
              Login
            </a>
            <a href="/register" className="bg-gray-100 hover:bg-gray-200 text-blue-700 font-bold py-2 px-6 rounded-xl transition">
              Register
            </a>
          </div>
          <div className="mt-6">
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-blue-700 underline">Go to Dashboard</a>
          </div>
        </div>
        <footer className="mt-8 text-gray-400 text-xs">
          &copy; {new Date().getFullYear()} Aligner Portal. All rights reserved.
        </footer>
      </main>
    </>
  );
}
