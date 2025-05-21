"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "PATIENT" });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      // Auto-login after registration
      await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Registration failed.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm" onSubmit={handleSubmit}>
        <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">Register</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <input name="name" type="text" required placeholder="Full Name" value={form.name} onChange={handleChange} className="w-full mb-3 px-4 py-2 border rounded" />
        <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange} className="w-full mb-3 px-4 py-2 border rounded" />
        <input name="password" type="password" required placeholder="Password" value={form.password} onChange={handleChange} className="w-full mb-3 px-4 py-2 border rounded" />
        <select name="role" value={form.role} onChange={handleChange} className="w-full mb-4 px-4 py-2 border rounded">
          <option value="PATIENT">Patient</option>
          <option value="DENTIST">Dentist</option>
          <option value="REVIEWER">Reviewer</option>
          <option value="MANUFACTURER">Manufacturer</option>
        </select>
        <button type="submit" className="w-full bg-blue-700 text-white font-bold py-2 rounded mt-2">Register</button>
      </form>
    </div>
  );
}