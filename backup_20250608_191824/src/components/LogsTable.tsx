// /src/components/LogsTable.tsx

"use client";
import React, { useEffect, useState } from "react";

function formatDate(date) {
  return new Date(date).toLocaleString();
}

export default function LogsTable() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    const res = await fetch("/api/logs");
    const data = await res.json();
    setLogs(data.logs || []);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (log) =>
      log.userId?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.targetType?.toLowerCase().includes(search.toLowerCase()) ||
      log.targetId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between mb-4">
        <input
          type="text"
          placeholder="Filter by user/action/target"
          className="border rounded-lg px-3 py-2 w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="bg-gray-100 rounded-lg px-4 py-2"
          onClick={fetchLogs}
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Time</th>
              <th className="p-2">User</th>
              <th className="p-2">Action</th>
              <th className="p-2">Target Type</th>
              <th className="p-2">Target ID</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} className="border-b">
                <td className="p-2">{formatDate(log.createdAt)}</td>
                <td className="p-2 font-mono">{log.userId || "System"}</td>
                <td className="p-2">{log.action}</td>
                <td className="p-2">{log.targetType}</td>
                <td className="p-2 font-mono">{log.targetId}</td>
                <td className="p-2">
                  <pre className="whitespace-pre-wrap break-all text-gray-600 max-w-xs overflow-auto">{JSON.stringify(log.details, null, 2)}</pre>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-400">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
