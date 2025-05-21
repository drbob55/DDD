import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-white shadow-md py-3 px-8 flex justify-between items-center">
      <Link href="/" className="text-2xl font-bold text-blue-700">
        Aligner Portal
      </Link>
      <div className="space-x-4">
        <Link href="/login" className="text-blue-700 hover:underline">Login</Link>
        <Link href="/register" className="text-blue-700 hover:underline">Register</Link>
        <Link href="/dashboard" className="text-gray-600 hover:text-blue-700 hover:underline">Dashboard</Link>
      </div>
    </nav>
  );
}
