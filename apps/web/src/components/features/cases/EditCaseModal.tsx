import { useState } from "react";

export default function EditCaseModal({
    caseData,
    onClose,
    onUpdated,
}: {
    caseData: any;
    onClose: () => void;
    onUpdated?: () => void;
}) {
    // Split the name if you store it as a single string
    const [firstName, setFirstName] = useState(caseData.firstName ?? "");
    const [lastName, setLastName] = useState(caseData.lastName ?? "");
    const [email, setEmail] = useState(caseData.email ?? "");
    const [phone, setPhone] = useState(caseData.phone ?? "");
    const [status, setStatus] = useState(caseData.status ?? "");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [err, setErr] = useState("");

    // Example update handler
    async function handleUpdate() {
        setSaving(true);
        setErr("");
        setSuccess("");
        try {
            const res = await fetch(`/api/cases/${caseData.id}/edit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    phone,
                    status,
                }),
            });
            if (res.ok) {
                setSuccess("Saved!");
                onUpdated?.();
                setTimeout(onClose, 800);
            } else {
                const body = await res.json();
                setErr(body.error || "Update failed.");
            }
        } catch (e) {
            setErr("Error saving changes.");
        }
        setSaving(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-fade-in">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>
                <h2 className="text-2xl font-bold mb-3 text-blue-700">Edit Case</h2>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate();
                    }}
                >
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm mb-1 font-semibold">First Name</label>
                            <input
                                className="w-full border rounded px-3 py-2"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1 font-semibold">Last Name</label>
                            <input
                                className="w-full border rounded px-3 py-2"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <label className="block text-sm mb-1 font-semibold">Email</label>
                    <input
                        className="w-full border rounded px-3 py-2 mb-2"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        required
                    />
                    <label className="block text-sm mb-1 font-semibold">Phone</label>
                    <input
                        className="w-full border rounded px-3 py-2 mb-2"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        type="tel"
                    />
                    <label className="block text-sm mb-1 font-semibold">Status</label>
                    <select
                        className="w-full border rounded px-3 py-2 mb-4"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="PENDING_REVIEW">Pending Review</option>
                        <option value="AWAITING_CONSENT">Awaiting Consent</option>
                        <option value="IN_TREATMENT">In Treatment</option>
                        <option value="MANUFACTURING">Manufacturing</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                    {err && <div className="text-red-500 mb-2">{err}</div>}
                    {success && <div className="text-green-600 mb-2">{success}</div>}
                    <div className="flex gap-2 mt-4">
                        <button
                            type="submit"
                            className={`bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded transition`}
                            disabled={saving}
                        >
                            {saving ? <span className="animate-spin mr-2">⏳</span> : "Save"}
                        </button>
                        <button
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded transition"
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
