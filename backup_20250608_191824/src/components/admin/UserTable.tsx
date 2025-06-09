// src/components/admin/UserTable.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { ROLES } from "@/lib/constants";

type User = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  username?: string;
  role: string;
  sex: string;
  dateOfBirth: string;
  phone?: string;
  isVerified?: boolean;
  createdAt?: string;
  cases?: number; // Add case count
  payments?: number; // Add payment count
};

type SortConfig = {
  key: keyof User | 'fullName';
  direction: 'asc' | 'desc';
};

const ROLE_COLORS: Record<string, string> = {
  PATIENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DENTIST: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REVIEWER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  MANUFACTURER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const SEX_DISPLAY: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Not Specified",
};

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"edit" | "add" | "view" | null>(null);
  const [editUser, setEditUser] = useState<Partial<User> | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [adminPin, setAdminPin] = useState<string>("");
  
  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Multi-select for bulk actions
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [addForm, setAddForm] = useState<Partial<User> & { password?: string }>({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    role: ROLES.PATIENT,
    sex: "PREFER_NOT_TO_SAY",
    dateOfBirth: "",
    phone: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      
      // Fetch additional data for each user (cases, payments)
      const enrichedUsers = await Promise.all(
        (data.users || []).map(async (user: User) => {
          try {
            // Fetch case count
            const casesRes = await fetch(`/api/cases?userId=${user.id}`);
            const casesData = await casesRes.json();
            
            // Fetch payment count
            const paymentsRes = await fetch(`/api/payments?userId=${user.id}`);
            const paymentsData = await paymentsRes.json();
            
            return {
              ...user,
              cases: casesData.cases?.length || 0,
              payments: paymentsData.payments?.length || 0,
            };
          } catch {
            return user;
          }
        })
      );
      
      setUsers(enrichedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Sorting function
  const sortData = (key: keyof User | 'fullName') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        user.userId?.toLowerCase().includes(searchLower) ||
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower) ||
        new Date(user.dateOfBirth).toLocaleDateString().includes(searchLower);
      
      // Role filter
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      
      // Verified filter
      const matchesVerified = 
        verifiedFilter === "ALL" ||
        (verifiedFilter === "VERIFIED" && user.isVerified) ||
        (verifiedFilter === "UNVERIFIED" && !user.isVerified);
      
      return matchesSearch && matchesRole && matchesVerified;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (sortConfig.key === 'fullName') {
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
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
  }, [users, searchTerm, roleFilter, verifiedFilter, sortConfig]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    }
  };

  const handleBulkVerify = async () => {
    if (!adminPin) {
      const pin = prompt("Enter admin PIN to verify users:");
      if (!pin) return;
      setAdminPin(pin);
    }

    try {
      const promises = selectedUsers.map(userId =>
        fetch(`/api/users/${userId}/verify`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: adminPin || prompt("Enter admin PIN:") }),
        })
      );
      
      await Promise.all(promises);
      toast.success(`${selectedUsers.length} users verified`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to verify some users");
    }
  };

  const exportToCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Phone', 'DOB', 'Status', 'Cases', 'Payments'];
    const rows = filteredAndSortedUsers.map(user => [
      user.userId || user.id,
      `${user.firstName} ${user.lastName}`,
      user.email,
      user.role,
      user.phone || '',
      user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : '',
      user.isVerified ? 'Verified' : 'Unverified',
      user.cases || 0,
      user.payments || 0,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // View user details
  const openView = async (user: User) => {
    setViewUser(user);
    setModal("view");
  };

  // Verify user handler
  const verifyUser = async (userId: string) => {
    if (!adminPin) {
      const pin = prompt("Enter admin PIN to verify user:");
      if (!pin) return;
      setAdminPin(pin);
    }

    try {
      const res = await fetch(`/api/users/${userId}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin || prompt("Enter admin PIN:") }),
      });

      if (res.ok) {
        toast.success("User verified successfully");
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to verify user");
      }
    } catch (err) {
      console.error("Error verifying user:", err);
      toast.error("Failed to verify user");
    }
  };

  // Edit button
  const openEdit = (user: User) => {
    setEditUser({ ...user });
    setNewPassword("");
    setAdminPin("");
    setModal("edit");
  };

  // Add button
  const openAdd = () => {
    setAddForm({
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      role: ROLES.PATIENT,
      sex: "PREFER_NOT_TO_SAY",
      dateOfBirth: "",
      phone: "",
    });
    setAdminPin("");
    setModal("add");
  };

  // Save edit handler
  const saveEdit = async () => {
    if (!editUser) return;

    if (!editUser.firstName || !editUser.lastName || !editUser.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!adminPin) {
      toast.error("Admin PIN is required");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editUser,
          pin: adminPin,
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === updated.user.id ? { ...u, ...updated.user } : u))
        );
        toast.success("User updated successfully");
        setModal(null);
        setNewPassword("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update user");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("Failed to update user");
    }
  };

  // Save add handler
  const saveAdd = async () => {
    if (
      !addForm.firstName ||
      !addForm.lastName ||
      !addForm.email ||
      !addForm.role ||
      !addForm.sex ||
      !addForm.dateOfBirth ||
      !addForm.password
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (addForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!adminPin) {
      toast.error("Admin PIN is required");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, pin: adminPin }),
      });

      if (res.ok) {
        const { user } = await res.json();
        setUsers((prev) => [user, ...prev]);
        toast.success("User created successfully");
        setModal(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create user");
      }
    } catch (err) {
      console.error("Error creating user:", err);
      toast.error("Failed to create user");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h2>
          <div className="flex gap-2">
            <button
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              onClick={exportToCSV}
            >
              Export CSV
            </button>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={openAdd}
            >
              + Add User
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400">Verified</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
              {users.filter(u => u.isVerified).length}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Unverified</p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
              {users.filter(u => !u.isVerified).length}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">Patients</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              {users.filter(u => u.role === ROLES.PATIENT).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by ID, name, email, phone, or date..."
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Roles</option>
            <option value={ROLES.PATIENT}>Patients</option>
            <option value={ROLES.DENTIST}>Dentists</option>
            <option value={ROLES.REVIEWER}>Reviewers</option>
            <option value={ROLES.MANUFACTURER}>Manufacturers</option>
            <option value={ROLES.ADMIN}>Admins</option>
          </select>
          <select
            className="px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Status</option>
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>
        </div>
        
        {selectedUsers.length > 0 && (
          <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm text-blue-800 dark:text-blue-300">
              {selectedUsers.length} users selected
            </span>
            <button
              onClick={handleBulkVerify}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Verify Selected
            </button>
            <button
              onClick={() => setSelectedUsers([])}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading users...</div>
      ) : filteredAndSortedUsers.length === 0 ? (
        <div className="text-center p-8 text-gray-500">No users found</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('userId')}
                  >
                    User ID {sortConfig.key === 'userId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('fullName')}
                  >
                    Name {sortConfig.key === 'fullName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => sortData('dateOfBirth')}
                  >
                    DOB {sortConfig.key === 'dateOfBirth' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => {
                          setSelectedUsers(prev =>
                            prev.includes(user.id)
                              ? prev.filter(id => id !== user.id)
                              : [...prev, user.id]
                          );
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {user.userId || user.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {SEX_DISPLAY[user.sex] || user.sex}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.phone || "No phone"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-800"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-3 text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          Cases: {user.cases || 0}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Payments: {user.payments || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        user.isVerified 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>
                        {user.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openView(user)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit User"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!user.isVerified && (
                          <button
                            onClick={() => verifyUser(user.id)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Verify User"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} users
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

      {/* View User Modal */}
      {modal === "view" && viewUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">User Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</p>
                <p className="text-base font-mono text-gray-900 dark:text-white">{viewUser.userId || viewUser.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-base text-gray-900 dark:text-white">{viewUser.firstName} {viewUser.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-base text-gray-900 dark:text-white">{viewUser.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-base text-gray-900 dark:text-white">{viewUser.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[viewUser.role]}`}>
                  {viewUser.role}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                  viewUser.isVerified 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                  {viewUser.isVerified ? "Verified" : "Unverified"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sex</p>
                <p className="text-base text-gray-900 dark:text-white">{SEX_DISPLAY[viewUser.sex] || viewUser.sex}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {viewUser.dateOfBirth ? new Date(viewUser.dateOfBirth).toLocaleDateString() : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cases</p>
                <p className="text-base text-gray-900 dark:text-white">{viewUser.cases || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payments</p>
                <p className="text-base text-gray-900 dark:text-white">{viewUser.payments || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleString() : "-"}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setModal(null);
                  openEdit(viewUser);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Edit User
              </button>
              <button
                onClick={() => setModal(null)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {(modal === "edit" || modal === "add") && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              {modal === "edit" ? "Edit User" : "Add User"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                modal === "edit" ? saveEdit() : saveAdd();
              }}
              className="space-y-4"
            >
              {/* Names */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                    placeholder="First Name"
                    value={modal === "edit" ? editUser?.firstName || "" : addForm.firstName || ""}
                    onChange={e =>
                      modal === "edit"
                        ? setEditUser((f) => ({ ...f, firstName: e.target.value }))
                        : setAddForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                    placeholder="Last Name"
                    value={modal === "edit" ? editUser?.lastName || "" : addForm.lastName || ""}
                    onChange={e =>
                      modal === "edit"
                        ? setEditUser((f) => ({ ...f, lastName: e.target.value }))
                        : setAddForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  placeholder="Email"
                  type="email"
                  value={modal === "edit" ? editUser?.email || "" : addForm.email || ""}
                  onChange={e =>
                    modal === "edit"
                      ? setEditUser((f) => ({ ...f, email: e.target.value }))
                      : setAddForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Username - only for non-patients */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Username {((modal === "add" && addForm.role !== ROLES.PATIENT) || (modal === "edit" && editUser?.role !== ROLES.PATIENT)) && "(optional)"}
                </label>
                <input
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  placeholder="Username"
                  value={modal === "edit" ? editUser?.username || "" : addForm.username || ""}
                  onChange={e =>
                    modal === "edit"
                      ? setEditUser((f) => ({ ...f, username: e.target.value }))
                      : setAddForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Phone</label>
                <input
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  placeholder="Phone"
                  value={modal === "edit" ? editUser?.phone || "" : addForm.phone || ""}
                  onChange={e =>
                    modal === "edit"
                      ? setEditUser((f) => ({ ...f, phone: e.target.value }))
                      : setAddForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  value={modal === "edit" ? editUser?.role || ROLES.PATIENT : addForm.role || ROLES.PATIENT}
                  onChange={e =>
                    modal === "edit"
                      ? setEditUser((f) => ({ ...f, role: e.target.value }))
                      : setAddForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value={ROLES.PATIENT}>Patient</option>
                  <option value={ROLES.DENTIST}>Dentist</option>
                  <option value={ROLES.REVIEWER}>Reviewer</option>
                  <option value={ROLES.MANUFACTURER}>Manufacturer</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                </select>
              </div>

              {/* Sex */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Sex <span className="text-red-500">*</span>
                </label>
                <select
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  value={modal === "edit" ? editUser?.sex || "PREFER_NOT_TO_SAY" : addForm.sex || "PREFER_NOT_TO_SAY"}
                  onChange={e =>
                    modal === "edit"
                      ? setEditUser((f) => ({ ...f, sex: e.target.value }))
                      : setAddForm((f) => ({ ...f, sex: e.target.value }))
                  }
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>

              {/* DOB */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  type="date"
                  value={modal === "edit" ? editUser?.dateOfBirth?.slice(0, 10) || "" : addForm.dateOfBirth || ""}
                  onChange={e =>
                    modal === "edit"
                      ? setEditUser((f) => ({ ...f, dateOfBirth: e.target.value }))
                      : setAddForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {modal === "add" ? "Password" : "New Password"} 
                  {modal === "add" && <span className="text-red-500">*</span>}
                </label>
                <input
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  type="password"
                  placeholder={modal === "add" ? "Enter password (min 8 chars)" : "Leave blank to keep current password"}
                  value={modal === "add" ? addForm.password || "" : newPassword}
                  onChange={e => 
                    modal === "add" 
                      ? setAddForm(f => ({ ...f, password: e.target.value }))
                      : setNewPassword(e.target.value)
                  }
                  minLength={8}
                  required={modal === "add"}
                />
              </div>

              {/* Admin PIN */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Admin PIN <span className="text-red-500">*</span>
                </label>
                <input
                  className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
                  type="password"
                  placeholder="Enter admin PIN"
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  {modal === "add" ? "Create User" : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => {
                    setModal(null);
                    setNewPassword("");
                    setAdminPin("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}