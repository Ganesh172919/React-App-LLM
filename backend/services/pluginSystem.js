const { logger } = require("./logger");
const featureFlagService = require("./featureFlags");
const analyticsEngine = require("./analytics");
const usageTracker = require("./usageTracker");

class PluginSystem {
  constructor() {
    this.loadedPlugins = new Map();
    this.hooks = new Map();
    this.pluginContexts = new Map();
  }

  registerHook(hookName) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
  }

  _initializeHooks() {
    const coreHooks = [
      "before_message_send",
      "after_message_send",
      "before_response_generate",
      "after_response_generate",
      "on_session_create",
      "on_session_delete",
      "on_user_login",
      "on_user_register",
      "before_medical_query",
      "after_medical_query",
      "on_subscription_change",
      "on_api_key_create",
      "on_export_chat",
      "on_error",
    ];

    coreHooks.forEach((hook) => this.registerHook(hook));
    logger.info("Plugin hooks initialized", { hookCount: coreHooks.length });
  }

  async loadPlugin(pluginConfig) {
    const { id, name, hooks: pluginHooks = [], settings = {} } = pluginConfig;

    if (this.loadedPlugins.has(id)) {
      logger.warn("Plugin already loaded", { pluginId: id });
      return;
    }

    const context = {
      pluginId: id,
      settings,
      logger: logger.child({ plugin: name }),
      store: new Map(),
      api: {
        getConfig: () => ({ ...settings }),
        setStore: (key, value) => context.store.set(key, value),
        getStore: (key) => context.store.get(key),
      },
    };

    this.pluginContexts.set(id, context);

    for (const hookConfig of pluginHooks) {
      const { event, handler } = hookConfig;
      if (this.hooks.has(event)) {
        this.hooks.get(event).push({
          pluginId: id,
          pluginName: name,
          handler:
            typeof handler === "function"
              ? handler
              : async (data) => {
                  context.logger.debug(`Hook ${event} triggered`, { data });
                  return data;
                },
          priority: hookConfig.priority || 0,
        });

        this.hooks
          .get(event)
          .sort((a, b) => b.priority - a.priority);
      }
    }

    this.loadedPlugins.set(id, {
      id,
      name,
      loadedAt: new Date(),
      status: "active",
      settings,
    });

    logger.info("Plugin loaded", { pluginId: id, pluginName: name });
  }

  async executeHook(hookName, data, userId = null) {
    const hookHandlers = this.hooks.get(hookName);
    if (!hookHandlers || hookHandlers.length === 0) return data;

    let result = data;

    for (const handler of hookHandlers) {
      try {
        const timer = logger.startTimer(`plugin_hook_${hookName}_${handler.pluginName}`);
        result = (await handler.handler(result, this.pluginContexts.get(handler.pluginId))) || result;
        timer.end({ pluginId: handler.pluginId });

        if (userId) {
          usageTracker.trackPluginCall(userId, handler.pluginId);
        }
      } catch (error) {
        logger.error("Plugin hook execution failed", {
          hookName,
          pluginId: handler.pluginId,
          error,
        });
        analyticsEngine.track("plugin_error", userId, {
          pluginId: handler.pluginId,
          hookName,
          error: error.message,
        });
      }
    }

    return result;
  }

  async unloadPlugin(pluginId) {
    if (!this.loadedPlugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    for (const [hookName, handlers] of this.hooks) {
      this.hooks.set(
        hookName,
        handlers.filter((h) => h.pluginId !== pluginId)
      );
    }

    this.pluginContexts.delete(pluginId);
    this.loadedPlugins.delete(pluginId);

    logger.info("Plugin unloaded", { pluginId });
  }

  getLoadedPlugins() {
    const plugins = [];
    for (const [, plugin] of this.loadedPlugins) {
      plugins.push(plugin);
    }
    return plugins;
  }

  getAvailableHooks() {
    const hooks = [];
    for (const [name, handlers] of this.hooks) {
      hooks.push({
        name,
        handlerCount: handlers.length,
        handlers: handlers.map((h) => ({
          pluginId: h.pluginId,
          pluginName: h.pluginName,
          priority: h.priority,
        })),
      });
    }
    return hooks;
  }

  isPluginLoaded(pluginId) {
    return this.loadedPlugins.has(pluginId);
  }

  getPluginContext(pluginId) {
    return this.pluginContexts.get(pluginId);
  }
}

const pluginSystem = new PluginSystem();
pluginSystem._initializeHooks();

module.exports = pluginSystem;
