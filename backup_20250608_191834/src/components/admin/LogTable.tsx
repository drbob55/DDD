"use client";

import React, { useEffect, useState } from "react";

type Log = {
  id: string;
  userId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: any;
  createdAt: string;
};

type UserMap = Record<string, { name: string; email: string }>;

export default function LogTable() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDetail, setShowDetail] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const logsRes = await fetch("/api/logs");
    const logsData = (await logsRes.json()).logs || [];
    setLogs(logsData);
    setLoading(false);

    // Unique userIds in logs
    const userIds = [...new Set(logsData.map((l: Log) => l.userId).filter(Boolean))];
    if (userIds.length) {
      const usersRes = await fetch("/api/users");
      const usersData = (await usersRes.json()).users || [];
      const userMap: UserMap = {};
      for (const u of usersData) {
        userMap[u.id] = { name: u.name, email: u.email };
      }
      setUsers(userMap);
    }
  };

  // Filter logs by action/user
  const filteredLogs = logs.filter(
    (l) =>
      (!search ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.targetType.toLowerCase().includes(search.toLowerCase()) ||
        (l.userId && (users[l.userId]?.name?.toLowerCase().includes(search.toLowerCase()) ||
          users[l.userId]?.email?.toLowerCase().includes(search.toLowerCase())))
      )
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
        Audit Logs
        <input
          type="text"
          className="border rounded px-3 py-1 ml-4 text-sm"
          placeholder="Search by user or action"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </h2>
      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading logs...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full bg-white text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Target</th>
                <th className="px-2 py-2">When</th>
                <th className="px-2 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-2 py-2 font-semibold">{log.action}</td>
                  <td className="px-2 py-2">
                    {log.userId
                      ? users[log.userId]?.name ||
                        users[log.userId]?.email ||
                        log.userId
                      : "-"}
                  </td>
                  <td className="px-2 py-2">
                    {log.targetType}
                    {log.targetId ? (
                      <span className="text-gray-500 ml-1">{log.targetId.slice(0, 8)}...</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      className="text-blue-700 underline"
                      onClick={() =>
                        setShowDetail(showDetail === log.id ? null : log.id)
                      }
                    >
                      {showDetail === log.id ? "Hide" : "Show"}
                    </button>
                    {showDetail === log.id && (
                      <pre className="bg-gray-50 text-gray-700 p-2 rounded text-xs mt-1 max-w-md overflow-x-auto">
                        {log.details
                          ? JSON.stringify(log.details, null, 2)
                          : "(no details)"}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredLogs.length && (
            <div className="text-center p-6 text-gray-500">No logs found.</div>
          )}
        </div>
      )}
    </div>
  );
}
