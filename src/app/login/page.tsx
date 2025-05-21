"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });
    if (res?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm" onSubmit={handleSubmit}>
        <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">Login</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange} className="w-full mb-3 px-4 py-2 border rounded" />
        <input name="password" type="password" required placeholder="Password" value={form.password} onChange={handleChange} className="w-full mb-3 px-4 py-2 border rounded" />
        <button type="submit" className="w-full bg-blue-700 text-white font-bold py-2 rounded mt-2">Login</button>
      </form>
    </div>
  );
}