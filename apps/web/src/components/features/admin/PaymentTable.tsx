// src/components/admin/PaymentTable.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";

type Payment = {
  id: string;
  amount: string;
  currency: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  case?: { id: string; caseNumber?: string };
  user?: { id: string; name: string; email: string };
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
};

type UserOption = { id: string; name: string; email: string };
type CaseOption = { id: string; caseNumber?: string; patientId?: string };

type SortConfig = {
  key: keyof Payment;
  direction: 'asc' | 'desc';
};

type PaymentStats = {
  total: number;
  pending: number;
  processing: number;
  paid: number;
  failed: number;
  refunded: number;
  cancelled: number;
  totalAmount: { [currency: string]: number };
  pendingAmount: { [currency: string]: number };
};

// Updated to match CaseTable's PAYMENT_STATUS_CONFIG
const PAYMENT_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  PENDING: { 
    bg: 'bg-gray-100 dark:bg-gray-700', 
    text: 'text-gray-800 dark:text-gray-300', 
    label: 'Pending',
    icon: '⏳'
  },
  PROCESSING: { 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-800 dark:text-blue-400', 
    label: 'Processing',
    icon: '🔄'
  },
  PAID: { 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-800 dark:text-green-400', 
    label: 'Paid',
    icon: '✅'
  },
  FAILED: { 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-800 dark:text-red-400', 
    label: 'Failed',
    icon: '❌'
  },
  REFUNDED: { 
    bg: 'bg-orange-100 dark:bg-orange-900/30', 
    text: 'text-orange-800 dark:text-orange-400', 
    label: 'Refunded',
    icon: '↩️'
  },
  CANCELLED: { 
    bg: 'bg-gray-100 dark:bg-gray-700', 
    text: 'text-gray-800 dark:text-gray-300', 
    label: 'Cancelled',
    icon: '🚫'
  },
};

