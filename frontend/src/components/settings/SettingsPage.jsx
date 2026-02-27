import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { SubscriptionContext } from "../../context/SubscriptionContext";

function SettingsPage() {
  const { user, logout } = useContext(AuthContext);
  const { subscription } = useContext(SubscriptionContext);
  const navigate = useNavigate();

  const [preferences, setPreferences] = useState({
    theme: "dark",
    language: "en",
    notifications: true,
    defaultModel: "gemini-1.5-flash",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      setMessage({ type: "success", text: "Settings saved successfully" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white transition"
          >
            ← Back
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success" ? "bg-green-800" : "bg-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Email
                </label>
                <p className="text-lg">{user?.email || "Not set"}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Subscription
                </label>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      subscription?.tier === "enterprise"
                        ? "bg-purple-900 text-purple-300"
                        : subscription?.tier === "pro"
                          ? "bg-blue-900 text-blue-300"
                          : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {subscription?.tier?.toUpperCase() || "FREE"}
                  </span>
                  <button
                    onClick={() => navigate("/subscription")}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Manage Plan →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Theme
                </label>
                <select
                  value={preferences.theme}
                  onChange={(e) =>
                    setPreferences({ ...preferences, theme: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Default AI Model
                </label>
                <select
                  value={preferences.defaultModel}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      defaultModel: e.target.value,
                    })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="gemini-1.5-flash">
                    Gemini 1.5 Flash (Fast)
                  </option>
                  <option
                    value="gemini-1.5-pro"
                    disabled={
                      subscription?.tier !== "pro" &&
                      subscription?.tier !== "enterprise"
                    }
                  >
                    Gemini 1.5 Pro (Advanced){" "}
                    {subscription?.tier === "free" && "- Pro required"}
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm text-gray-400">
                    Notifications
                  </label>
                  <p className="text-xs text-gray-500">
                    Receive email notifications for important updates
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPreferences({
                      ...preferences,
                      notifications: !preferences.notifications,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    preferences.notifications ? "bg-blue-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      preferences.notifications
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => navigate("/subscription")}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-left transition"
              >
                💳 Subscription
              </button>
              <button
                onClick={() => navigate("/api-keys")}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-left transition"
              >
                🔑 API Keys
              </button>
              <button
                onClick={() => navigate("/analytics")}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-left transition"
              >
                📊 Analytics
              </button>
              <button
                onClick={() => navigate("/admin")}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-left transition"
              >
                ⚙️ Admin Panel
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-400">
              Danger Zone
            </h2>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to log out?"
                  )
                ) {
                  logout();
                  navigate("/login");
                }
              }}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
