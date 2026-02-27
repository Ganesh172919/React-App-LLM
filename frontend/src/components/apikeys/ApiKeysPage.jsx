import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function ApiKeysPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [keys, setKeys] = useState([]);
  const [stats, setStats] = useState(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchKeys = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/keys", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys || []);
        setStats(data.stats);
      }
    } catch (err) {
      setError("Failed to load API keys");
    }
  };

  useEffect(() => {
    if (user) fetchKeys();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          permissions: ["chat:read", "chat:write", "medical:query"],
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok) {
        setNewKey(data.key);
        setNewKeyName("");
        fetchKeys();
      } else {
        setError(data.error || "Failed to create key");
      }
    } catch (err) {
      setError("Failed to create API key");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (keyId) => {
    if (!window.confirm("Are you sure you want to revoke this API key?")) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/keys/${keyId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (response.ok) {
        fetchKeys();
      }
    } catch (err) {
      setError("Failed to revoke key");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">API Keys</h1>
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white transition"
          >
            ← Back to Chat
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-800 rounded-lg">{error}</div>
        )}

        {newKey && (
          <div className="mb-6 p-4 bg-green-800 rounded-lg">
            <p className="font-bold mb-2">
              🔑 API Key Created - Copy it now!
            </p>
            <div className="bg-gray-900 p-3 rounded font-mono text-sm break-all">
              {newKey}
            </div>
            <p className="text-yellow-300 text-xs mt-2">
              ⚠️ This key will only be shown once. Store it securely.
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                setNewKey(null);
              }}
              className="mt-2 bg-green-700 hover:bg-green-600 px-4 py-1 rounded text-sm"
            >
              Copy & Dismiss
            </button>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-gray-400 text-sm">Total Keys</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-400">
                {stats.active}
              </p>
              <p className="text-gray-400 text-sm">Active</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-400">
                {stats.revoked}
              </p>
              <p className="text-gray-400 text-sm">Revoked</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {stats.totalUsage?.toLocaleString()}
              </p>
              <p className="text-gray-400 text-sm">Total Requests</p>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New API Key</h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., Production API)"
              className="flex-1 p-2 bg-gray-700 text-white rounded-md outline-none focus:ring focus:ring-blue-500"
              maxLength={100}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-md transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Key"}
            </button>
          </form>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-400 text-sm">Name</th>
                <th className="text-left p-4 text-gray-400 text-sm">Key</th>
                <th className="text-left p-4 text-gray-400 text-sm">
                  Status
                </th>
                <th className="text-left p-4 text-gray-400 text-sm">Usage</th>
                <th className="text-left p-4 text-gray-400 text-sm">
                  Last Used
                </th>
                <th className="text-right p-4 text-gray-400 text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-gray-700 hover:bg-gray-750"
                >
                  <td className="p-4 font-medium">{key.name}</td>
                  <td className="p-4 font-mono text-sm text-gray-400">
                    {key.prefix}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        key.status === "active"
                          ? "bg-green-900 text-green-400"
                          : "bg-red-900 text-red-400"
                      }`}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">
                    {key.usageCount?.toLocaleString()} requests
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="p-4 text-right">
                    {key.status === "active" && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No API keys yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ApiKeysPage;
