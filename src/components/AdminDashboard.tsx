"use client";

import React, { useState } from "react";
import UserTable from "./admin/UserTable";
import CaseTable from "./admin/CaseTable";
import PaymentTable from "./admin/PaymentTable";
import LogTable from "./admin/LogTable";
import NotificationSender from "./admin/NotificationSender";
import { signOut } from "next-auth/react";

const TABS = [
  { label: "Users", key: "users" },
  { label: "Cases", key: "cases" },
  { label: "Payments", key: "payments" },
  { label: "Logs", key: "logs" },
  { label: "Notifications", key: "notifications" },
];

export default function AdminDashboard({ user }) {
  const [tab, setTab] = useState("users");
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header row with title and logout button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-4 py-2 bg-gray-200 text-red-700 rounded-xl hover:bg-gray-300 font-bold"
        >
          Logout
        </button>
      </div>
      <div className="flex space-x-4 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-xl font-bold ${
              tab === t.key
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-blue-800"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "users" && <UserTable />}
      {tab === "cases" && <CaseTable />}
      {tab === "payments" && <PaymentTable />}
      {tab === "logs" && <LogTable />}
      {tab === "notifications" && <NotificationSender />}
    </div>
  );
}
