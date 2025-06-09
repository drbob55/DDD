"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { CASE_STATUS } from "@/lib/constants";

type Case = {
    id: string;
    caseNumber?: string;
    patient: { 
        name: string;
        id: string;
    };
    dentist: { 
        name: string;
        id: string;
    };
    treatmentPlanUrl: string;
    status: string;
    createdAt: string;
    consentedAt?: string;
    shippedAt?: string;
    manufacturerId?: string;
};

export default function ManufacturerDashboard({ user }: { user: any }) {
    const { data: session } = useSession();
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'shipped'>('pending');

    useEffect(() => {
        loadCases();
    }, [user?.id]);

    const loadCases = async () => {
        setLoading(true);
        try {
            // Fetch cases assigned to this manufacturer
            const res = await fetch(`/api/cases?manufacturerId=${user.id}`);
            const data = await res.json();
            setCases(data.cases || []);
        } catch (error) {
            console.error("Error loading cases:", error);
            toast.error("Failed to load cases");
        } finally {
            setLoading(false);
        }
    };

    const handleShip = async (caseId: string) => {
        try {
            const res = await fetch(`/api/cases/${caseId}/ship`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
                toast.success("Case marked as shipped!");
                loadCases();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to mark as shipped");
            }
        } catch (error) {
            console.error("Error shipping case:", error);
            toast.error("Failed to mark as shipped");
        }
    };

    // Filter cases by status
    const pendingCases = cases.filter(c => c.status === CASE_STATUS.MANUFACTURING);
    const shippedCases = cases.filter(c => c.status === CASE_STATUS.SHIPPED || c.status === CASE_STATUS.COMPLETED);

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            [CASE_STATUS.MANUFACTURING]: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Manufacturing' },
            [CASE_STATUS.SHIPPED]: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Shipped' },
            [CASE_STATUS.COMPLETED]: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' }
        };
        
        const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
        
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Manufacturer Dashboard</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {user.name} • ID: {user.id}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">{pendingCases.length}</span> to manufacture
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">{shippedCases.length}</span> shipped
                                </div>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                            activeTab === 'pending'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        To Manufacture ({pendingCases.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('shipped')}
                        className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                            activeTab === 'shipped'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        Shipped ({shippedCases.length})
                    </button>
                </div>

                {/* Cases Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading cases...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'pending' && (
                                <>
                                    {pendingCases.length === 0 ? (
                                        <div className="text-center py-12">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                            <p className="text-gray-500 dark:text-gray-400 mt-4">No aligners to manufacture</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Case Info
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Patient
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Dentist
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Consent Date
                                                    </th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Treatment Plan
                                                    </th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {pendingCases.map((caseItem) => (
                                                    <tr key={caseItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {caseItem.caseNumber || caseItem.id}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ID: {caseItem.id}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {caseItem.patient.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ID: {caseItem.patient.id}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900 dark:text-white">
                                                                Dr. {caseItem.dentist.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900 dark:text-white">
                                                                {caseItem.consentedAt 
                                                                    ? new Date(caseItem.consentedAt).toLocaleDateString()
                                                                    : new Date(caseItem.createdAt).toLocaleDateString()
                                                                }
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <a
                                                                href={`/api/files/${caseItem.treatmentPlanUrl}`}
                                                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                                download
                                                            >
                                                                Download
                                                            </a>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <button
                                                                onClick={() => handleShip(caseItem.id)}
                                                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                                            >
                                                                Mark as Shipped
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}

                            {activeTab === 'shipped' && (
                                <>
                                    {shippedCases.length === 0 ? (
                                        <div className="text-center py-12">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <p className="text-gray-500 dark:text-gray-400 mt-4">No shipped cases yet</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Case Info
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Patient
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Dentist
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Shipped Date
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {shippedCases.map((caseItem) => (
                                                    <tr key={caseItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {caseItem.caseNumber || caseItem.id}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ID: {caseItem.id}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {caseItem.patient.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ID: {caseItem.patient.id}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900 dark:text-white">
                                                                Dr. {caseItem.dentist.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900 dark:text-white">
                                                                {caseItem.shippedAt 
                                                                    ? new Date(caseItem.shippedAt).toLocaleDateString()
                                                                    : '—'
                                                                }
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {getStatusBadge(caseItem.status)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}