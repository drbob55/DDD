"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Appointments from "./Appointments";

type Case = {
    id: string;
    status: string;
    patient: { name: string };
    notes: string;
    treatmentPlanUrl?: string | null;
    createdAt: string;
};

export default function DentistDashboard({ user }: { user: any }) {
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    useEffect(() => {
        // Fetch all cases submitted by this dentist
        fetch(`/api/cases?dentistId=${user.id}`)
            .then((res) => res.json())
            .then((data) => setCases(data.cases || []));
    }, [user.id]);

    if (selectedCase) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="bg-white rounded-xl shadow p-8 w-full max-w-lg text-center">
                    <h2 className="text-2xl font-bold mb-4 text-blue-700">Case Details</h2>
                    <p className="mb-2"><b>Patient:</b> {selectedCase.patient.name}</p>
                    <p className="mb-2"><b>Notes:</b> {selectedCase.notes}</p>
                    {selectedCase.treatmentPlanUrl && (
                        <p className="mb-2">
                            <b>Treatment Plan:</b>{" "}
                            <a
                                href={selectedCase.treatmentPlanUrl}
                                className="text-blue-700 underline"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Download
                            </a>
                        </p>
                    )}
                    {/* Appointments block */}
                    <Appointments
                        caseId={selectedCase.id}
                        canAdd={true}
                        userId={user.id}
                    />
                    <button
                        className="mt-4 bg-gray-200 text-gray-700 px-4 py-2 rounded"
                        onClick={() => setSelectedCase(null)}
                    >
                        Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="bg-white rounded-xl shadow p-8 w-full max-w-xl text-center">
                <h2 className="text-3xl font-bold mb-4 text-blue-700">
                    Welcome, Dr. {user.name}!
                </h2>
                <p className="text-gray-600 mb-4">This is your dentist dashboard.</p>
                <ul className="mb-6 text-left">
                    <li>• Submit new patient cases</li>
                    <li>• Upload 3D scans</li>
                    <li>• Track submitted and active cases</li>
                    <li>• Schedule follow-ups</li>
                </ul>
                <Link
                    href="/cases/new"
                    className="inline-block mt-2 bg-blue-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-800"
                >
                    Submit New Case
                </Link>
                {/* List of cases table */}
                {cases.length > 0 && (
                    <div className="mt-10">
                        <h3 className="text-xl font-bold mb-4">Your Cases</h3>
                        <table className="w-full mb-6">
                            <thead>
                                <tr>
                                    <th className="text-left py-2">Patient</th>
                                    <th className="text-left py-2">Status</th>
                                    <th className="text-left py-2">Submitted</th>
                                    <th className="py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.map((c) => (
                                    <tr key={c.id} className="border-t">
                                        <td className="py-2">{c.patient.name}</td>
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
                    </div>
                )}
            </div>
        </div>
    );
}
