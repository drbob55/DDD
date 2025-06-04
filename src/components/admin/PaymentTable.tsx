"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Payment = {
  id: string;
  amount: string;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  case?: { id: string };
  user?: { id: string; name: string; email: string };
};

type UserOption = { id: string; name: string; email: string };
type CaseOption = { id: string };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-gray-200 text-gray-700",
};

export default function PaymentTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Payment Modal state
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [form, setForm] = useState<any>({
    userId: "",
    caseId: "",
    amount: "",
    currency: "USD",
    description: "",
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data.payments || []);
    setLoading(false);
  };

  // Fetch users/cases for modal
  const fetchUsersCases = async () => {
    const usersRes = await fetch("/api/users");
    const casesRes = await fetch("/api/cases");
    setUsers((await usersRes.json()).users || []);
    setCases((await casesRes.json()).cases || []);
  };

  // Create payment submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.loading("Creating payment...");
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast.dismiss();
    if (res.ok) {
      setShowModal(false);
      setForm({
        userId: "",
        caseId: "",
        amount: "",
        currency: "USD",
        description: "",
      });
      toast.success("Payment created.");
      fetchPayments();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create payment.");
    }
  };

  // Handler: update payment status
  const updateStatus = async (id: string, status: Payment["status"]) => {
    toast.loading("Updating payment status...");
    const res = await fetch(`/api/payments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
      toast.dismiss();
      toast.success("Status updated.");
    } else {
      toast.dismiss();
      toast.error("Failed to update payment status.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
        Payments
        <button
          onClick={() => {
            setShowModal(true);
            fetchUsersCases();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 text-sm"
        >
          + Create Payment
        </button>
      </h2>

      {/* --- Create Payment Modal --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700 text-xl"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4">Create Payment</h3>
            <form className="space-y-3" onSubmit={handleCreate}>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  User
                </label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  required
                  value={form.userId}
                  onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                >
                  <option value="">Select user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Case
                </label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  required
                  value={form.caseId}
                  onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))}
                >
                  <option value="">Select case</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id.slice(0, 8)}...
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-3 py-2 w-full"
                  required
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Currency
                </label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Description (optional)
                </label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-300"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Payments Table --- */}
      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading payments...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Case</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Currency</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t">
                  <td className="px-4 py-2">
                    {payment.user ? (
                      <span title={payment.user.email}>
                        {payment.user.name || payment.user.email}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {payment.case ? (
                      <a
                        href={`/cases/${payment.case.id}`}
                        className="text-blue-700 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {payment.case.id.slice(0, 8)}...
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {payment.amount}
                  </td>
                  <td className="px-4 py-2">{payment.currency}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[payment.status] || "bg-gray-100 text-gray-700"}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{payment.description || "-"}</td>
                  <td className="px-4 py-2">
                    {payment.createdAt
                      ? new Date(payment.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    {payment.status !== "PAID" && (
                      <button
                        onClick={() => updateStatus(payment.id, "PAID")}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 text-xs"
                      >
                        Mark Paid
                      </button>
                    )}
                    {payment.status !== "REFUNDED" && (
                      <button
                        onClick={() => updateStatus(payment.id, "REFUNDED")}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 text-xs"
                      >
                        Refund
                      </button>
                    )}
                    {payment.status !== "CANCELLED" && (
                      <button
                        onClick={() => updateStatus(payment.id, "CANCELLED")}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-xs"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
