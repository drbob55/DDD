// /src/components/PaymentFormModal.tsx

"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

const STATUS_OPTIONS = [
  "PENDING",
  "PAID",
  "REFUNDED",
  "FAILED",
  "CANCELLED",
];

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Payment = {
  id?: string;
  userId: string;
  caseId: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
};

interface PaymentFormModalProps {
  adminUser: AdminUser;
  payment: Payment | null;
  onClose: () => void;
}

export default function PaymentFormModal({ adminUser, payment, onClose }: PaymentFormModalProps) {
  const [form, setForm] = useState(
    payment
      ? { ...payment }
      : { userId: "", caseId: "", amount: "", currency: "USD", status: "PENDING", description: "" }
  );
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const method = payment ? "PUT" : "POST";
    const res = await fetch("/api/payments", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form }),
    });

    if (res.ok) {
      toast.success(`Payment ${payment ? "updated" : "created"}!`);
      onClose();
    } else {
      const err = await res.json();
      toast.error(err.error || "Error");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full relative">
        <button
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          disabled={loading}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">
          {payment ? "Edit Payment" : "Create Payment"}
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block font-semibold mb-1">User ID</label>
            <input
              name="userId"
              className="w-full border rounded-lg px-3 py-2"
              value={form.userId}
              onChange={handleChange}
              required
              disabled={!!payment}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Case ID</label>
            <input
              name="caseId"
              className="w-full border rounded-lg px-3 py-2"
              value={form.caseId}
              onChange={handleChange}
              required
              disabled={!!payment}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Amount</label>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Currency</label>
              <input
                name="currency"
                className="w-full border rounded-lg px-3 py-2"
                value={form.currency}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select
              name="status"
              className="w-full border rounded-lg px-3 py-2"
              value={form.status}
              onChange={handleChange}
              required
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <input
              name="description"
              className="w-full border rounded-lg px-3 py-2"
              value={form.description}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button
              className="bg-gray-100 rounded-lg px-4 py-2"
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="bg-blue-700 text-white rounded-lg px-6 py-2 font-semibold"
              type="submit"
              disabled={loading}
            >
              {loading ? "Saving..." : payment ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}