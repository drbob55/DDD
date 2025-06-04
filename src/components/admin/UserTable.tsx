// src/components/admin/UserTable.tsx
"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ROLES } from "@/lib/constants";

type User = {
  id: string;
  userId: string;  // Add this field
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  username?: string;
  role: string;
  sex: string;
  dateOfBirth: string;
  phone?: string;
  isVerified?: boolean;  // Changed from confirmed to isVerified
  createdAt?: string;
};

const ROLE_COLORS: Record<string, string> = {
  PATIENT: "bg-blue-100 text-blue-800",
  DENTIST: "bg-green-100 text-green-800",
  REVIEWER: "bg-purple-100 text-purple-800",
  MANUFACTURER: "bg-yellow-100 text-yellow-800",
  ADMIN: "bg-red-100 text-red-800",
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
  const [modal, setModal] = useState<"edit" | "add" | null>(null);
  const [editUser, setEditUser] = useState<Partial<User> | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [adminPin, setAdminPin] = useState<string>("");
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

  // Fetch all users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      console.log("Fetched users:", data.users); // Debug log
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
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
        fetchUsers(); // Refresh the list
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

    // Validate required fields
    if (!editUser.firstName || !editUser.lastName || !editUser.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Admin pin required
    if (!adminPin) {
      toast.error("Admin PIN is required");
      return;
    }

    // If password is provided, validate length
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
    // Validate required fields
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

    // Validate password
    if (addForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Validate admin PIN
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Users ({users.length})</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700"
          onClick={openAdd}
        >
          + Add User
        </button>
      </div>
      
      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center p-8 text-gray-500">No users found</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">User ID</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Sex</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">DOB</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-sm">{user.userId || user.id}</td>
                  <td className="px-4 py-2">{user.firstName} {user.lastName}</td>
                  <td className="px-4 py-2 text-sm">{user.email}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-800"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">{SEX_DISPLAY[user.sex] || user.sex}</td>
                  <td className="px-4 py-2 text-sm">{user.phone || "-"}</td>
                  <td className="px-4 py-2 text-sm">
                    {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      user.isVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {user.isVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      {!user.isVerified && (
                        <button
                          onClick={() => verifyUser(user.id)}
                          className="text-green-600 hover:underline text-sm"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Add/Edit - same as before */}
      {(modal === "edit" || modal === "add") && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700 text-xl"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4">{modal === "edit" ? "Edit User" : "Add User"}</h3>
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
                  <label className="block text-sm font-medium mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="border rounded px-3 py-2 w-full"
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
                  <label className="block text-sm font-medium mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="border rounded px-3 py-2 w-full"
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
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  className="border rounded px-3 py-2 w-full"
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
                <label className="block text-sm font-medium mb-1">
                  Username {((modal === "add" && addForm.role !== ROLES.PATIENT) || (modal === "edit" && editUser?.role !== ROLES.PATIENT)) && "(optional)"}
                </label>
                <input
                  className="border rounded px-3 py-2 w-full"
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
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  className="border rounded px-3 py-2 w-full"
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
                <label className="block text-sm font-medium mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="border rounded px-3 py-2 w-full"
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
                <label className="block text-sm font-medium mb-1">
                  Sex <span className="text-red-500">*</span>
                </label>
                <select
                  className="border rounded px-3 py-2 w-full"
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
                <label className="block text-sm font-medium mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  className="border rounded px-3 py-2 w-full"
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
                <label className="block text-sm font-medium mb-1">
                  {modal === "add" ? "Password" : "New Password"} 
                  {modal === "add" && <span className="text-red-500">*</span>}
                </label>
                <input
                  className="border rounded px-3 py-2 w-full"
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
                <label className="block text-sm font-medium mb-1">
                  Admin PIN <span className="text-red-500">*</span>
                </label>
                <input
                  className="border rounded px-3 py-2 w-full"
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
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700"
                >
                  {modal === "add" ? "Create User" : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-300"
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