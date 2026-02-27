import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { SubscriptionContext } from "../../context/SubscriptionContext";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    features: [
      "25 messages/day",
      "10 chat sessions",
      "Basic AI (Gemini Flash)",
      "Medical query support",
      "1,024 tokens/request",
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.99,
    period: "/month",
    features: [
      "500 messages/day",
      "100 chat sessions",
      "Advanced AI (Gemini Pro)",
      "Medical query support",
      "4,096 tokens/request",
      "API access",
      "Export chat history",
      "Usage analytics",
      "Priority support",
      "5 plugin slots",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99.99,
    period: "/month",
    features: [
      "Unlimited messages",
      "Unlimited sessions",
      "Advanced AI (Gemini Pro)",
      "Medical query support",
      "8,192 tokens/request",
      "Full API access",
      "Export chat history",
      "Advanced analytics",
      "Admin panel",
      "Custom AI models",
      "SSO integration",
      "Audit logging",
      "Dedicated support",
      "Unlimited plugins",
      "AI Agent system",
    ],
    cta: "Upgrade to Enterprise",
    highlight: false,
  },
];

function SubscriptionPage() {
  const { subscription, usage, limits, upgradeTier, cancelSubscription } =
    useContext(SubscriptionContext);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleUpgrade = async (tier) => {
    if (tier === subscription?.tier) return;
    setUpgrading(true);
    setMessage(null);
    const result = await upgradeTier(tier);
    setMessage(result);
    setUpgrading(false);
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription?")) return;
    const result = await cancelSubscription("User requested cancellation");
    setMessage(result);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white transition"
          >
            ← Back to Chat
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.success ? "bg-green-800" : "bg-red-800"
            }`}
          >
            {message.message}
          </div>
        )}

        {subscription && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Tier</p>
                <p className="text-lg font-bold capitalize">
                  {subscription.tier}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p
                  className={`text-lg font-bold ${
                    subscription.status === "active"
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {subscription.status}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Messages Today</p>
                <p className="text-lg font-bold">
                  {usage?.daily?.messageCount || 0}
                  {limits?.messagesPerDay > 0 && ` / ${limits.messagesPerDay}`}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Tokens Used (Monthly)</p>
                <p className="text-lg font-bold">
                  {usage?.tokens?.monthlyTokens?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-lg p-6 border-2 transition ${
                tier.highlight
                  ? "border-blue-500 bg-gray-800 shadow-lg shadow-blue-500/20"
                  : "border-gray-700 bg-gray-800"
              } ${subscription?.tier === tier.id ? "ring-2 ring-green-500" : ""}`}
            >
              {tier.highlight && (
                <span className="bg-blue-600 text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">
                  MOST POPULAR
                </span>
              )}
              {subscription?.tier === tier.id && (
                <span className="bg-green-600 text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block ml-2">
                  CURRENT
                </span>
              )}
              <h3 className="text-2xl font-bold mt-2">{tier.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">${tier.price}</span>
                <span className="text-gray-400">{tier.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={
                  upgrading ||
                  subscription?.tier === tier.id ||
                  (subscription?.tier === "enterprise" && tier.id !== "enterprise")
                }
                title={
                  subscription?.tier === "enterprise" && tier.id !== "enterprise"
                    ? "Contact support to downgrade from Enterprise"
                    : undefined
                }
                className={`w-full py-3 rounded-lg font-bold transition ${
                  subscription?.tier === tier.id
                    ? "bg-green-700 cursor-default"
                    : tier.highlight
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-700 hover:bg-gray-600"
                } disabled:opacity-50`}
              >
                {subscription?.tier === tier.id
                  ? "Current Plan"
                  : upgrading
                    ? "Processing..."
                    : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {subscription?.tier !== "free" && subscription?.status === "active" && (
          <div className="mt-8 text-center">
            <button
              onClick={handleCancel}
              className="text-red-400 hover:text-red-300 text-sm transition"
            >
              Cancel Subscription
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubscriptionPage;
