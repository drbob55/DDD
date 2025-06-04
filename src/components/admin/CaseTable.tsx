"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Case = {
  id: string;
  patientId: string;
  dentistId: string | null;
  reviewerId: string | null;
  status: string;
  createdAt: string;
  notes?: string;
  dentist?: { id: string; name: string; email: string } | null;
  reviewer?: { id: string; name: string; email: string } | null;
  patient?: { id: string; name: string; email: string } | null;
  hiddenByDentist?: boolean;
};

type User = { id: string; name: string; email: string };

const STATUS_OPTIONS = [
  "PENDING_REVIEW",
  "AWAITING_CONSENT",
  "IN_TREATMENT",
  "MANUFACTURING",
  "SHIPPED",
  "COMPLETED",
  "REJECTED",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  AWAITING_CONSENT: "bg-blue-100 text-blue-800",
  IN_TREATMENT: "bg-green-100 text-green-800",
  MANUFACTURING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-gray-100 text-gray-700",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function CaseTable() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dentists, setDentists] = useState<User[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);

  useEffect(() => {
    fetchDentists();
    fetchReviewers();
  }, []);

  useEffect(() => {
    fetchAll();
  }, [statusFilter]);

  const fetchDentists = async () => {
    try {
      const res = await fetch("/api/users?role=DENTIST");
      const data = await res.json();
      setDentists(data.users || []);
    } catch (error) {
      console.error("Error fetching dentists:", error);
      toast.error("Failed to load dentists");
    }
  };

  const fetchReviewers = async () => {
    try {
      const res = await fetch("/api/users?role=REVIEWER");
      const data = await res.json();
      setReviewers(data.users || []);
    } catch (error) {
      console.error("Error fetching reviewers:", error);
      toast.error("Failed to load reviewers");
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/cases?status=${statusFilter}` : "/api/cases";
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Cases data:", data); // Debug log
      setCases(data.cases || []);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast.error("Failed to load cases");
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  // Handler: override status
  const updateStatus = async (id: string, status: string) => {
    toast.loading("Updating case status...");
    try {
      const res = await fetch(`/api/cases/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      toast.dismiss();
      
      if (res.ok) {
        setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
        toast.success("Case status updated.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update case status.");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Error updating status");
    }
  };

  // Handler: reassign dentist
  const reassignDentist = async (caseId: string, dentistId: string) => {
    if (!dentistId) return; // Don't do anything if empty selection
    
    toast.loading("Reassigning dentist...");
    try {
      const res = await fetch(`/api/cases/${caseId}/reassign-dentist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentistId }),
      });
      
      toast.dismiss();
      
      if (res.ok) {
        toast.success("Dentist reassigned.");
        fetchAll();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to reassign dentist.");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Error reassigning dentist");
    }
  };

  // Handler: reassign reviewer
  const reassignReviewer = async (caseId: string, reviewerId: string) => {
    toast.loading("Reassigning reviewer...");
    try {
      const res = await fetch(`/api/cases/${caseId}/reassign-reviewer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: reviewerId || null }),
      });
      
      toast.dismiss();
      
      if (res.ok) {
        toast.success("Reviewer reassigned.");
        fetchAll();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to reassign reviewer.");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Error reassigning reviewer");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
        Cases
        <select
          className="ml-4 border px-2 py-1 rounded text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </h2>
      
      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No cases found. {statusFilter && "Try changing the status filter."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Case ID</th>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">Patient ID</th>
                <th className="px-4 py-2 text-left">Dentist</th>
                <th className="px-4 py-2 text-left">Reviewer</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-left">Notes</th>
                <th className="px-4 py-2 text-left">Hidden</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono">{c.id}</td>
                  <td className="px-4 py-2 text-sm">
                    {c.patient?.name || "-"}
                  </td>
                  <td className="px-4 py-2 text-sm font-mono">
                    {c.patient?.id || c.patientId || "-"}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={c.dentistId || ""}
                      onChange={(e) => reassignDentist(c.id, e.target.value)}
                      className="border rounded px-2 py-1 text-xs w-full"
                    >
                      <option value="">Unassigned</option>
                      {dentists.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={c.reviewerId || ""}
                      onChange={(e) => reassignReviewer(c.id, e.target.value)}
                      className="border rounded px-2 py-1 text-xs w-full"
                    >
                      <option value="">Unassigned</option>
                      {reviewers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name || r.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {c.createdAt
                      ? new Date(c.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-xs max-w-xs truncate">
                    {c.notes || "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {c.hiddenByDentist ? (
                      <span className="text-red-600">✓</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={c.status}
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
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