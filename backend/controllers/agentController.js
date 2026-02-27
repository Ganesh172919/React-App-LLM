const aiAgent = require("../services/aiAgent");
const { logger } = require("../services/logger");

exports.getCapabilities = async (req, res) => {
  try {
    const capabilities = aiAgent.getCapabilities();
    res.json(capabilities);
  } catch (error) {
    logger.error("Get capabilities error", { error: error.message });
    res.status(500).json({ error: "Failed to get agent capabilities" });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { requirements, context } = req.body;
    const plan = await aiAgent.plan(requirements, context || {});

    res.json({
      message: "Plan created successfully",
      plan,
    });
  } catch (error) {
    logger.error("Create plan error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

exports.executePlan = async (req, res) => {
  try {
    const { planId, requirements, context } = req.body;

    let plan;
    if (planId) {
      plan = aiAgent.getTaskHistory(planId);
      if (!plan) {
        plan = await aiAgent.plan(requirements || "Execute task", context || {});
      }
    } else {
      plan = await aiAgent.plan(
        requirements || "Execute task",
        context || {}
      );
    }

    const execution = await aiAgent.execute(plan, req.user.id);

    res.json({
      message: "Execution completed",
      execution,
    });
  } catch (error) {
    logger.error("Execute plan error", { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

exports.getTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = aiAgent.getTaskHistory(taskId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ task });
  } catch (error) {
    logger.error("Get task status error", { error: error.message });
    res.status(500).json({ error: "Failed to get task status" });
  }
};
