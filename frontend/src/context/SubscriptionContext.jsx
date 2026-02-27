import React, { createContext, useState, useContext, useCallback, useEffect } from "react";
import { AuthContext } from "./AuthContext";

export const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/subscription", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setUsage(data.usage);
        setLimits(data.limits);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const upgradeTier = async (tier) => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/subscription/upgrade",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
          credentials: "include",
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSubscription(data.subscription);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error };
    } catch (error) {
      return { success: false, message: "Failed to upgrade" };
    }
  };

  const cancelSubscription = async (reason) => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/subscription/cancel",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
          credentials: "include",
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSubscription(data.subscription);
        return { success: true };
      }
      return { success: false, message: data.error };
    } catch (error) {
      return { success: false, message: "Failed to cancel" };
    }
  };

  const hasFeature = (feature) => {
    return subscription?.features?.includes(feature) || false;
  };

  const isProOrHigher = () => {
    return subscription?.tier === "pro" || subscription?.tier === "enterprise";
  };

  const isEnterprise = () => {
    return subscription?.tier === "enterprise";
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        usage,
        limits,
        loading,
        fetchSubscription,
        upgradeTier,
        cancelSubscription,
        hasFeature,
        isProOrHigher,
        isEnterprise,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
