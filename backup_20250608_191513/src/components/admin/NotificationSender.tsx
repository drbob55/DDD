"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ROLES } from "@/lib/constants";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function NotificationSender() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [role]);

  const fetchUsers = async () => {
    const url = role === "ALL" ? "/api/users" : `/api/users?role=${role}`;
    const res = await fetch(url);
    const data = await res.json();
    setUsers(data.users || []);
  };

  const handleSendNotifications = async () => {
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Select at least one user");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedUsers,
          message: message.trim(),
        }),
      });

      if (res.ok) {
        toast.success(`Notifications sent to ${selectedUsers.length} users`);
        setMessage("");
        setSelectedUsers([]);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send notifications");
      }
    } catch (err) {
      toast.error("Error sending notifications");
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedUsers(users.map(u => u.id));
  };

  const selectNone = () => {
    setSelectedUsers([]);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Send Notifications</h2>
      
      {/* Message Input */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">
          Notification Message
        </label>
        <textarea
          className="w-full border rounded-lg px-4 py-2 h-32"
          placeholder="Enter your notification message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* Role Filter */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <label className="text-sm font-semibold mr-2">Filter by Role:</label>
          <select
            className="border rounded px-3 py-1"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="ALL">All Users</option>
            <option value={ROLES.PATIENT}>Patients</option>
            <option value={ROLES.DENTIST}>Dentists</option>
            <option value={ROLES.REVIEWER}>Reviewers</option>
            <option value={ROLES.MANUFACTURER}>Manufacturers</option>
          </select>
        </div>
        
        <div className="space-x-2">
          <button
            onClick={selectAll}
            className="text-blue-600 hover:underline text-sm"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="text-gray-600 hover:underline text-sm"
          >
            Select None
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="border rounded-lg p-4 max-h-96 overflow-y-auto mb-6">
        {users.length === 0 ? (
          <p className="text-gray-500 text-center">No users found</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <label
                key={user.id}
                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mr-3"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                />
                <span className="flex-1">
                  {user.name} ({user.email})
                </span>
                <span className={`text-xs px-2 py-1 rounded-full
                  ${user.role === ROLES.PATIENT ? 'bg-blue-100 text-blue-800' :
                    user.role === ROLES.DENTIST ? 'bg-green-100 text-green-800' :
                    user.role === ROLES.REVIEWER ? 'bg-purple-100 text-purple-800' :
                    user.role === ROLES.MANUFACTURER ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'}`}>
                  {user.role}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Send Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {selectedUsers.length} user(s) selected
        </span>
        <button
          onClick={handleSendNotifications}
          disabled={loading || selectedUsers.length === 0 || !message.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send Notifications"}
        </button>
      </div>
    </div>
  );
}