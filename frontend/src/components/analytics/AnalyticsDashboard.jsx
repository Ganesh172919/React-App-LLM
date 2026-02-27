import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function AnalyticsDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [userRes, dashRes] = await Promise.all([
          fetch(`http://localhost:5000/api/analytics/user?days=${period}`, {
            credentials: "include",
          }),
          fetch("http://localhost:5000/api/analytics/dashboard", {
            credentials: "include",
          }).catch(() => null),
        ]);

        if (userRes.ok) {
          setAnalytics(await userRes.json());
        }
        if (dashRes?.ok) {
          setDashboard(await dashRes.json());
        }
      } catch (error) {
        console.error("Analytics fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, period]);

  const maxMessages = analytics?.usage
    ? Math.max(...analytics.usage.map((d) => d.messageCount), 1)
    : 1;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="flex items-center gap-4">
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-white transition"
            >
              ← Back
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Total Messages</p>
                <p className="text-3xl font-bold">
                  {analytics?.usage?.reduce(
                    (sum, d) => sum + d.messageCount,
                    0
                  ) || 0}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Tokens Used</p>
                <p className="text-3xl font-bold">
                  {(
                    analytics?.tokenUsage?.monthlyTokens || 0
                  ).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Medical Queries</p>
                <p className="text-3xl font-bold text-green-400">
                  {analytics?.usage?.reduce(
                    (sum, d) => sum + d.medicalQueries,
                    0
                  ) || 0}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">API Calls</p>
                <p className="text-3xl font-bold text-blue-400">
                  {analytics?.usage?.reduce(
                    (sum, d) => sum + d.apiCalls,
                    0
                  ) || 0}
                </p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Message Activity</h2>
              <div className="flex items-end gap-1 h-48">
                {analytics?.usage?.map((day, idx) => (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-blue-600 rounded-t transition-all hover:bg-blue-500"
                      style={{
                        height: `${Math.max(
                          (day.messageCount / maxMessages) * 100,
                          2
                        )}%`,
                      }}
                      title={`${day.messageCount} messages`}
                    ></div>
                    <span className="text-xs text-gray-500 rotate-45 origin-left">
                      {new Date(day.date).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {analytics?.journey && analytics.journey.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analytics.journey.map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-sm">{event.event}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dashboard && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    System Performance
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Memory Used</span>
                      <span>
                        {dashboard.performance?.process?.memory?.heapUsed || 0}{" "}
                        MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cache Hit Rate</span>
                      <span>{dashboard.cache?.hitRate || "0%"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Queue Depth</span>
                      <span>{dashboard.queue?.queueDepth || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Uptime</span>
                      <span>
                        {Math.floor(
                          (dashboard.performance?.process?.uptime || 0) / 3600
                        )}
                        h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Top Events</h2>
                  <div className="space-y-2">
                    {dashboard.summary?.topEvents?.map((event, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center"
                      >
                        <span className="text-gray-300 text-sm">
                          {event.event}
                        </span>
                        <span className="text-blue-400 font-mono text-sm">
                          {event.count}
                        </span>
                      </div>
                    ))}
                    {(!dashboard.summary?.topEvents ||
                      dashboard.summary.topEvents.length === 0) && (
                      <p className="text-gray-500 text-sm">
                        No events recorded yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
