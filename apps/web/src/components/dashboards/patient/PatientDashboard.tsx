"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { ROLES } from '@dental/shared';

// Try to import Appointments, but handle if it doesn't exist
let Appointments: any = null;
try {
  Appointments = require("./Appointments").default;
} catch (e) {
  console.warn("Appointments component not found");
}

type Appointment = { 
  date: string;
  id: string;
};

type Case = {
  id: string;
  status: string;
  dentist?: { name: string; email: string };
  reviewer?: { name: string };
  notes: string;
  treatmentPlanUrl?: string | null;
  scanFileUrl?: string;
  appointments?: Appointment[];
  createdAt: string;
  patientConsented?: boolean;
};

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone?: string;
  sex?: string;
  dateOfBirth?: string;
};

type Notification = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export default function PatientDashboard({ user: initialUser }: { user: any }) {
  const { data: session } = useSession();
  const [user, setUser] = useState<User>(initialUser);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [consentCase, setConsentCase] = useState<Case | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch fresh user info
  useEffect(() => {
    fetchUserData();
    fetchCases();
    fetchNotifications();
  }, [initialUser?.id]);

  const fetchUserData = async () => {
    if (!initialUser?.id) return;
    try {
      const res = await fetch(`/api/users/${initialUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEditForm({
          firstName: data.user.firstName || "",
          lastName: data.user.lastName || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          password: "",
          confirmPassword: "",
        });
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  const fetchCases = async () => {
    if (!initialUser?.id) return;
    try {
      const res = await fetch(`/api/cases`);
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err) {
      console.error("Error fetching cases:", err);
    }
  };

  const fetchNotifications = async () => {
    if (!initialUser?.id) return;
    try {
      const res = await fetch(`/api/notifications`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (editForm.password && editForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      const updateData: any = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
      };

      if (editForm.password) {
        updateData.password = editForm.password;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
        setEditingProfile(false);
        fetchUserData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Error updating profile");
    }
  };

  // Handle consent
  const handleConsent = async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });

      if (res.ok) {
        toast.success("Consent provided successfully");
        setConsentCase(null);
        fetchCases();
      } else {
        toast.error("Failed to provide consent");
      }
    } catch (err) {
      console.error("Error providing consent:", err);
      toast.error("Error providing consent");
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, read: true }),
      });
      fetchNotifications();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Parse scan files
  const parseScanFiles = (scanFileUrl?: string): Record<string, string> => {
    if (!scanFileUrl) return {};
    try {
      return JSON.parse(scanFileUrl) as Record<string, string>;
    } catch {
      return {};
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-700">
                Welcome, {user?.name}
              </h1>
              <div className="text-gray-600 text-sm mt-1">
                <span>Patient ID: </span>
                <span className="font-mono text-base font-semibold">
                  {user?.id || "Loading..."}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setEditingProfile(true)}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
              >
                Edit Profile
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-4 py-2 bg-gray-200 text-red-700 rounded-lg hover:bg-gray-300 font-bold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-6 top-20 w-96 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">No notifications</p>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Dentist Info Card */}
        {cases.length > 0 && cases[0].dentist && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Your Care Team</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Dentist</p>
                <p className="font-medium">{cases[0].dentist.name}</p>
                <p className="text-sm text-gray-500">{cases[0].dentist.email}</p>
              </div>
              {cases[0].treatmentPlanUrl && (
                <div>
                  <p className="text-sm text-gray-600">Treatment Plan</p>
                  <a
                    href={`/api/files/${cases[0].treatmentPlanUrl}`}
                    className="text-blue-700 hover:underline font-medium"
                    download
                  >
                    Download Plan
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cases Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-blue-700">Your Cases</h2>
          </div>
          <div className="p-6">
            {cases.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No cases yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Case ID</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-left py-3 px-2">Dentist</th>
                      <th className="text-left py-3 px-2">Created</th>
                      <th className="py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-2 font-mono text-sm">{c.id}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            c.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                            c.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            c.status === 'IN_TREATMENT' ? 'bg-blue-100 text-blue-800' :
                            c.status === 'AWAITING_CONSENT' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {c.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-2">{c.dentist?.name || "—"}</td>
                        <td className="py-3 px-2 text-sm">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-2">
                            <button
                              className="bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800"
                              onClick={() => setSelectedCase(c)}
                            >
                              View Details
                            </button>
                            {c.status === "AWAITING_CONSENT" && !c.patientConsented && (
                              <button
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                onClick={() => setConsentCase(c)}
                              >
                                Provide Consent
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
          </div>
        </div>
      </div>

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Case Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Case ID</p>
                  <p className="font-medium">{selectedCase.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">{selectedCase.status.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dentist</p>
                  <p className="font-medium">{selectedCase.dentist?.name || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{new Date(selectedCase.createdAt).toLocaleDateString()}</p>
                </div>
                {selectedCase.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Clinical Notes</p>
                    <p className="font-medium">{selectedCase.notes}</p>
                  </div>
                )}
              </div>

              {/* Files */}
              {selectedCase.scanFileUrl && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Scan Files</h3>
                  <div className="space-y-2">
                    {Object.entries(parseScanFiles(selectedCase.scanFileUrl)).map(([type, filename]) => 
                      filename ? (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <span className="font-medium capitalize">{type} Scan</span>
                          <a
                            href={`/api/files/${filename as string}`}
                            download
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Download
                          </a>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Treatment Plan */}
              {selectedCase.treatmentPlanUrl && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Treatment Plan</h3>
                  <a
                    href={`/api/files/${selectedCase.treatmentPlanUrl}`}
                    download
                    className="inline-block bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
                  >
                    Download Treatment Plan
                  </a>
                </div>
              )}

              {Appointments ? (
                <Appointments caseId={selectedCase.id} userId={user.id} userRole={ROLES.PATIENT} />
              ) : (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Appointments</h3>
                  <p className="text-gray-500">Appointment scheduling coming soon</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t">
              <button
                onClick={() => setSelectedCase(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {consentCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Treatment Consent</h2>
            </div>
            <div className="p-6">
              <p className="mb-4">
                By providing consent, you agree to proceed with the treatment plan for case {consentCase.id}.
              </p>
              {consentCase.treatmentPlanUrl && (
                <p className="mb-4">
                  Please review your{" "}
                  <a
                    href={`/api/files/${consentCase.treatmentPlanUrl}`}
                    className="text-blue-700 hover:underline"
                    download
                  >
                    treatment plan
                  </a>{" "}
                  before providing consent.
                </p>
              )}
              <div className="bg-yellow-50 p-4 rounded mb-4">
                <p className="text-sm text-yellow-800">
                  This action cannot be undone. Please ensure you have reviewed all details with your dentist.
                </p>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => handleConsent(consentCase.id)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                I Consent to Treatment
              </button>
              <button
                onClick={() => setConsentCase(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Edit Profile</h2>
            </div>
            <form onSubmit={handleProfileUpdate}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Change Password (Optional)</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Leave blank to keep current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm Password</label>
                      <input
                        type="password"
                        value={editForm.confirmPassword}
                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
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