"use client";

import { useEffect, useState } from "react";

type Appointment = {
    id: string;
    date: string;
    notes?: string;
};

export default function Appointments({ caseId, canAdd, userId }: { caseId: string, canAdd?: boolean, userId: string }) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        fetch(`/api/appointments?caseId=${caseId}`)
            .then(res => res.json())
            .then(data => setAppointments(data.appointments));
    }, [caseId, success]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setSuccess("");
        if (!date) { setError("Pick a date."); return; }
        const res = await fetch("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseId, userId, date, notes }),
        });
        if (res.ok) {
            setSuccess("Appointment added.");
            setDate(""); setNotes("");
        } else {
            setError("Could not add appointment.");
        }
    };

    return (
        <div className="mt-4 mb-4">
            <h3 className="font-semibold text-blue-700 mb-2">Appointments</h3>
            {appointments.length === 0 && <p className="text-gray-500">No appointments scheduled.</p>}
            <ul>
                {appointments.map(a => (
                    <li key={a.id} className="mb-2">
                        <span className="inline-block bg-gray-100 px-3 py-1 rounded">
                            {new Date(a.date).toLocaleString()} {a.notes && <>- <i>{a.notes}</i></>}
                        </span>
                    </li>
                ))}
            </ul>
            {canAdd && (
                <form className="mt-4 flex flex-col gap-2" onSubmit={handleAdd}>
                    <input
                        type="datetime-local"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="border rounded px-2 py-1"
                        required
                    />
                    <input
                        type="text"
                        value={notes}
                        placeholder="Notes (optional)"
                        onChange={e => setNotes(e.target.value)}
                        className="border rounded px-2 py-1"
                    />
                    {error && <div className="text-red-500">{error}</div>}
                    {success && <div className="text-green-600">{success}</div>}
                    <button type="submit" className="bg-blue-700 text-white px-3 py-1 rounded w-32">Add</button>
                </form>
            )}
        </div>
    );
}