export default function PaymentTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    pending: 0,
    processing: 0,
    paid: 0,
    failed: 0,
    refunded: 0,
    cancelled: 0,
    totalAmount: {},
    pendingAmount: {},
  });

  // Create Payment Modal state
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [form, setForm] = useState<any>({
    userId: "",
    caseId: "",
    amount: "",
    currency: "UZS",
    status: "PENDING",
    description: "",
    paymentMethod: "CREDIT_CARD",
    transactionId: "",
    notes: "",
  });

  // Filter & Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk actions
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments");
      const data = await res.json();
      setPayments(data.payments || []);
      calculateStats(data.payments || []);
    } catch (err) {
      console.error("Error fetching payments:", err);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentList: Payment[]) => {
    const newStats: PaymentStats = {
      total: paymentList.length,
      pending: 0,
      processing: 0,
      paid: 0,
      failed: 0,
      refunded: 0,
      cancelled: 0,
      totalAmount: {},
      pendingAmount: {},
    };

    paymentList.forEach(payment => {
      // Count by status
      const statusKey = payment.status.toLowerCase() as keyof PaymentStats;
      if (typeof newStats[statusKey] === 'number') {
        (newStats[statusKey] as number)++;
      }
      
      // Sum amounts by currency
      const amount = parseFloat(payment.amount);
      const currency = payment.currency;
      
      if (!newStats.totalAmount[currency]) {
        newStats.totalAmount[currency] = 0;
        newStats.pendingAmount[currency] = 0;
      }
      
      newStats.totalAmount[currency] += amount;
      
      if (payment.status === "PENDING") {
        newStats.pendingAmount[currency] += amount;
      }
    });

    setStats(newStats);
  };

  // Fetch users/cases for modal
  const fetchUsersCases = async () => {
    try {
      const usersRes = await fetch("/api/users");
      const casesRes = await fetch("/api/cases");
      setUsers((await usersRes.json()).users || []);
      setCases((await casesRes.json()).cases || []);
    } catch (err) {
      console.error("Error fetching users/cases:", err);
    }
  };

  // Create payment submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.loading("Creating payment...");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.dismiss();
      if (res.ok) {
        setShowModal(false);
        setForm({
          userId: "",
          caseId: "",
          amount: "",
          currency: "UZS",
          status: "PENDING",
          description: "",
          paymentMethod: "CREDIT_CARD",
          transactionId: "",
          notes: "",
        });
        toast.success("Payment created.");
        fetchPayments();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create payment.");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to create payment.");
    }
  };

  // Update payment status
  const updateStatus = async (id: string, status: Payment["status"]) => {
    toast.loading("Updating payment status...");
    try {
      const res = await fetch(`/api/payments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.dismiss();
      if (res.ok) {
        toast.success("Status updated.");
        fetchPayments(); // Refresh to update stats
      } else {
        toast.error("Failed to update payment status.");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to update payment status.");
    }
  };

  // Bulk update status
  const bulkUpdateStatus = async (status: Payment["status"]) => {
    if (selectedPayments.length === 0) return;
    
    toast.loading(`Updating ${selectedPayments.length} payments...`);
    try {
      const promises = selectedPayments.map(id =>
        fetch(`/api/payments/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      );
      
      await Promise.all(promises);
      toast.dismiss();
      toast.success(`${selectedPayments.length} payments updated`);
      setSelectedPayments([]);
      fetchPayments();
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to update some payments");
    }
  };

  // Sorting function
  const sortData = (key: keyof Payment) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort payments
  const filteredAndSortedPayments = useMemo(() => {
    let filtered = payments.filter(payment => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        payment.id.toLowerCase().includes(searchLower) ||
        payment.user?.name?.toLowerCase().includes(searchLower) ||
        payment.user?.email?.toLowerCase().includes(searchLower) ||
        payment.description?.toLowerCase().includes(searchLower) ||
        payment.transactionId?.toLowerCase().includes(searchLower) ||
        payment.case?.id?.toLowerCase().includes(searchLower) ||
        payment.case?.caseNumber?.toLowerCase().includes(searchLower);
      
      // Status filter
      const matchesStatus = statusFilter === "ALL" || payment.status === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== "ALL" && payment.createdAt) {
        const paymentDate = new Date(payment.createdAt);
        const now = new Date();
        
        switch (dateFilter) {
          case "TODAY":
            matchesDate = paymentDate.toDateString() === now.toDateString();
            break;
          case "WEEK":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = paymentDate >= weekAgo;
            break;
          case "MONTH":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = paymentDate >= monthAgo;
            break;
          case "YEAR":
            matchesDate = paymentDate.getFullYear() === now.getFullYear();
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [payments, searchTerm, statusFilter, dateFilter, sortConfig]);

  // Pagination
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedPayments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedPayments.length / itemsPerPage);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Payment ID', 'User', 'Case', 'Amount', 'Currency', 'Payment Status', 'Method', 'Transaction ID', 'Description', 'Created', 'Updated'];
    const rows = filteredAndSortedPayments.map(payment => [
      payment.id,
      payment.user ? `${payment.user.name} (${payment.user.email})` : '',
      payment.case?.caseNumber || payment.case?.id || '',
      payment.amount,
      payment.currency,
      payment.status,
      payment.paymentMethod || '',
      payment.transactionId || '',
      payment.description || '',
      payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '',
      payment.updatedAt ? new Date(payment.updatedAt).toLocaleString() : '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // View payment details
  const viewPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  // Format currency
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

  // Get payment status badge (matching CaseTable style)
  const getPaymentStatusBadge = (status: string) => {
    const config = PAYMENT_STATUS_CONFIG[status] || { 
      bg: 'bg-gray-100 dark:bg-gray-700', 
      text: 'text-gray-800 dark:text-gray-300', 
      label: status,
      icon: '❓'
    };
    
    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Payment Management
          </h2>
          <div className="flex gap-2">
            <button
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              onClick={exportToCSV}
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                setShowModal(true);
                fetchUsersCases();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Payment
            </button>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">Processing</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.processing}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400">Paid</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.paid}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
            <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.failed}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <p className="text-sm text-orange-600 dark:text-orange-400">Refunded</p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.refunded}</p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Cancelled</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">{stats.cancelled}</p>
          </div>
        </div>

        {/* Revenue Summary */}
        {Object.keys(stats.totalAmount).length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">Total Revenue</p>
              {Object.entries(stats.totalAmount).map(([currency, amount]) => (
                <p key={currency} className="text-lg font-bold text-blue-900 dark:text-blue-300">
                  {formatCurrency(amount.toString(), currency)}
                </p>
              ))}
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-400 mb-2">Pending Amount</p>
              {Object.entries(stats.pendingAmount).map(([currency, amount]) => (
                <p key={currency} className="text-lg font-bold text-orange-900 dark:text-orange-300">
                  {formatCurrency(amount.toString(), currency)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by ID, user, case, transaction ID..."
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
            <option value="ALL">All Payment Status</option>
            {Object.entries(PAYMENT_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
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
            <option value="YEAR">This Year</option>
          </select>
        </div>
        
        {selectedPayments.length > 0 && (
          <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm text-blue-800 dark:text-blue-300">
              {selectedPayments.length} payments selected
            </span>
            <button
              onClick={() => bulkUpdateStatus("PAID")}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Mark as Paid
            </button>
            <button
              onClick={() => bulkUpdateStatus("CANCELLED")}
              className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => setSelectedPayments([])}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading payments...</div>
      ) : filteredAndSortedPayments.length === 0 ? (
        <div className="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">No payments found</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedPayments.length === paginatedPayments.length && paginatedPayments.length > 0}
                      onChange={() => {
                        if (selectedPayments.length === paginatedPayments.length) {
                          setSelectedPayments([]);
                        } else {
                          setSelectedPayments(paginatedPayments.map(p => p.id));
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('id')}
                  >
                    Payment ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Case
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('amount')}
                  >
                    Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('status')}
                  >
                    Payment Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Method
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('createdAt')}
                  >
                    Created {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(payment.id)}
                        onChange={() => {
                          setSelectedPayments(prev =>
                            prev.includes(payment.id)
                              ? prev.filter(id => id !== payment.id)
                              : [...prev, payment.id]
                          );
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {payment.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {payment.user ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {payment.user.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {payment.case ? (
                        <a
                          href={`/cases/${payment.case.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {payment.case.caseNumber || payment.case.id.slice(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getPaymentStatusBadge(payment.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {payment.paymentMethod?.replace(/_/g, ' ') || "N/A"}
                      </div>
                      {payment.transactionId && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          TX: {payment.transactionId.slice(0, 10)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString()
                          : "-"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleTimeString()
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => viewPaymentDetails(payment)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {payment.status === "PENDING" && (
                          <button
                            onClick={() => updateStatus(payment.id, "PAID")}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1"
                            title="Mark as Paid"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {(payment.status === "PAID" || payment.status === "FAILED") && (
                          <button
                            onClick={() => updateStatus(payment.id, "REFUNDED")}
                            className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 p-1"
                            title="Refund"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        )}
                        {payment.status !== "CANCELLED" && payment.status !== "REFUNDED" && (
                          <button
                            onClick={() => updateStatus(payment.id, "CANCELLED")}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
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
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedPayments.length)} of {filteredAndSortedPayments.length} payments
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

      {/* Create Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Create Payment</h3>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    User <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                    required
                    value={form.userId}
                    onChange={e => setForm((f: any) => ({ ...f, userId: e.target.value }))}
                  >
                    <option value="">Select user</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Case <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                    required
                    value={form.caseId}
                    onChange={e => setForm((f: any) => ({ ...f, caseId: e.target.value }))}
                  >
                    <option value="">Select case</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber || c.id.slice(0, 8)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                    required
                    value={form.amount}
                    onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                    value={form.currency}
                    onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))}
                    required
                  >
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Payment Status
                </label>
                <select
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  value={form.status}
                  onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(PAYMENT_STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Payment Method
                </label>
                <select
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  value={form.paymentMethod}
                  onChange={e => setForm((f: any) => ({ ...f, paymentMethod: e.target.value }))}
                >
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Transaction ID
                </label>
                <input
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  placeholder="External transaction ID (optional)"
                  value={form.transactionId}
                  onChange={e => setForm((f: any) => ({ ...f, transactionId: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <input
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  placeholder="Payment description (optional)"
                  value={form.description}
                  onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full h-20 dark:bg-gray-700 dark:text-white"
                  placeholder="Internal notes (optional)"
                  value={form.notes}
                  onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  Create Payment
                </button>
                <button
                  type="button"
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
              onClick={() => setShowDetailsModal(false)}
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Payment Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment ID</p>
                <p className="text-base font-mono text-gray-900 dark:text-white">{selectedPayment.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Status</p>
                {getPaymentStatusBadge(selectedPayment.status)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Method</p>
                <p className="text-base text-gray-900 dark:text-white">{selectedPayment.paymentMethod?.replace(/_/g, ' ') || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">User</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedPayment.user ? `${selectedPayment.user.name} (${selectedPayment.user.email})` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Case</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedPayment.case ? (selectedPayment.case.caseNumber || selectedPayment.case.id) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction ID</p>
                <p className="text-base font-mono text-gray-900 dark:text-white">
                  {selectedPayment.transactionId || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Updated</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedPayment.updatedAt ? new Date(selectedPayment.updatedAt).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>
            
            {selectedPayment.description && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</p>
                <p className="text-base text-gray-900 dark:text-white">{selectedPayment.description}</p>
              </div>
            )}
            
            {selectedPayment.notes && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Internal Notes</p>
                <p className="text-base text-gray-900 dark:text-white">{selectedPayment.notes}</p>
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
    </div>
  );
}