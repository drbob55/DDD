// /src/components/PaymentsTable.tsx

"use client";
import React, { useEffect, useState } from "react";
import PaymentFormModal from "./PaymentFormModal";
import { toast } from "react-hot-toast";

function formatDate(date) {
  return new Date(date).toLocaleString();
}

const STATUS_COLORS = {
  PENDING: "bg-yellow-200 text-yellow-800",
  PAID: "bg-green-200 text-green-800",
  REFUNDED: "bg-blue-200 text-blue-800",
  FAILED: "bg-red-200 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-700",
};

export default function PaymentsTable({ adminUser }) {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchPayments = async () => {
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data.payments || []);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleEdit = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    const res = await fetch("/api/payments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("Payment deleted");
      fetchPayments();
    } else {
      toast.error("Failed to delete payment");
    }
  };

  const filtered = payments.filter((p) =>
    p.userId?.toLowerCase().includes(search.toLowerCase()) ||
    p.caseId?.toLowerCase().includes(search.toLowerCase()) ||
    p.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between mb-4">
        <input
          type="text"
          placeholder="Filter by user/case/status"
          className="border rounded-lg px-3 py-2 w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold"
          onClick={() => {
            setSelectedPayment(null);
            setShowModal(true);
          }}
        >
          + Create Payment
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">User ID</th>
              <th className="p-2">Case ID</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
              <th className="p-2">Updated</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2 font-mono">{p.id.slice(0, 6)}...</td>
                <td className="p-2 font-mono">{p.userId}</td>
                <td className="p-2 font-mono">{p.caseId}</td>
                <td className="p-2">${Number(p.amount).toFixed(2)} {p.currency}</td>
                <td className="p-2">
                  <span className={`rounded-xl px-2 py-1 text-xs font-bold ${STATUS_COLORS[p.status] || ""}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-2">{formatDate(p.updatedAt)}</td>
                <td className="p-2 flex gap-2">
                  <button
                    className="text-blue-700 hover:underline"
                    onClick={() => handleEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-4 text-gray-400">
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showModal && (
        <PaymentFormModal
          adminUser={adminUser}
          payment={selectedPayment}
          onClose={() => {
            setShowModal(false);
            setSelectedPayment(null);
            fetchPayments();
          }}
        />
      )}
    </div>
  );
}
