const { Plugin, PluginInstall } = require("../models/pluginModel");
const pluginSystem = require("../services/pluginSystem");
const { logger } = require("../services/logger");

exports.listPlugins = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { status: "published" };

    if (category) query.category = category;

    let plugins = await Plugin.find(query)
      .sort({ "stats.installs": -1 })
      .lean();

    if (search) {
      const searchLower = search.toLowerCase();
      plugins = plugins.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    res.json({ plugins });
  } catch (error) {
    logger.error("List plugins error", { error: error.message });
    res.status(500).json({ error: "Failed to list plugins" });
  }
};

exports.getPlugin = async (req, res) => {
  try {
    const plugin = await Plugin.findOne({
      slug: req.params.slug,
      status: "published",
    }).lean();

    if (!plugin) {
      return res.status(404).json({ error: "Plugin not found" });
    }

    const install = await PluginInstall.findOne({
      userId: req.user.id,
      pluginId: plugin._id,
    });

    res.json({
      plugin,
      installed: !!install && install.status === "active",
    });
  } catch (error) {
    logger.error("Get plugin error", { error: error.message });
    res.status(500).json({ error: "Failed to get plugin" });
  }
};

exports.installPlugin = async (req, res) => {
  try {
    const plugin = await Plugin.findOne({
      slug: req.params.slug,
      status: "published",
    });

    if (!plugin) {
      return res.status(404).json({ error: "Plugin not found" });
    }

    const existing = await PluginInstall.findOne({
      userId: req.user.id,
      pluginId: plugin._id,
    });

    if (existing && existing.status === "active") {
      return res.status(400).json({ error: "Plugin already installed" });
    }

    if (existing) {
      existing.status = "active";
      await existing.save();
    } else {
      await PluginInstall.create({
        userId: req.user.id,
        pluginId: plugin._id,
      });
    }

    plugin.stats.installs++;
    plugin.stats.activeInstalls++;
    await plugin.save();

    await pluginSystem.loadPlugin({
      id: plugin._id.toString(),
      name: plugin.name,
      hooks: plugin.config.hooks || [],
      settings: plugin.config.settings || {},
    });

    res.json({ message: "Plugin installed successfully", plugin: { name: plugin.name, slug: plugin.slug } });
  } catch (error) {
    logger.error("Install plugin error", { error: error.message });
    res.status(500).json({ error: "Failed to install plugin" });
  }
};

exports.uninstallPlugin = async (req, res) => {
  try {
    const plugin = await Plugin.findOne({ slug: req.params.slug });
    if (!plugin) {
      return res.status(404).json({ error: "Plugin not found" });
    }

    const install = await PluginInstall.findOne({
      userId: req.user.id,
      pluginId: plugin._id,
    });

    if (!install || install.status !== "active") {
      return res.status(400).json({ error: "Plugin is not installed" });
    }

    install.status = "uninstalled";
    await install.save();

    plugin.stats.activeInstalls = Math.max(0, plugin.stats.activeInstalls - 1);
    await plugin.save();

    if (pluginSystem.isPluginLoaded(plugin._id.toString())) {
      await pluginSystem.unloadPlugin(plugin._id.toString());
    }

    res.json({ message: "Plugin uninstalled successfully" });
  } catch (error) {
    logger.error("Uninstall plugin error", { error: error.message });
    res.status(500).json({ error: "Failed to uninstall plugin" });
  }
};

exports.getInstalledPlugins = async (req, res) => {
  try {
    const installs = await PluginInstall.find({
      userId: req.user.id,
      status: "active",
    }).populate("pluginId");

    const plugins = installs
      .filter((i) => i.pluginId)
      .map((i) => ({
        id: i.pluginId._id,
        name: i.pluginId.name,
        slug: i.pluginId.slug,
        description: i.pluginId.description,
        category: i.pluginId.category,
        version: i.pluginId.version,
        installedAt: i.installedAt,
        settings: i.settings,
      }));

    res.json({ plugins });
  } catch (error) {
    logger.error("Get installed plugins error", { error: error.message });
    res.status(500).json({ error: "Failed to get installed plugins" });
  }
};
