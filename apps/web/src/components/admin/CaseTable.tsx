// src/components/admin/CaseTable.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

// Define CASE_STATUS locally if import is causing issues
const CASE_STATUS = {
  PENDING_REVIEW: "PENDING_REVIEW",
  AWAITING_CONSENT: "AWAITING_CONSENT", 
  IN_TREATMENT: "IN_TREATMENT",
  MANUFACTURING: "MANUFACTURING",
  SHIPPED: "SHIPPED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
};

// Define PAYMENT_STATUS locally
const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
};

type Payment = {
  id?: string;
  status: string;
  amount: string;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
  paymentMethod?: string;
  transactionId?: string;
};

type Case = {
  id: string;
  caseNumber?: string;
  patientId: string;
  dentistId: string | null;
  reviewerId: string | null;
  manufacturerId: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  dentist?: { id: string; name: string; email: string } | null;
  reviewer?: { id: string; name: string; email: string } | null;
  manufacturer?: { id: string; name: string; email: string } | null;
  patient?: { 
    id: string; 
    userId?: string;
    name: string; 
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  hiddenByDentist?: boolean;
  patientConsented?: boolean;
  treatmentPlanUrl?: string;
  payment?: Payment | null;
};

type User = { id: string; name: string; email: string };

type SortConfig = {
  key: keyof Case | 'patientName' | 'paymentStatus';
  direction: 'asc' | 'desc';
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  [CASE_STATUS.PENDING_REVIEW]: { 
    bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
    text: 'text-yellow-800 dark:text-yellow-400', 
    label: 'Pending Review' 
  },
  [CASE_STATUS.AWAITING_CONSENT]: { 
    bg: 'bg-orange-100 dark:bg-orange-900/30', 
    text: 'text-orange-800 dark:text-orange-400', 
    label: 'Awaiting Consent' 
  },
  [CASE_STATUS.IN_TREATMENT]: { 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-800 dark:text-blue-400', 
    label: 'In Treatment' 
  },
  [CASE_STATUS.MANUFACTURING]: { 
    bg: 'bg-purple-100 dark:bg-purple-900/30', 
    text: 'text-purple-800 dark:text-purple-400', 
    label: 'Manufacturing' 
  },
  [CASE_STATUS.SHIPPED]: { 
    bg: 'bg-indigo-100 dark:bg-indigo-900/30', 
    text: 'text-indigo-800 dark:text-indigo-400', 
    label: 'Shipped' 
  },
  [CASE_STATUS.COMPLETED]: { 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-800 dark:text-green-400', 
    label: 'Completed' 
  },
  [CASE_STATUS.REJECTED]: { 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-800 dark:text-red-400', 
    label: 'Rejected' 
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  [PAYMENT_STATUS.PENDING]: { 
    bg: 'bg-gray-100 dark:bg-gray-700', 
    text: 'text-gray-800 dark:text-gray-300', 
    label: 'Pending',
    icon: '⏳'
  },
  [PAYMENT_STATUS.PROCESSING]: { 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-800 dark:text-blue-400', 
    label: 'Processing',
    icon: '🔄'
  },
  [PAYMENT_STATUS.PAID]: { 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-800 dark:text-green-400', 
    label: 'Paid',
    icon: '✅'
  },
  [PAYMENT_STATUS.FAILED]: { 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-800 dark:text-red-400', 
    label: 'Failed',
    icon: '❌'
  },
  [PAYMENT_STATUS.REFUNDED]: { 
    bg: 'bg-orange-100 dark:bg-orange-900/30', 
    text: 'text-orange-800 dark:text-orange-400', 
    label: 'Refunded',
    icon: '↩️'
  },
  [PAYMENT_STATUS.CANCELLED]: { 
    bg: 'bg-gray-100 dark:bg-gray-700', 
    text: 'text-gray-800 dark:text-gray-300', 
    label: 'Cancelled',
    icon: '🚫'
  },
};

export default function CaseTable() {
  const { data: session } = useSession();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Multi-select
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  
  // Users lists
  const [dentists, setDentists] = useState<User[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [manufacturers, setManufacturers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Modals
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [assignType, setAssignType] = useState<'reviewer' | 'manufacturer' | 'dentist' | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [caseNotes, setCaseNotes] = useState<string>("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchDentists = async () => {
    try {
      const res = await fetch("/api/users?role=DENTIST");
      if (!res.ok) throw new Error('Failed to fetch dentists');
      const data = await res.json();
      setDentists(data.users || []);
    } catch (error) {
      console.error("Error fetching dentists:", error);
    }
  };

  const fetchReviewers = async () => {
    try {
      const res = await fetch("/api/users?role=REVIEWER");
      if (!res.ok) throw new Error('Failed to fetch reviewers');
      const data = await res.json();
      setReviewers(data.users || []);
    } catch (error) {
      console.error("Error fetching reviewers:", error);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const res = await fetch("/api/users?role=MANUFACTURER");
      if (!res.ok) throw new Error('Failed to fetch manufacturers');
      const data = await res.json();
      setManufacturers(data.users || []);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
    }
  };

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cases");
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Fetched cases data:", data); // Debug log
      
      // Handle different response structures
      const casesArray = data.cases || data.data || data || [];
      
      if (!Array.isArray(casesArray)) {
        console.error("Cases data is not an array:", casesArray);
        setCases([]);
        setError("Invalid data format received from server");
        return;
      }
      
      setCases(casesArray);
    } catch (error) {
      console.error("Error fetching cases:", error);
      setError(error instanceof Error ? error.message : "Failed to load cases");
      setCases([]);
      toast.error("Failed to load cases. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch all data on mount
    Promise.all([
      fetchCases(),
      fetchDentists(),
      fetchReviewers(),
      fetchManufacturers(),
      fetchUsers()
    ]).catch(err => {
      console.error("Error loading initial data:", err);
    });

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchCases();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Add focus refresh - refetch when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if component is mounted and not currently loading
      if (!loading) {
        fetchCases();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    // Also refresh when switching tabs within the app
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !loading) {
        fetchCases();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loading]);

  const updateStatus = async (id: string, status: string) => {
    try {
      console.log("Updating status for case:", id, "to:", status);
      
      const res = await fetch(`/api/cases`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: id, status }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Case status updated");
        fetchCases();
      } else {
        console.error("Status update failed:", data);
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error updating status");
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/cases`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: id, notes }),
      });
      
      if (res.ok) {
        toast.success("Notes updated");
        setShowNotesModal(false);
        setCaseNotes("");
        fetchCases();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update notes");
      }
    } catch (error) {
      toast.error("Error updating notes");
    }
  };

  const handleAssign = async () => {
    if (!selectedCase || !assigneeId) return;

    try {
      let endpoint = '';
      let body: any = {};

      if (assignType === 'reviewer') {
        endpoint = `/api/cases/${selectedCase.id}/reassign-reviewer`;
        body = { reviewerId: assigneeId };
      } else if (assignType === 'dentist') {
        endpoint = `/api/cases/${selectedCase.id}/reassign-dentist`;
        body = { dentistId: assigneeId };
      } else if (assignType === 'manufacturer') {
        endpoint = `/api/cases`;
        body = { caseId: selectedCase.id, manufacturerId: assigneeId };
      }

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(`${assignType.charAt(0).toUpperCase() + assignType.slice(1)} assigned successfully`);
        setShowAssignModal(false);
        setSelectedCase(null);
        setAssigneeId("");
        fetchCases();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to assign");
      }
    } catch (error) {
      toast.error("Error assigning");
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedCases.length === 0) return;
    
    toast.loading(`Updating ${selectedCases.length} cases...`);
    try {
      const promises = selectedCases.map(id =>
        fetch(`/api/cases`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: id, status }),
        })
      );
      
      await Promise.all(promises);
      toast.dismiss();
      toast.success(`${selectedCases.length} cases updated`);
      setSelectedCases([]);
      fetchCases();
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to update some cases");
    }
  };

  const openAssignModal = (caseItem: Case, type: 'reviewer' | 'manufacturer' | 'dentist') => {
    setSelectedCase(caseItem);
    setAssignType(type);
    setAssigneeId(
      type === 'reviewer' ? caseItem.reviewerId || "" : 
      type === 'dentist' ? caseItem.dentistId || "" :
      caseItem.manufacturerId || ""
    );
    setShowAssignModal(true);
  };

  const openDetailsModal = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setShowDetailsModal(true);
  };

  const openNotesModal = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setCaseNotes(caseItem.notes || "");
    setShowNotesModal(true);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', label: status };
    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (payment: Payment | null) => {
    if (!payment) {
      return (
        <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
          ❌ Unpaid
        </span>
      );
    }

    const config = PAYMENT_STATUS_CONFIG[payment.status] || { 
      bg: 'bg-gray-100 dark:bg-gray-700', 
      text: 'text-gray-800 dark:text-gray-300', 
      label: payment.status,
      icon: '❓'
    };
    
    const formatCurrency = (amount: string, currency: string) => {
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
        }).format(parseFloat(amount));
      } catch (err) {
        return `${currency} ${amount}`;
      }
    };
    
    return (
      <div className="relative group">
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
          {config.icon} {config.label}
        </span>
        
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          <div className="text-left">
            <div className="font-semibold">Payment Details</div>
            {payment.amount && payment.currency && (
              <div>Amount: {formatCurrency(payment.amount, payment.currency)}</div>
            )}
            {payment.paymentMethod && (
              <div>Method: {payment.paymentMethod.replace(/_/g, ' ')}</div>
            )}
            {payment.updatedAt && (
              <div>Date: {new Date(payment.updatedAt).toLocaleDateString()}</div>
            )}
            {payment.transactionId && (
              <div>TX ID: {payment.transactionId}</div>
            )}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
    );
  };

  // Sorting function
  const sortData = (key: keyof Case | 'patientName' | 'paymentStatus') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort cases
  const filteredAndSortedCases = useMemo(() => {
    let filtered = cases.filter(caseItem => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        caseItem.id.toLowerCase().includes(searchLower) ||
        caseItem.caseNumber?.toLowerCase().includes(searchLower) ||
        caseItem.patient?.name?.toLowerCase().includes(searchLower) ||
        caseItem.patient?.email?.toLowerCase().includes(searchLower) ||
        caseItem.dentist?.name?.toLowerCase().includes(searchLower) ||
        caseItem.reviewer?.name?.toLowerCase().includes(searchLower) ||
        caseItem.manufacturer?.name?.toLowerCase().includes(searchLower);
      
      // Status filter
      const matchesStatus = !statusFilter || caseItem.status === statusFilter;
      
      // Payment status filter
      const matchesPaymentStatus = !paymentStatusFilter || 
        (paymentStatusFilter === "NO_PAYMENT" ? !caseItem.payment : caseItem.payment?.status === paymentStatusFilter);
      
      // Assignment filter
      let matchesAssignment = true;
      if (assignmentFilter === "NEEDS_REVIEWER") {
        matchesAssignment = caseItem.status === CASE_STATUS.PENDING_REVIEW && !caseItem.reviewerId;
      } else if (assignmentFilter === "NEEDS_MANUFACTURER") {
        matchesAssignment = caseItem.status === CASE_STATUS.MANUFACTURING && !caseItem.manufacturerId;
      } else if (assignmentFilter === "FULLY_ASSIGNED") {
        matchesAssignment = (caseItem.reviewerId !== null || caseItem.status !== CASE_STATUS.PENDING_REVIEW) &&
                           (caseItem.manufacturerId !== null || caseItem.status !== CASE_STATUS.MANUFACTURING);
      }
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== "ALL" && caseItem.createdAt) {
        const caseDate = new Date(caseItem.createdAt);
        const now = new Date();
        
        switch (dateFilter) {
          case "TODAY":
            matchesDate = caseDate.toDateString() === now.toDateString();
            break;
          case "WEEK":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = caseDate >= weekAgo;
            break;
          case "MONTH":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = caseDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesAssignment && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (sortConfig.key === 'patientName') {
        aValue = a.patient?.name?.toLowerCase() || '';
        bValue = b.patient?.name?.toLowerCase() || '';
      } else if (sortConfig.key === 'paymentStatus') {
        aValue = a.payment?.status || 'NO_PAYMENT';
        bValue = b.payment?.status || 'NO_PAYMENT';
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [cases, searchTerm, statusFilter, paymentStatusFilter, assignmentFilter, dateFilter, sortConfig]);

  // Pagination
  const paginatedCases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedCases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedCases, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedCases.length / itemsPerPage);

  // Stats
  const stats = useMemo(() => {
    const needsReviewer = cases.filter(c => c.status === CASE_STATUS.PENDING_REVIEW && !c.reviewerId).length;
    const needsManufacturer = cases.filter(c => c.status === CASE_STATUS.MANUFACTURING && !c.manufacturerId).length;
    const awaitingConsent = cases.filter(c => c.status === CASE_STATUS.AWAITING_CONSENT).length;
    const paidCases = cases.filter(c => c.payment?.status === PAYMENT_STATUS.PAID).length;
    const statusCounts = cases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { needsReviewer, needsManufacturer, awaitingConsent, paidCases, statusCounts };
  }, [cases]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Case ID', 'Case Number', 'Patient', 'Patient ID', 'Dentist', 'Reviewer', 'Manufacturer', 'Status', 'Payment Status', 'Payment Amount', 'Created', 'Consented', 'Notes'];
    const rows = filteredAndSortedCases.map(caseItem => [
      caseItem.id,
      caseItem.caseNumber || '',
      caseItem.patient?.name || '',
      caseItem.patient?.userId || caseItem.patient?.id || '',
      caseItem.dentist?.name || '',
      caseItem.reviewer?.name || '',
      caseItem.manufacturer?.name || '',
      STATUS_CONFIG[caseItem.status]?.label || caseItem.status,
      caseItem.payment ? PAYMENT_STATUS_CONFIG[caseItem.payment.status]?.label || caseItem.payment.status : 'No Payment',
      caseItem.payment ? `${caseItem.payment.currency} ${caseItem.payment.amount}` : '',
      caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString() : '',
      caseItem.patientConsented ? 'Yes' : 'No',
      caseItem.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Case Management</h2>
          <div className="flex gap-2">
            <button
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              onClick={exportToCSV}
            >
              Export CSV
            </button>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={fetchCases}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Quick stats */}
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Cases</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{cases.length}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Need Reviewer</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">{stats.needsReviewer}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <p className="text-sm text-orange-600 dark:text-orange-400">Awaiting Consent</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.awaitingConsent}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <p className="text-sm text-purple-600 dark:text-purple-400">Need Manufacturer</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{stats.needsManufacturer}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-green-600 dark:text-green-400">Completed</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                {stats.statusCounts[CASE_STATUS.COMPLETED] || 0}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Paid Cases</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">{stats.paidCases}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by case ID, patient name, email, or staff..."
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className="px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Payment Status</option>
            <option value="NO_PAYMENT">No Payment</option>
            {Object.entries(PAYMENT_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            value={assignmentFilter}
            onChange={(e) => {
              setAssignmentFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Cases</option>
            <option value="NEEDS_REVIEWER">Needs Reviewer</option>
            <option value="NEEDS_MANUFACTURER">Needs Manufacturer</option>
            <option value="FULLY_ASSIGNED">Fully Assigned</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <select
            className="px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
          </select>
        </div>
        
        {selectedCases.length > 0 && (
          <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm text-blue-800 dark:text-blue-300">
              {selectedCases.length} cases selected
            </span>
            <select
              className="px-3 py-1 border dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdateStatus(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="">Bulk Update Status...</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSelectedCases([])}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">Error: {error}</p>
          <button
            onClick={fetchCases}
            className="mt-2 text-sm text-red-600 dark:text-red-300 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Table */}
      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading cases...</div>
      ) : filteredAndSortedCases.length === 0 ? (
        <div className="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
          No cases found. {(searchTerm || statusFilter || assignmentFilter !== "ALL") && "Try adjusting your filters."}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCases.length === paginatedCases.length && paginatedCases.length > 0}
                      onChange={() => {
                        if (selectedCases.length === paginatedCases.length) {
                          setSelectedCases([]);
                        } else {
                          setSelectedCases(paginatedCases.map(c => c.id));
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('caseNumber')}
                  >
                    Case Info {sortConfig.key === 'caseNumber' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('patientName')}
                  >
                    Patient {sortConfig.key === 'patientName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Dentist
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reviewer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('status')}
                  >
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('paymentStatus')}
                  >
                    Payment {sortConfig.key === 'paymentStatus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Consent
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedCases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCases.includes(caseItem.id)}
                        onChange={() => {
                          setSelectedCases(prev =>
                            prev.includes(caseItem.id)
                              ? prev.filter(id => id !== caseItem.id)
                              : [...prev, caseItem.id]
                          );
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {caseItem.caseNumber || caseItem.id}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(caseItem.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(caseItem.caseNumber || caseItem.id);
                            toast.success('Case ID copied!');
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          title="Copy case ID"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {caseItem.patient?.name || "-"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {caseItem.patient?.email || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {caseItem.dentist?.name || "-"}
                        </div>
                        <button
                          onClick={() => openAssignModal(caseItem, 'dentist')}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Change
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {caseItem.reviewer ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {caseItem.reviewer.name}
                          </div>
                          <button
                            onClick={() => openAssignModal(caseItem, 'reviewer')}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openAssignModal(caseItem, 'reviewer')}
                          className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 text-sm font-medium"
                        >
                          Assign →
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {caseItem.status === CASE_STATUS.MANUFACTURING ? (
                        caseItem.manufacturer ? (
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {caseItem.manufacturer.name}
                            </div>
                            <button
                              onClick={() => openAssignModal(caseItem, 'manufacturer')}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openAssignModal(caseItem, 'manufacturer')}
                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 text-sm font-medium"
                          >
                            Assign →
                          </button>
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(caseItem.status)}
                    </td>
                    <td className="px-4 py-3">
                      {getPaymentStatusBadge(caseItem.payment)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        {caseItem.patientConsented ? (
                          <span className="text-green-600 dark:text-green-400">
                            <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : caseItem.status === CASE_STATUS.AWAITING_CONSENT ? (
                          <span className="text-orange-500 dark:text-orange-400">
                            <svg className="w-5 h-5 inline animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {caseItem.patientConsented ? "Received" : 
                           caseItem.status === CASE_STATUS.AWAITING_CONSENT ? "Pending" : "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetailsModal(caseItem)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openNotesModal(caseItem)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                          title="Edit Notes"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {caseItem.treatmentPlanUrl && (
                          <a
                            href={`/api/files/${caseItem.treatmentPlanUrl}`}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1"
                            download
                            title="Download Treatment Plan"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                        )}
                        <select
                          className="border dark:border-gray-600 dark:bg-gray-700 rounded px-1 py-0.5 text-xs"
                          value={caseItem.status}
                          onChange={(e) => {
                            e.preventDefault();
                            updateStatus(caseItem.id, e.target.value);
                          }}
                          title="Update Status"
                        >
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedCases.length)} of {filteredAndSortedCases.length} cases
              </span>
              <select
                className="ml-2 px-2 py-1 border dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border dark:border-gray-600 rounded text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-800 dark:text-white"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage - 2 + i;
                if (pageNum > 0 && pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-800 dark:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border dark:border-gray-600 rounded text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-800 dark:text-white"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Assign {assignType === 'reviewer' ? 'Reviewer' : assignType === 'dentist' ? 'Dentist' : 'Manufacturer'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Case: {selectedCase.caseNumber || selectedCase.id}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Patient: {selectedCase.patient?.name}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Select {assignType === 'reviewer' ? 'Reviewer' : assignType === 'dentist' ? 'Dentist' : 'Manufacturer'}
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full border dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2"
              >
                <option value="">Choose...</option>
                {(assignType === 'reviewer' ? reviewers : 
                  assignType === 'dentist' ? dentists : 
                  manufacturers).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedCase(null);
                  setAssigneeId("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!assigneeId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Details Modal */}
      {showDetailsModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Case Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Case ID</p>
                <p className="text-base font-mono text-gray-900 dark:text-white">{selectedCase.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Case Number</p>
                <p className="text-base text-gray-900 dark:text-white">{selectedCase.caseNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                {getStatusBadge(selectedCase.status)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Status</p>
                {selectedCase.payment ? (
                  <div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${PAYMENT_STATUS_CONFIG[selectedCase.payment.status]?.bg} ${PAYMENT_STATUS_CONFIG[selectedCase.payment.status]?.text}`}>
                      {PAYMENT_STATUS_CONFIG[selectedCase.payment.status]?.icon} {PAYMENT_STATUS_CONFIG[selectedCase.payment.status]?.label}
                    </span>
                    {selectedCase.payment.amount && selectedCase.payment.currency && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {selectedCase.payment.currency} {selectedCase.payment.amount}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">No payment</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {new Date(selectedCase.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedCase.patient?.name || "N/A"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedCase.patient?.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dentist</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedCase.dentist?.name || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reviewer</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedCase.reviewer?.name || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Manufacturer</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedCase.manufacturer?.name || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient Consent</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedCase.patientConsented ? "✓ Received" : "⚠ Pending"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hidden by Dentist</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedCase.hiddenByDentist ? "Yes" : "No"}
                </p>
              </div>
              {selectedCase.payment && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Method</p>
                    <p className="text-base text-gray-900 dark:text-white">
                      {selectedCase.payment.paymentMethod?.replace(/_/g, ' ') || "N/A"}
                    </p>
                  </div>
                  {selectedCase.payment.transactionId && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction ID</p>
                      <p className="text-base font-mono text-gray-900 dark:text-white">
                        {selectedCase.payment.transactionId}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {selectedCase.notes && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedCase.notes}
                </p>
              </div>
            )}
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Edit Notes
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Case: {selectedCase.caseNumber || selectedCase.id}
              </p>
            </div>

            <textarea
              className="w-full border dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 h-32 mb-4"
              placeholder="Add notes..."
              value={caseNotes}
              onChange={(e) => setCaseNotes(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setCaseNotes("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => updateNotes(selectedCase.id, caseNotes)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}