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
    email: string; 
    id: string; 
    firstName?: string;
    lastName?: string;
  };
  dentist: { 
    name: string;
    id: string;
  };
  scanFileUrl?: string;
  upperScanFile?: string;
  lowerScanFile?: string;
  biteScanFile?: string;
  notes: string;
  createdAt: string;
  status: string;
  reviewerId?: string | null;
  treatmentPlanUrl?: string | null;
  reviewedAt?: string | null;
};

export default function ReviewerDashboard({ user }: { user: any }) {
  const { data: session } = useSession();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Review form states
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject'>('approve');
  const [treatmentPlanFile, setTreatmentPlanFile] = useState<File | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reviewerName = user?.name || session?.user?.name || "Reviewer";
  const reviewerId = user?.id || session?.user?.id;

  // Load cases
  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cases");
      const data = await res.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error("Error loading cases:", error);
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  // Filter cases
  const pendingReviewCases = cases.filter(c => c.status === CASE_STATUS.PENDING_REVIEW);
  const reviewedCases = cases.filter(c => 
    c.reviewerId === reviewerId && 
    [CASE_STATUS.AWAITING_CONSENT, CASE_STATUS.IN_TREATMENT, CASE_STATUS.REJECTED, CASE_STATUS.COMPLETED].includes(c.status)
  );

  // Parse scan files
  const parseScanFiles = (caseData: Case) => {
    const files: Record<string, string> = {};
    
    if (caseData.scanFileUrl) {
      try {
        return JSON.parse(caseData.scanFileUrl);
      } catch {
        files.scan = caseData.scanFileUrl;
      }
    }
    
    if (caseData.upperScanFile) files.upper = caseData.upperScanFile;
    if (caseData.lowerScanFile) files.lower = caseData.lowerScanFile;
    if (caseData.biteScanFile) files.bite = caseData.biteScanFile;
    
    return files;
  };

  // Handle review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (reviewDecision === 'approve' && !treatmentPlanFile) {
      toast.error("Please upload a treatment plan file for approval");
      return;
    }

    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append("status", reviewDecision === 'approve' ? 'APPROVED' : 'REJECTED');
      formData.append("reviewerId", reviewerId);
      formData.append("reviewNotes", reviewNotes);
      
      if (treatmentPlanFile) {
        formData.append("treatmentPlan", treatmentPlanFile);
      }

      // Debug logging
      console.log("Sending review data:", {
        status: reviewDecision === 'approve' ? CASE_STATUS.AWAITING_CONSENT : CASE_STATUS.REJECTED,
        reviewerId,
        reviewNotes,
        hasFile: !!treatmentPlanFile,
        endpoint: `/api/cases/${selectedCase?.id}/review`
      });

      const res = await fetch(`/api/cases/${selectedCase?.id}/review`, {
        method: "POST",
        body: formData,
      });

      const responseText = await res.text();
      console.log("Review response status:", res.status);
      console.log("Review response text:", responseText);

      if (res.ok) {
        toast.success(reviewDecision === 'approve' 
          ? "Case approved and sent for patient consent" 
          : "Case rejected"
        );
        setShowReviewModal(false);
        resetReviewForm();
        loadCases();
      } else {
        try {
          const data = JSON.parse(responseText);
          toast.error(data.error || "Failed to submit review");
        } catch {
          toast.error(`Failed to submit review: ${responseText}`);
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Error submitting review");
    } finally {
      setSubmitting(false);
    }
  };

  const resetReviewForm = () => {
    setSelectedCase(null);
    setReviewDecision('approve');
    setTreatmentPlanFile(null);
    setReviewNotes("");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      [CASE_STATUS.PENDING_REVIEW]: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review' },
      [CASE_STATUS.AWAITING_CONSENT]: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Awaiting Consent' },
      [CASE_STATUS.IN_TREATMENT]: { bg: 'bg-green-100', text: 'text-green-800', label: 'In Treatment' },
      [CASE_STATUS.MANUFACTURING]: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Manufacturing' },
      [CASE_STATUS.SHIPPED]: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Shipped' },
      [CASE_STATUS.REJECTED]: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
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
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reviewer Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {reviewerName} • ID: {reviewerId}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{pendingReviewCases.length}</span> pending
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{reviewedCases.length}</span> reviewed
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
            Pending Review ({pendingReviewCases.length})
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'reviewed'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            My Reviewed Cases ({reviewedCases.length})
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
                  {pendingReviewCases.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 mt-4">No cases pending review</p>
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
                            Submitted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pendingReviewCases.map((caseItem) => (
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
                                {new Date(caseItem.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(caseItem.createdAt).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(caseItem.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => {
                                  setSelectedCase(caseItem);
                                  setShowReviewModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                              >
                                Review Case
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {activeTab === 'reviewed' && (
                <>
                  {reviewedCases.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 mt-4">No reviewed cases yet</p>
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
                            Reviewed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Treatment Plan
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {reviewedCases.map((caseItem) => (
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
                                {caseItem.reviewedAt 
                                  ? new Date(caseItem.reviewedAt).toLocaleDateString()
                                  : new Date(caseItem.createdAt).toLocaleDateString()
                                }
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(caseItem.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {caseItem.treatmentPlanUrl ? (
                                <a
                                  href={`/api/files/${caseItem.treatmentPlanUrl}`}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  download
                                >
                                  Download
                                </a>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
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

      {/* Review Modal */}
      {showReviewModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Review Case</h2>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    resetReviewForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <form onSubmit={handleReviewSubmit}>
                {/* Case Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Case Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Case Number</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCase.caseNumber || selectedCase.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Case ID</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCase.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Patient Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCase.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Patient ID</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCase.patient.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Dentist</p>
                      <p className="font-medium text-gray-900 dark:text-white">Dr. {selectedCase.dentist.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Submitted</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedCase.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedCase.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Clinical Notes</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300">{selectedCase.notes}</p>
                    </div>
                  </div>
                )}

                {/* Scan Files */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Scan Files</h3>
                  <div className="space-y-2">
                    {Object.entries(parseScanFiles(selectedCase)).map(([type, filename]) => (
                      <div key={type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="font-medium capitalize text-gray-900 dark:text-white">
                          {type} Scan
                        </span>
                        <a
                          href={`/api/files/${filename}`}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          download
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Decision */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Review Decision</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="approve"
                        checked={reviewDecision === 'approve'}
                        onChange={(e) => setReviewDecision(e.target.value as 'approve' | 'reject')}
                        className="mr-3 text-blue-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        Approve - Send for patient consent
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="reject"
                        checked={reviewDecision === 'reject'}
                        onChange={(e) => setReviewDecision(e.target.value as 'approve' | 'reject')}
                        className="mr-3 text-blue-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        Reject - Request changes
                      </span>
                    </label>
                  </div>
                </div>

                {/* Treatment Plan Upload (for approval) */}
                {reviewDecision === 'approve' && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                      Treatment Plan <span className="text-red-500">*</span>
                    </h3>
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                      treatmentPlanFile 
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      <input
                        type="file"
                        onChange={(e) => setTreatmentPlanFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="treatment-plan-upload"
                        accept=".pdf,.stl,.zip"
                      />
                      <label
                        htmlFor="treatment-plan-upload"
                        className="cursor-pointer"
                      >
                        {treatmentPlanFile ? (
                          <div>
                            <p className="text-green-700 dark:text-green-400 font-medium">
                              {treatmentPlanFile.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Click to change file
                            </p>
                          </div>
                        ) : (
                          <div>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                              Click to upload treatment plan
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              PDF, STL, or ZIP files
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                )}

                {/* Review Notes */}
                <div className="mb-6">
                  <label className="block text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                    Review Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 h-24"
                    placeholder="Add any notes about your review decision..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      resetReviewForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (reviewDecision === 'approve' && !treatmentPlanFile)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                      reviewDecision === 'approve' 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {submitting ? 'Submitting...' : reviewDecision === 'approve' ? 'Approve Case' : 'Reject Case'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}