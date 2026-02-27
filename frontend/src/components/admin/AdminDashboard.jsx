import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [featureFlags, setFeatureFlags] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [healthRes, statsRes, flagsRes, logsRes] = await Promise.all([
        fetch("http://localhost:5000/api/admin/health").catch(() => null),
        fetch("http://localhost:5000/api/admin/stats", {
          credentials: "include",
        }).catch(() => null),
        fetch("http://localhost:5000/api/admin/feature-flags", {
          credentials: "include",
        }).catch(() => null),
        fetch("http://localhost:5000/api/admin/audit-logs?limit=20", {
          credentials: "include",
        }).catch(() => null),
      ]);

      if (healthRes?.ok) setHealth(await healthRes.json());
      if (statsRes?.ok) setStats(await statsRes.json());
      if (flagsRes?.ok) {
        const data = await flagsRes.json();
        setFeatureFlags(data.flags);
      }
      if (logsRes?.ok) {
        const data = await logsRes.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Admin dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatureFlag = async (flagName, currentState) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/feature-flags/${flagName}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !currentState }),
          credentials: "include",
        }
      );
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Toggle feature flag error:", error);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "flags", label: "Feature Flags" },
    { id: "audit", label: "Audit Log" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white transition"
          >
            ← Back
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div>
                {health && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800 rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-1">
                        System Status
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          health.status === "healthy"
                            ? "text-green-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {health.status === "healthy" ? "✓ Healthy" : "⚠ Degraded"}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-1">Uptime</p>
                      <p className="text-2xl font-bold">
                        {Math.floor((health.uptime || 0) / 3600)}h{" "}
                        {Math.floor(((health.uptime || 0) % 3600) / 60)}m
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-1">Memory</p>
                      <p className="text-2xl font-bold">
                        {health.memory?.heapUsedMB || 0} MB
                      </p>
                      <p className="text-gray-500 text-xs">
                        {health.memory?.heapUsedPercent}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-1">Cache</p>
                      <p className="text-2xl font-bold">
                        {health.cache?.hitRate || "0%"}
                      </p>
                    </div>
                  </div>
                )}

                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-800 rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-1">Total Users</p>
                      <p className="text-3xl font-bold">
                        {stats.users?.total || 0}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-1">
                        Total Chats
                      </p>
                      <p className="text-3xl font-bold">
                        {stats.chats?.total || 0}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-1">
                        Queue Health
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          health?.queue?.healthy
                            ? "text-green-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {health?.queue?.healthy ? "✓ Healthy" : "⚠ Check"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "flags" && featureFlags && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4 text-gray-400 text-sm">
                        Flag
                      </th>
                      <th className="text-left p-4 text-gray-400 text-sm">
                        Description
                      </th>
                      <th className="text-left p-4 text-gray-400 text-sm">
                        Tiers
                      </th>
                      <th className="text-left p-4 text-gray-400 text-sm">
                        Rollout
                      </th>
                      <th className="text-right p-4 text-gray-400 text-sm">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(featureFlags).map(([name, flag]) => (
                      <tr
                        key={name}
                        className="border-b border-gray-700 hover:bg-gray-750"
                      >
                        <td className="p-4 font-mono text-sm">{name}</td>
                        <td className="p-4 text-gray-300 text-sm">
                          {flag.description}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 flex-wrap">
                            {flag.tiers?.map((tier) => (
                              <span
                                key={tier}
                                className="px-2 py-0.5 bg-gray-700 rounded text-xs"
                              >
                                {tier}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {flag.rolloutPercentage}%
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() =>
                              toggleFeatureFlag(name, flag.enabled)
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                              flag.enabled ? "bg-blue-600" : "bg-gray-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                flag.enabled ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "audit" && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4 text-gray-400 text-sm">
                        Time
                      </th>
                      <th className="text-left p-4 text-gray-400 text-sm">
                        Action
                      </th>
                      <th className="text-left p-4 text-gray-400 text-sm">
                        Resource
                      </th>
                      <th className="text-left p-4 text-gray-400 text-sm">
                        User
                      </th>
                      <th className="text-left p-4 text-gray-400 text-sm">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-700 hover:bg-gray-750"
                      >
                        <td className="p-4 text-gray-400 text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 text-sm">{log.action}</td>
                        <td className="p-4 text-sm text-gray-300">
                          {log.resource}
                        </td>
                        <td className="p-4 text-sm text-gray-300">
                          {log.userId?.email || log.userId || "System"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              log.status === "success"
                                ? "bg-green-900 text-green-400"
                                : "bg-red-900 text-red-400"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-gray-500"
                        >
                          No audit logs yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
