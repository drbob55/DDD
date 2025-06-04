"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Case = {
    id: string;
    patient: { name: string };
    dentist: { name: string };
    treatmentPlanUrl: string;
    createdAt: string;
};

export default function ManufacturerDashboard({ user }: { user: any }) {
    const { data: session } = useSession();
    const [cases, setCases] = useState<Case[]>([]);
    const [shipped, setShipped] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/cases?status=IN_TREATMENT")
            .then((res) => res.json())
            .then((data) => setCases(data.cases));
    }, [shipped]);

    const handleShip = async (caseId: string) => {
        setError("");
        const res = await fetch(`/api/cases/${caseId}/ship`, {
            method: "POST",
        });
        if (res.ok) {
            setShipped(caseId);
        } else {
            setError("Could not mark as shipped.");
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen pt-10">
            <div className="bg-white rounded-xl shadow p-8 w-full max-w-3xl">
                <h2 className="text-3xl font-bold mb-6 text-blue-700">Aligners to Manufacture</h2>
                {error && <div className="text-red-500 mb-2">{error}</div>}
                {cases.length === 0 ? (
                    <p className="text-gray-500">No aligners to manufacture right now.</p>
                ) : (
                    <table className="w-full mb-6">
                        <thead>
                            <tr>
                                <th className="text-left py-2">Patient</th>
                                <th className="text-left py-2">Dentist</th>
                                <th className="text-left py-2">Submitted</th>
                                <th className="py-2">Plan</th>
                                <th className="py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map((c) => (
                                <tr key={c.id} className="border-t">
                                    <td className="py-2">{c.patient.name}</td>
                                    <td className="py-2">Dr. {c.dentist.name}</td>
                                    <td className="py-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                                    <td className="py-2">
                                        <a
                                            href={c.treatmentPlanUrl}
                                            className="text-blue-700 underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                        >
                                            Download Plan
                                        </a>
                                    </td>
                                    <td className="py-2">
                                        <button
                                            className="bg-green-600 text-white px-3 py-1 rounded"
                                            onClick={() => handleShip(c.id)}
                                            disabled={shipped === c.id}
                                        >
                                            {shipped === c.id ? "Shipped!" : "Mark as Shipped"}
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
