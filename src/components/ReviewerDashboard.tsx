"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Case = {
    id: string;
    patient: { name: string; email: string };
    dentist: { name: string };
    scanFileUrl: string;
    notes: string;
    createdAt: string;
};

export default function ReviewerDashboard({ user }: { user: any }) {
    const { data: session } = useSession();
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [status, setStatus] = useState("APPROVED");
    const [planFile, setPlanFile] = useState<File | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Load cases on mount
    useEffect(() => {
        fetch("/api/cases")
            .then((res) => res.json())
            .then((data) => setCases(data.cases || []));
    }, []);

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
        formData.append("reviewerId", session?.user.id);
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
        } else {
            const body = await res.json();
            setError(body.error || "Action failed.");
        }
    };

    if (selectedCase) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <form className="bg-white rounded-xl shadow p-8 w-full max-w-lg" onSubmit={handleReview}>
                    <h2 className="text-2xl font-bold mb-4 text-blue-700">Review Case</h2>
                    <p className="mb-2"><b>Patient:</b> {selectedCase.patient.name} ({selectedCase.patient.email})</p>
                    <p className="mb-2"><b>Dentist:</b> Dr. {selectedCase.dentist.name}</p>
                    <p className="mb-2"><b>Notes:</b> {selectedCase.notes}</p>
                    <p className="mb-2">
                        <b>Scan File:</b> <a href={selectedCase.scanFileUrl} className="text-blue-700 underline" target="_blank">Download</a>
                    </p>
                    <label className="block mb-2 mt-4">Decision</label>
                    <select className="w-full px-2 py-1 mb-2 border rounded" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="APPROVED">Approve (Upload Plan)</option>
                        <option value="REJECTED">Reject</option>
                    </select>
                    {status === "APPROVED" && (
                        <>
                            <label className="block mb-2">Treatment Plan File</label>
                            <input type="file" className="w-full mb-2" onChange={e => setPlanFile(e.target.files?.[0] || null)} />
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

    return (
        <div className="flex flex-col items-center min-h-screen pt-10">
            <div className="bg-white rounded-xl shadow p-8 w-full max-w-3xl">
                <h2 className="text-3xl font-bold mb-6 text-blue-700">Cases Pending Review</h2>
                {cases.length === 0 ? (
                    <p className="text-gray-500">No pending cases.</p>
                ) : (
                    <table className="w-full mb-6">
                        <thead>
                            <tr>
                                <th className="text-left py-2">Patient</th>
                                <th className="text-left py-2">Dentist</th>
                                <th className="text-left py-2">Submitted</th>
                                <th className="py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map((c) => (
                                <tr key={c.id} className="border-t">
                                    <td className="py-2">{c.patient.name}</td>
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
        </div>
    );
}
