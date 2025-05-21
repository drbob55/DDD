"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function NewCase() {
    const { data: session } = useSession();
    const router = useRouter();
    const [form, setForm] = useState({
        patientName: "",
        patientEmail: "",
        notes: "",
        scanFile: null as File | null,
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    if (!session?.user || session.user.role !== "DENTIST") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="bg-white rounded-xl shadow p-8 text-center">
                    <h2 className="text-xl text-red-500 font-semibold">Dentist Access Only</h2>
                </div>
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, files } = e.target as any;
        setForm((prev) => ({
            ...prev,
            [name]: files ? files[0] : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.scanFile) {
            setError("Scan file is required.");
            return;
        }

        const data = new FormData();
        data.append("patientName", form.patientName);
        data.append("patientEmail", form.patientEmail);
        data.append("notes", form.notes);
        data.append("dentistId", session.user.id);
        data.append("scanFile", form.scanFile);

        const res = await fetch("/api/cases", {
            method: "POST",
            body: data,
        });

        if (res.ok) {
            setSuccess("Case submitted successfully!");
            setTimeout(() => router.push("/dashboard"), 1500);
        } else {
            const body = await res.json();
            setError(body.error || "Submission failed.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">Submit New Case</h2>
                {error && <div className="text-red-500 mb-2">{error}</div>}
                {success && <div className="text-green-600 mb-2">{success}</div>}
                <label className="block mb-2 font-semibold">Patient Name</label>
                <input name="patientName" type="text" required className="w-full mb-3 px-4 py-2 border rounded" value={form.patientName} onChange={handleChange} />
                <label className="block mb-2 font-semibold">Patient Email</label>
                <input name="patientEmail" type="email" required className="w-full mb-3 px-4 py-2 border rounded" value={form.patientEmail} onChange={handleChange} />
                <label className="block mb-2 font-semibold">Case Notes</label>
                <textarea name="notes" className="w-full mb-3 px-4 py-2 border rounded" value={form.notes} onChange={handleChange} />
                <label className="block mb-2 font-semibold">3D Scan File</label>
                <input name="scanFile" type="file" required accept=".stl,.obj,.zip" className="w-full mb-4" onChange={handleChange} />
                <button type="submit" className="w-full bg-blue-700 text-white font-bold py-2 rounded mt-2">Submit Case</button>
            </form>
        </div>
    );
}
