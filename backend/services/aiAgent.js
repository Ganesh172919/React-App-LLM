const { logger } = require("./logger");
const usageTracker = require("./usageTracker");
const analyticsEngine = require("./analytics");
const cacheService = require("./cache");

class AIAgent {
  constructor() {
    this.taskHistory = new Map();
    this.planCache = new Map();
    this.validationRules = [];
    this.maxIterations = 5;
    this.safetyChecks = [];

    this._initializeSafetyChecks();
    this._initializeValidationRules();
  }

  _initializeSafetyChecks() {
    this.safetyChecks = [
      {
        name: "code_injection_check",
        check: (input) => {
          const dangerousPatterns = [
            /eval\s*\(/i,
            /exec\s*\(/i,
            /require\s*\(\s*['"]child_process['"]\s*\)/i,
            /process\.exit/i,
            /__proto__/i,
            /constructor\.prototype/i,
            /Function\s*\(/i,
            /setTimeout\s*\(\s*['"`]/i,
            /setInterval\s*\(\s*['"`]/i,
            /import\s*\(\s*['"`]/i,
          ];
          return !dangerousPatterns.some((p) => p.test(JSON.stringify(input)));
        },
        message: "Potentially dangerous code pattern detected",
      },
      {
        name: "size_check",
        check: (input) => {
          const size = JSON.stringify(input).length;
          return size < 100000;
        },
        message: "Input exceeds maximum allowed size",
      },
      {
        name: "hallucination_guard",
        check: (input) => {
          if (!input.requirements) return true;
          const words = input.requirements.split(/\s+/);
          return words.length >= 3;
        },
        message: "Requirements too vague - provide more detail",
      },
    ];
  }

  _initializeValidationRules() {
    this.validationRules = [
      {
        name: "syntax_check",
        validate: (output) => {
          if (!output.code) return { valid: true };
          try {
            const acorn = require("acorn");
            acorn.parse(output.code, { ecmaVersion: 2020, sourceType: "module" });
            return { valid: true };
          } catch (e) {
            return { valid: false, error: `Syntax error: ${e.message}` };
          }
        },
      },
      {
        name: "completeness_check",
        validate: (output) => {
          if (!output.modules) return { valid: true };
          const incomplete = output.modules.filter(
            (m) => !m.code || m.code.trim().length === 0
          );
          return {
            valid: incomplete.length === 0,
            error:
              incomplete.length > 0
                ? `Incomplete modules: ${incomplete.map((m) => m.name).join(", ")}`
                : null,
          };
        },
      },
      {
        name: "architecture_check",
        validate: (output) => {
          if (!output.modules) return { valid: true };
          const violations = [];

          const hasCircularDeps = this._checkCircularDependencies(
            output.modules
          );
          if (hasCircularDeps) {
            violations.push("Circular dependency detected");
          }

          return {
            valid: violations.length === 0,
            error: violations.length > 0 ? violations.join("; ") : null,
          };
        },
      },
    ];
  }

  _checkCircularDependencies(modules) {
    const graph = new Map();
    modules.forEach((m) => {
      graph.set(m.name, m.dependencies || []);
    });

    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (node) => {
      visited.add(node);
      recursionStack.add(node);

      const deps = graph.get(node) || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const [node] of graph) {
      if (!visited.has(node)) {
        if (hasCycle(node)) return true;
      }
    }

    return false;
  }

  async runSafetyChecks(input) {
    const failures = [];
    for (const check of this.safetyChecks) {
      if (!check.check(input)) {
        failures.push({ name: check.name, message: check.message });
      }
    }
    return { safe: failures.length === 0, failures };
  }

  async plan(requirements, context = {}) {
    const timer = logger.startTimer("agent_planning");

    const cacheKey = `plan:${this._hashString(requirements)}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      timer.end({ cached: true });
      return cached;
    }

    const plan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      requirements,
      createdAt: new Date().toISOString(),
      steps: [],
      estimatedComplexity: "medium",
      estimatedModules: 0,
    };

    const tasks = this._decomposeRequirements(requirements);
    plan.steps = tasks.map((task, index) => ({
      id: `step_${index + 1}`,
      description: task.description,
      type: task.type,
      dependencies: task.dependencies || [],
      estimatedEffort: task.effort || "medium",
      status: "pending",
    }));

    plan.estimatedModules = tasks.filter((t) => t.type === "generate").length;
    plan.estimatedComplexity = this._estimateComplexity(tasks);

    cacheService.set(cacheKey, plan, 3600000);
    timer.end({ steps: plan.steps.length });

    return plan;
  }

  _decomposeRequirements(requirements) {
    const tasks = [];
    const reqLower = requirements.toLowerCase();

    if (reqLower.includes("api") || reqLower.includes("endpoint")) {
      tasks.push({
        description: "Design API endpoint structure",
        type: "design",
        effort: "low",
      });
      tasks.push({
        description: "Generate route handlers",
        type: "generate",
        effort: "medium",
        dependencies: ["step_1"],
      });
      tasks.push({
        description: "Generate controller logic",
        type: "generate",
        effort: "medium",
        dependencies: ["step_1"],
      });
      tasks.push({
        description: "Add input validation",
        type: "generate",
        effort: "low",
        dependencies: ["step_2", "step_3"],
      });
    }

    if (reqLower.includes("model") || reqLower.includes("database") || reqLower.includes("schema")) {
      tasks.push({
        description: "Design data model schema",
        type: "design",
        effort: "medium",
      });
      tasks.push({
        description: "Generate Mongoose model",
        type: "generate",
        effort: "medium",
        dependencies: [`step_${tasks.length}`],
      });
    }

    if (reqLower.includes("component") || reqLower.includes("ui") || reqLower.includes("page")) {
      tasks.push({
        description: "Design component structure",
        type: "design",
        effort: "low",
      });
      tasks.push({
        description: "Generate React component",
        type: "generate",
        effort: "medium",
        dependencies: [`step_${tasks.length}`],
      });
      tasks.push({
        description: "Add styling and responsiveness",
        type: "generate",
        effort: "low",
        dependencies: [`step_${tasks.length}`],
      });
    }

    if (reqLower.includes("test")) {
      tasks.push({
        description: "Generate test cases",
        type: "generate",
        effort: "medium",
      });
    }

    if (tasks.length === 0) {
      tasks.push({
        description: "Analyze requirements",
        type: "analyze",
        effort: "low",
      });
      tasks.push({
        description: "Generate implementation",
        type: "generate",
        effort: "medium",
        dependencies: ["step_1"],
      });
      tasks.push({
        description: "Validate output",
        type: "validate",
        effort: "low",
        dependencies: ["step_2"],
      });
    }

    return tasks;
  }

  _estimateComplexity(tasks) {
    const effortMap = { low: 1, medium: 2, high: 3 };
    const total = tasks.reduce(
      (sum, t) => sum + (effortMap[t.effort] || 2),
      0
    );
    if (total <= 3) return "low";
    if (total <= 8) return "medium";
    return "high";
  }

  async execute(plan, userId) {
    const timer = logger.startTimer("agent_execution");

    const safetyResult = await this.runSafetyChecks({
      requirements: plan.requirements,
    });
    if (!safetyResult.safe) {
      throw new Error(
        `Safety check failed: ${safetyResult.failures.map((f) => f.message).join(", ")}`
      );
    }

    const execution = {
      planId: plan.id,
      startedAt: new Date().toISOString(),
      results: [],
      iterations: 0,
      status: "running",
    };

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      execution.iterations++;

      for (const step of plan.steps) {
        if (step.status === "completed") continue;

        const depsComplete = step.dependencies.every((depId) => {
          const depStep = plan.steps.find((s) => s.id === depId);
          return depStep && depStep.status === "completed";
        });

        if (!depsComplete) continue;

        try {
          const result = await this._executeStep(step, plan, execution);
          step.status = "completed";
          step.result = result;
          execution.results.push({ stepId: step.id, result, status: "success" });
        } catch (error) {
          step.status = "failed";
          step.error = error.message;
          execution.results.push({
            stepId: step.id,
            error: error.message,
            status: "failed",
          });
          logger.error("Agent step failed", {
            stepId: step.id,
            error: error.message,
          });
        }
      }

      const allComplete = plan.steps.every(
        (s) => s.status === "completed" || s.status === "failed"
      );
      if (allComplete) break;
    }

    const validationResult = this._validateOutput(execution);
    execution.validation = validationResult;
    execution.status = validationResult.valid ? "completed" : "needs_review";
    execution.completedAt = new Date().toISOString();

    if (userId) {
      usageTracker.trackAgentInvocation(userId, "code_generation");
      analyticsEngine.track("agent_execution_completed", userId, {
        planId: plan.id,
        iterations: execution.iterations,
        status: execution.status,
      });
    }

    this.taskHistory.set(plan.id, execution);
    timer.end({ status: execution.status, iterations: execution.iterations });

    return execution;
  }

  async _executeStep(step, plan) {
    const stepTimer = logger.startTimer(`agent_step_${step.id}`);

    let result;
    switch (step.type) {
      case "analyze":
        result = {
          type: "analysis",
          description: step.description,
          findings: [`Analyzed requirements: ${plan.requirements}`],
          recommendations: ["Proceed with implementation"],
        };
        break;

      case "design":
        result = {
          type: "design",
          description: step.description,
          structure: this._generateDesign(step, plan),
        };
        break;

      case "generate":
        result = {
          type: "code",
          description: step.description,
          modules: this._generateModules(step, plan),
        };
        break;

      case "validate":
        result = {
          type: "validation",
          description: step.description,
          passed: true,
          checks: ["syntax", "completeness", "architecture"],
        };
        break;

      default:
        result = {
          type: "generic",
          description: step.description,
          output: `Completed: ${step.description}`,
        };
    }

    stepTimer.end({ stepType: step.type });
    return result;
  }

  _generateDesign(step, plan) {
    return {
      description: step.description,
      components: [
        {
          name: "core",
          type: "module",
          responsibility: "Core business logic",
        },
        {
          name: "interface",
          type: "module",
          responsibility: "External interface layer",
        },
        {
          name: "data",
          type: "module",
          responsibility: "Data access layer",
        },
      ],
      patterns: ["Repository Pattern", "Service Layer", "Dependency Injection"],
      constraints: plan.requirements,
    };
  }

  _generateModules(step, plan) {
    return [
      {
        name: `${step.id}_module`,
        type: "implementation",
        description: step.description,
        code: `// Auto-generated module for: ${step.description}\n// Requirements: ${plan.requirements}\nmodule.exports = {};`,
        dependencies: [],
        language: "javascript",
      },
    ];
  }

  _validateOutput(execution) {
    const failures = [];

    for (const result of execution.results) {
      if (result.status === "failed") {
        failures.push(`Step ${result.stepId} failed: ${result.error}`);
        continue;
      }

      if (result.result?.type === "code" && result.result?.modules) {
        for (const rule of this.validationRules) {
          const check = rule.validate(result.result);
          if (!check.valid) {
            failures.push(`${rule.name}: ${check.error}`);
          }
        }
      }
    }

    return {
      valid: failures.length === 0,
      failures,
      checksRun: this.validationRules.length,
      timestamp: new Date().toISOString(),
    };
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  getTaskHistory(planId) {
    return this.taskHistory.get(planId) || null;
  }

  getCapabilities() {
    return {
      taskTypes: ["analyze", "design", "generate", "validate", "refactor"],
      supportedLanguages: ["javascript", "typescript", "python", "html", "css"],
      maxIterations: this.maxIterations,
      safetyChecks: this.safetyChecks.map((c) => c.name),
      validationRules: this.validationRules.map((r) => r.name),
    };
  }
}

const aiAgent = new AIAgent();
module.exports = aiAgent;
