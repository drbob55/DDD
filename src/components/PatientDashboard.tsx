"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Appointments from "./Appointments"; // <--- IMPORT ADDED

type Case = {
    id: string;
    status: string;
    dentist: { name: string };
    reviewer?: { name: string };
    notes: string;
    treatmentPlanUrl?: string | null;
    createdAt: string;
};

export default function PatientDashboard({ user }: { user: any }) {
    const { data: session } = useSession();
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        fetch(`/api/cases?userId=${user.id}`)
            .then((res) => res.json())
            .then((data) => setCases(data.cases));
    }, [user.id]);

    useEffect(() => {
        fetch(`/api/notifications?userId=${user.id}`)
            .then((res) => res.json())
            .then((data) => setNotifications(data.notifications || []));
    }, [user.id]);

    const handleConsent = async (consent: boolean) => {
        setError("");
        setSuccess("");
        const res = await fetch(`/api/cases/${selectedCase?.id}/consent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consent }),
        });
        if (res.ok) {
            setSuccess(consent ? "Consent given!" : "Declined.");
            setSelectedCase(null);
            // Refresh case list
            fetch(`/api/cases?userId=${user.id}`)
                .then((res) => res.json())
                .then((data) => setCases(data.cases));
        } else {
            const body = await res.json();
            setError(body.error || "Failed.");
        }
    };

    return selectedCase ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="bg-white rounded-xl shadow p-8 w-full max-w-lg text-center">
                <h2 className="text-2xl font-bold mb-4 text-blue-700">Case Details</h2>
                <p className="mb-2"><b>Dentist:</b> Dr. {selectedCase.dentist.name}</p>
                <p className="mb-2"><b>Notes:</b> {selectedCase.notes}</p>
                {selectedCase.treatmentPlanUrl && (
                    <p className="mb-2">
                        <b>Treatment Plan:</b>{" "}
                        <a href={selectedCase.treatmentPlanUrl} className="text-blue-700 underline" target="_blank" rel="noopener noreferrer">
                            Download
                        </a>
                    </p>
                )}

                {/* Appointments for this case */}
                <Appointments caseId={selectedCase.id} userId={user.id} />

                {error && <div className="text-red-500 mb-2">{error}</div>}
                {success && <div className="text-green-600 mb-2">{success}</div>}
                {selectedCase.status === "AWAITING_CONSENT" && (
                    <div className="flex gap-4 justify-center mt-4">
                        <button
                            className="bg-green-600 text-white px-4 py-2 rounded"
                            onClick={() => handleConsent(true)}
                        >
                            Consent
                        </button>
                        <button
                            className="bg-red-600 text-white px-4 py-2 rounded"
                            onClick={() => handleConsent(false)}
                        >
                            Decline
                        </button>
                    </div>
                )}
                <button
                    className="mt-4 bg-gray-200 text-gray-700 px-4 py-2 rounded"
                    onClick={() => setSelectedCase(null)}
                >
                    Back
                </button>
            </div>
        </div>
    ) : (
        <div className="flex flex-col items-center min-h-screen pt-10">
            <div className="bg-white rounded-xl shadow p-8 w-full max-w-3xl">
                <h2 className="text-3xl font-bold mb-6 text-blue-700">Your Aligner Cases</h2>

                {/* NOTIFICATIONS BLOCK */}
                {notifications.length > 0 && (
                    <div className="mb-6">
                        {notifications.filter((n) => !n.read).map((n) => (
                            <div key={n.id} className="bg-green-100 text-green-800 p-3 mb-2 rounded-xl shadow text-center">
                                {n.message}
                            </div>
                        ))}
                        <button
                            className="text-xs text-gray-500 underline mt-1"
                            onClick={async () => {
                                await fetch("/api/notifications", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ userId: user.id }),
                                });
                                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                            }}
                        >
                            Mark all as read
                        </button>
                    </div>
                )}
                {/* END NOTIFICATIONS BLOCK */}

                {cases.length === 0 ? (
                    <p className="text-gray-500">No cases yet.</p>
                ) : (
                    <table className="w-full mb-6">
                        <thead>
                            <tr>
                                <th className="text-left py-2">Dentist</th>
                                <th className="text-left py-2">Status</th>
                                <th className="text-left py-2">Submitted</th>
                                <th className="py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map((c) => (
                                <tr key={c.id} className="border-t">
                                    <td className="py-2">Dr. {c.dentist.name}</td>
                                    <td className="py-2">{c.status.replace("_", " ")}</td>
                                    <td className="py-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                                    <td className="py-2">
                                        <button
                                            className="bg-blue-700 text-white px-3 py-1 rounded"
                                            onClick={() => setSelectedCase(c)}
                                        >
                                            View
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
