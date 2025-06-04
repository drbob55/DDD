"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type Case = {
  id: string;
  patient: { name: string; email: string; id: string; patientId?: string };
  dentist: { name: string };
  scanFileUrl: string;
  notes: string;
  createdAt: string;
  status: string;
  reviewerId?: string | null;
  treatmentPlanUrl?: string | null;
};

export default function ReviewerDashboard({ user }: { user: any }) {
  const { data: session } = useSession();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [status, setStatus] = useState("APPROVED");
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showReviewed, setShowReviewed] = useState(false);

  const reviewerName = user?.name || session?.user?.name || "Reviewer";
  const reviewerId = user?.id || session?.user?.id || "—";

  // Load cases on mount
  useEffect(() => {
    fetch("/api/cases")
      .then((res) => res.json())
      .then((data) => setCases(data.cases || []));
  }, []);

  // Split into pending/reviewed
  const pendingCases = cases.filter(
    (c) => c.status === "PENDING_REVIEW" && !c.treatmentPlanUrl
  );
  const reviewedCases = cases.filter(
    (c) =>
      (["IN_TREATMENT", "REJECTED", "COMPLETED"].includes(c.status)) &&
      c.reviewerId === reviewerId // <--- this line relies on reviewerId being in the API response
  );

  // Handle reviewer action
  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (status === "APPROVED" && !planFile) {
      setError("Treatment plan file required for approval.");
      return;
    }
    const formData = new FormData();
    formData.append("status", status);
    formData.append("reviewerId", reviewerId);
    if (status === "APPROVED" && planFile) {
      formData.append("treatmentPlan", planFile);
    }
    const res = await fetch(`/api/cases/${selectedCase?.id}/review`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      setSuccess("Case updated.");
      setSelectedCase(null);
      // Refresh list
      fetch("/api/cases")
        .then((res) => res.json())
        .then((data) => setCases(data.cases || []));
      setPlanFile(null);
    } else {
      const body = await res.json();
      setError(body.error || "Action failed.");
    }
  };

  // File input color change
  const fileInputStyle = planFile
    ? "bg-green-100 border-green-400"
    : "bg-red-100 border-red-400";

  // --- REVIEW MODAL ---
  if (selectedCase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <form className="bg-white rounded-xl shadow p-8 w-full max-w-lg" onSubmit={handleReview}>
          <h2 className="text-2xl font-bold mb-4 text-blue-700">Review Case</h2>
          <p className="mb-2">
            <b>Patient:</b> {selectedCase.patient.name} ({selectedCase.patient.email}) <br />
            <b>Patient ID:</b> {selectedCase.patient.patientId || selectedCase.patient.id}
          </p>
          <p className="mb-2"><b>Dentist:</b> Dr. {selectedCase.dentist.name}</p>
          <p className="mb-2"><b>Notes:</b> {selectedCase.notes}</p>
          <p className="mb-2">
            <b>Scan File:</b>{" "}
            <a
              href={`/api/files/${selectedCase.scanFileUrl.split("/").pop()}`}
              className="text-blue-700 underline"
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Download
            </a>
          </p>
          <label className="block mb-2 mt-4">Decision</label>
          <select
            className="w-full px-2 py-1 mb-2 border rounded"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="APPROVED">Approve (Upload Plan)</option>
            <option value="REJECTED">Reject</option>
          </select>
          {status === "APPROVED" && (
            <>
              <label className="block mb-2">Treatment Plan File</label>
              <input
                type="file"
                className={`w-full mb-2 border-2 rounded ${fileInputStyle} transition`}
                onChange={e => setPlanFile(e.target.files?.[0] || null)}
                style={{ padding: "6px", fontWeight: "bold" }}
              />
            </>
          )}
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {success && <div className="text-green-600 mb-2">{success}</div>}
          <div className="flex gap-4 mt-4">
            <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded">Submit</button>
            <button type="button" className="bg-gray-200 text-gray-700 px-4 py-2 rounded" onClick={() => setSelectedCase(null)}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="flex flex-col items-center min-h-screen pt-10">
      <div className="w-full max-w-3xl mb-4 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-2">
          <div>
            <div className="text-lg font-semibold text-blue-800">Reviewer: {reviewerName}</div>
            <div className="text-gray-500 text-sm">
              <b>Reviewer ID:</b> {reviewerId}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 text-right">
              <b>Pending Cases:</b> {pendingCases.length}
              <br />
              <b>Reviewed Cases:</b> {reviewedCases.length}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="ml-4 px-4 py-2 bg-gray-200 text-red-700 rounded-xl hover:bg-gray-300 font-bold"
            >
              Logout
            </button>
          </div>
        </div>
        <button
          className={`mt-2 mb-2 px-4 py-2 rounded font-bold ${
            showReviewed
              ? "bg-blue-100 text-blue-700 border border-blue-600"
              : "bg-gray-200 text-gray-700"
          } hover:bg-blue-200 transition`}
          onClick={() => setShowReviewed((v) => !v)}
        >
          {showReviewed ? "Hide Reviewed Cases" : "Show Reviewed Cases"}
        </button>
      </div>

      {/* Pending Cases */}
      {!showReviewed && (
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-3xl">
          <h2 className="text-3xl font-bold mb-6 text-blue-700">Cases Pending Review</h2>
          {pendingCases.length === 0 ? (
            <p className="text-gray-500">No pending cases.</p>
          ) : (
            <table className="w-full mb-6">
              <thead>
                <tr>
                  <th className="text-left py-2">Patient</th>
                  <th className="text-left py-2">Patient ID</th>
                  <th className="text-left py-2">Dentist</th>
                  <th className="text-left py-2">Submitted</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingCases.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2">{c.patient.name}</td>
                    <td className="py-2">{c.patient.patientId || c.patient.id}</td>
                    <td className="py-2">{c.dentist.name}</td>
                    <td className="py-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <button
                        className="bg-blue-700 text-white px-3 py-1 rounded"
                        onClick={() => setSelectedCase(c)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Reviewed Cases */}
      {showReviewed && (
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-3xl">
          <h2 className="text-3xl font-bold mb-6 text-blue-700">Your Reviewed Cases</h2>
          {reviewedCases.length === 0 ? (
            <p className="text-gray-500">No reviewed cases yet.</p>
          ) : (
            <table className="w-full mb-6">
              <thead>
                <tr>
                  <th className="text-left py-2">Patient</th>
                  <th className="text-left py-2">Patient ID</th>
                  <th className="text-left py-2">Dentist</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Submitted</th>
                  <th className="py-2">Treatment Plan</th>
                </tr>
              </thead>
              <tbody>
                {reviewedCases.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2">{c.patient.name}</td>
                    <td className="py-2">{c.patient.patientId || c.patient.id}</td>
                    <td className="py-2">{c.dentist.name}</td>
                    <td className="py-2">{c.status.replace("_", " ")}</td>
                    <td className="py-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      {c.treatmentPlanUrl ? (
                        <a
                          href={`/uploads/${c.treatmentPlanUrl}`}
                          className="text-blue-700 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
