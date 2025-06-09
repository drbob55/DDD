"use client";
import { useState } from "react";

export default function Register() {
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [step, setStep] = useState<"input" | "pending" | "done">("input");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    // Basic validation
    if (!contact.email && !contact.phone) {
      setMessage("Please enter email or phone.");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    const data = await res.json();
    setLoading(false);
    if (data.status === "registered") {
      setStep("done");
      setMessage("You are already registered. Please log in.");
    } else if (data.status === "pending") {
      setStep("pending");
      setMessage("Account not yet activated. Invitation has been re-sent. Please check your email.");
    } else if (data.status === "invited") {
      setStep("pending");
      setMessage("Invitation sent! Please check your email to finish registration.");
    } else {
      setMessage(data.error || "Something went wrong.");
    }
  }

  function handleChange(e) {
    setContact({ ...contact, [e.target.name]: e.target.value });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4">Patient Registration</h2>
        {message && <div className="mb-4 text-blue-700">{message}</div>}
        {step === "input" && (
          <>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={contact.email}
              onChange={handleChange}
              className="mb-3 px-4 py-2 border rounded w-full"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone (optional)"
              value={contact.phone}
              onChange={handleChange}
              className="mb-3 px-4 py-2 border rounded w-full"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded font-bold w-full"
              disabled={loading}
            >
              {loading ? "Please wait..." : "Continue"}
            </button>
          </>
        )}
        {step === "pending" && (
          <>
            <button
              type="button"
              onClick={handleSubmit}
              className="mt-2 text-blue-600 underline"
              disabled={loading}
            >
              Resend Invitation
            </button>
          </>
        )}
        {step === "done" && (
          <a href="/login" className="text-blue-700 underline">Go to Login</a>
        )}
      </form>
    </div>
  );
}