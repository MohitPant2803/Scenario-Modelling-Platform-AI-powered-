import { Router } from "express";
import mongoose from "mongoose";
import { ChatMessageModel, ProjectModel, ScenarioModel } from "../lib/models.js";
import { requireAuth } from "../middleware/requireAuth.js";

const aiRouter = Router();

const hfToken = process.env.HF_TOKEN;
const hfBaseUrl = process.env.HF_BASE_URL || "https://router.huggingface.co/v1/chat/completions";
const hfTextModel = process.env.HF_TEXT_MODEL || "zai-org/GLM-4.5:fastest";
const hfVisionModel = process.env.HF_VISION_MODEL || "zai-org/GLM-4.5V:fastest";

type TableData = {
  columns?: unknown[];
  rows?: unknown[];
};

type ChartSource = "excel" | "image";

type ChatContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

type StructuredSummary = {
  missing_data?: string[];
  summary?: string;
  key_assumptions?: string[];
  table_insights?: string[];
  graph_insights?: string[];
  scenario_highlights?: string[];
  project_highlights?: string[];
  risks?: string[];
  inconsistencies?: string[];
  confidence?: string;
};

type ChatCompletionResponseFormat = {
  type: "json_schema";
  json_schema: {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
  };
};

async function createChatCompletion(
  model: string,
  messages: ChatMessage[],
  responseFormat?: ChatCompletionResponseFormat
): Promise<string> {
  if (!hfToken) return "";

  const response = await fetch(hfBaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages,
      ...(responseFormat ? { response_format: responseFormat } : {})
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return data.choices?.[0]?.message?.content ?? "";
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeTableData(table: TableData | null | undefined) {
  const columns = Array.isArray(table?.columns) ? table.columns.map((column) => stringValue(column)) : [];
  const rows = Array.isArray(table?.rows)
    ? table.rows.map((row) => (Array.isArray(row) ? row.map((cell) => stringValue(cell)) : []))
    : [];

  return { columns, rows };
}

function hasFilledTable(table: TableData | null | undefined) {
  const normalized = normalizeTableData(table);
  return Boolean(
    normalized.rows.some((row) => row.some((cell) => cell !== "")) || normalized.columns.some((column) => column !== "")
  );
}

function hasEnoughScenarioInformation(scenario: {
  title?: string;
  context?: string;
  equation?: string;
  variables?: unknown[];
  tableData?: TableData;
  chartSource?: ChartSource;
  graphPngDataUrl?: string;
}) {
  const usesImageChart = scenario.chartSource === "image";
  const signals = [
    Boolean(scenario.context?.trim()),
    Boolean(scenario.equation?.trim()),
    Boolean(scenario.variables?.length),
    hasFilledTable(scenario.tableData),
    usesImageChart && Boolean(scenario.graphPngDataUrl?.trim())
  ];

  const count = signals.filter(Boolean).length;
  return count >= 2 || (Boolean(scenario.context?.trim()) && hasFilledTable(scenario.tableData));
}

function normalizeScenarioForChecks(scenario: {
  title?: string;
  context?: string;
  equation?: string;
  variables?: unknown[];
  tableData?: unknown;
  chartSource?: ChartSource;
  graphPngDataUrl?: string;
}) {
  const rawTable = scenario.tableData as TableData | null | undefined;
  return {
    title: scenario.title,
    context: scenario.context,
    equation: scenario.equation,
    variables: Array.isArray(scenario.variables) ? scenario.variables : [],
    tableData: normalizeTableData(rawTable),
    chartSource: scenario.chartSource,
    graphPngDataUrl: scenario.graphPngDataUrl
  };
}

function insufficientScenarioMessage() {
  return "Not enough information to generate a useful AI summary yet. Add at least a description plus one more source such as assumptions/formulas, Excel data, equation, or a graph image.";
}

function parseNumber(value: string) {
  const normalized = value.replace(/,/g, "").replace(/%/g, "").trim();
  if (!normalized || !/^[-+]?(\d+(\.\d+)?|\.\d+)$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}

function summarizeNumericColumn(label: string, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = values[0];
  const last = values[values.length - 1];
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const delta = last - first;
  const change = first !== 0 ? (delta / Math.abs(first)) * 100 : null;

  return {
    column: label,
    count: values.length,
    min: formatNumber(min),
    max: formatNumber(max),
    average: formatNumber(avg),
    first: formatNumber(first),
    last: formatNumber(last),
    delta: formatNumber(delta),
    percentChange: change === null ? "n/a" : `${formatNumber(change)}%`
  };
}

function buildTableAnalysis(table: TableData | null | undefined) {
  const normalized = normalizeTableData(table);
  const meaningfulRows = normalized.rows.filter((row) => row.some((cell) => cell !== ""));
  const sampleRows = meaningfulRows.slice(0, 20);
  const tailRows = meaningfulRows.length > 20 ? meaningfulRows.slice(-5) : [];
  const numericInsights = normalized.columns
    .map((column, index) => {
      const values = meaningfulRows
        .map((row) => parseNumber(row[index] ?? ""))
        .filter((value): value is number => value !== null);

      if (values.length < 2) return null;
      return summarizeNumericColumn(column || `Column ${index + 1}`, values);
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .slice(0, 8);

  return {
    columnCount: normalized.columns.length,
    rowCount: meaningfulRows.length,
    columns: normalized.columns,
    sampleRows,
    tailRows,
    numericInsights,
    hasData: meaningfulRows.length > 0 || normalized.columns.length > 0
  };
}

function buildScenarioContextBlock(scenario: {
  title?: string;
  context?: string;
  equation?: string;
  variables?: unknown[];
  tableData?: TableData;
  chartSource?: ChartSource;
  graphPngDataUrl?: string;
}) {
  const tableAnalysis = buildTableAnalysis(scenario.tableData);
  const selectedChartSource = scenario.chartSource === "image" ? "uploaded image" : "excel chart";
  const selectedImageAvailable = scenario.chartSource === "image" && Boolean(scenario.graphPngDataUrl);

  return {
    text: [
      `Scenario title: ${scenario.title || "[missing]"}`,
      `Scenario description / assumptions / information: ${scenario.context || "[missing]"}`,
      `Equation: ${scenario.equation || "[missing]"}`,
      `Selected chart source: ${selectedChartSource}`,
      `Variables: ${JSON.stringify(Array.isArray(scenario.variables) ? scenario.variables : [])}`,
      `Excel / table overview: ${JSON.stringify({
        columnCount: tableAnalysis.columnCount,
        rowCount: tableAnalysis.rowCount,
        columns: tableAnalysis.columns
      })}`,
      `Excel / table sample rows: ${JSON.stringify(tableAnalysis.sampleRows)}`,
      `Excel / table tail rows: ${JSON.stringify(tableAnalysis.tailRows)}`,
      `Derived numeric insights from Excel: ${JSON.stringify(tableAnalysis.numericInsights)}`,
      `Graph image: ${selectedImageAvailable ? "[Provided as image attachment.]" : "[none or not selected]"}`
    ].join("\n"),
    tableAnalysis
  };
}

function selectedScenarioImage(scenario: { chartSource?: ChartSource; graphPngDataUrl?: string }) {
  return scenario.chartSource === "image" ? scenario.graphPngDataUrl : "";
}

const summarySchema: ChatCompletionResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "scenario_project_summary",
    strict: true,
    schema: {
      type: "object",
      properties: {
        missing_data: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
        key_assumptions: { type: "array", items: { type: "string" } },
        table_insights: { type: "array", items: { type: "string" } },
        graph_insights: { type: "array", items: { type: "string" } },
        scenario_highlights: { type: "array", items: { type: "string" } },
        project_highlights: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        inconsistencies: { type: "array", items: { type: "string" } },
        confidence: { type: "string" }
      },
      required: [
        "missing_data",
        "summary",
        "key_assumptions",
        "table_insights",
        "graph_insights",
        "scenario_highlights",
        "project_highlights",
        "risks",
        "inconsistencies",
        "confidence"
      ],
      additionalProperties: false
    }
  }
};

function safeParseStructuredSummary(text: string): StructuredSummary | null {
  try {
    const parsed = JSON.parse(text) as StructuredSummary;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function formatSection(title: string, items: string[]) {
  if (!items.length) return `${title}\n- None identified.`;
  return `${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
}

function renderStructuredSummary(summary: StructuredSummary) {
  const blocks = [
    formatSection("Limitations / missing data", summary.missing_data ?? []),
    `Executive summary\n${summary.summary || "No grounded summary was produced."}`,
    formatSection("Key assumptions / information", summary.key_assumptions ?? []),
    formatSection("Excel / table insights", summary.table_insights ?? []),
    formatSection("Graph insights", summary.graph_insights ?? []),
    formatSection("Scenario highlights", summary.scenario_highlights ?? []),
    formatSection("Project highlights", summary.project_highlights ?? []),
    formatSection("Risks / limitations", summary.risks ?? []),
    formatSection("Inconsistencies / cross-checks", summary.inconsistencies ?? []),
    `Confidence\n${summary.confidence || "unknown"}`
  ];

  return blocks.join("\n\n").trim();
}

async function chatText(model: string, system: string, user: string): Promise<string> {
  if (!hfToken) return "";
  return createChatCompletion(model, [
    { role: "system", content: system },
    { role: "user", content: user }
  ]);
}

async function scenarioVisionText(options: {
  prompt: string;
  graphPngDataUrl?: string;
  system?: string;
}) {
  if (!hfToken) return "";

  const system =
    options.system ??
    "You are a careful analyst. Ground every claim in the provided scenario text, table, and image. If evidence is missing, say so clearly.";

  if (options.graphPngDataUrl?.startsWith("data:image")) {
    return createChatCompletion(hfVisionModel, [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: options.prompt },
          { type: "image_url", image_url: { url: options.graphPngDataUrl } }
        ]
      }
    ]);
  }

  return chatText(hfTextModel, system, options.prompt);
}

async function structuredVisionSummary(options: {
  prompt: string;
  graphPngDataUrl?: string;
  system: string;
}) {
  const model = options.graphPngDataUrl?.startsWith("data:image") ? hfVisionModel : hfTextModel;
  const messages: ChatMessage[] = options.graphPngDataUrl?.startsWith("data:image")
    ? [
        { role: "system", content: options.system },
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt },
            { type: "image_url", image_url: { url: options.graphPngDataUrl } }
          ]
        }
      ]
    : [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt }
      ];

  try {
    const raw = await createChatCompletion(model, messages, summarySchema);
    const parsed = safeParseStructuredSummary(raw);
    if (parsed) return renderStructuredSummary(parsed);
  } catch {
    // Fall back to regular text completion if structured output is unavailable for the selected provider.
  }

  return scenarioVisionText({
    prompt: options.prompt,
    graphPngDataUrl: options.graphPngDataUrl,
    system: options.system
  });
}

function buildCriticalInsightsPrompt(scope: "project" | "scenario", context: string) {
  return `Act like a senior government analyst.

Extract ONLY the most critical insights from the text and data below.

Strict rules:
- Max 4 bullet points
- Each bullet must be one sentence
- No explanations, no fluff
- Target 100 to 200 words total
- Prioritize impact, data, conclusions, deflection points, and probable causes
- Ignore formulas unless they directly support a number-driven conclusion
- Use only grounded information from the provided text, table, and selected chart source

${context}

After the bullet points, add one short line: "If you want, I can share more insights."

You are summarizing a ${scope}.`;
}

function buildMoreInsightsPrompt(options: {
  scope: "scenario";
  context: string;
  currentSummary: string;
  rounds: number;
}) {
  return `Act like a senior government analyst.

The user has already seen this summary:
${options.currentSummary || "[none]"}

Provide the next most important insights that were NOT already covered.

Strict rules:
- 2 or 3 bullet points only
- Each bullet must be one sentence
- Target 80 to 140 words total before the closing line
- Focus on important number-driven details, inflection points, risks, and probable causes
- Do not repeat earlier bullets unless needed for context
- Ignore formulas unless they directly support an important conclusion
- Use only grounded information from the provided text, table, and selected chart source

${options.context}

If there are still meaningful insights left after this response, end with:
If you want, I can share more insights.

If the important insights are now mostly covered, end with:
The key insights are now covered; you can use Ask AI for specific questions.

This is follow-up summary round ${options.rounds + 1} for a ${options.scope}.`;
}

function getAiErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("model_not_supported")) {
      return `The configured Hugging Face model is not supported by your enabled provider. Check backend/.env and use a currently available model such as HF_TEXT_MODEL=${hfTextModel} and HF_VISION_MODEL=${hfVisionModel}.`;
    }

    return error.message;
  }

  return "Hugging Face request failed.";
}

aiRouter.post("/projects/:id/summarize", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid project id" });
  const project = await ProjectModel.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.creatorId.toString() !== req.session.userId) return res.status(403).json({ error: "Forbidden" });

  if (!hfToken) {
    return res.json({
      summary: "HF_TOKEN is missing. Set it in backend/.env to enable Hugging Face summaries."
    });
  }

  try {
    const scenarios = await ScenarioModel.find({ projectId: project._id }).sort({ createdAt: 1 });
    const scenarioBlocks = scenarios.map((s) => ({
      title: s.title,
      context: s.context,
      equation: s.equation,
      variables: s.variables,
      tableAnalysis: buildTableAnalysis(s.tableData),
      chartSource: s.chartSource ?? "excel",
      graphImage: s.chartSource === "image" && s.graphPngDataUrl ? "[scenario graph image provided]" : "[none]"
    }));
    const projectTableAnalysis = buildTableAnalysis(project.tableData);

    const promptText = buildCriticalInsightsPrompt(
      "project",
      `Project title: ${project.title || "[missing]"}
Description: ${project.description || "[missing]"}
Formulas and important information: ${project.formulasAndInfo || "[missing]"}
Project-level table analysis: ${JSON.stringify(projectTableAnalysis)}
Graph image: ${project.graphPngDataUrl ? "[Provided as image attachment - describe what you see and how it relates to the data]" : "[none]"}
Scenarios (nested): ${JSON.stringify(scenarioBlocks)}`
    );

    const summary = await scenarioVisionText({
      prompt: promptText,
      graphPngDataUrl: project.graphPngDataUrl,
      system:
        "You are a careful government analyst. Ground every claim in the provided project text, Excel-derived statistics, and selected chart source. Focus on concise, number-driven insights."
    });

    await ProjectModel.findByIdAndUpdate(project._id, { aiSummary: summary });
    res.json({ summary });
  } catch (error) {
    res.status(502).json({ error: getAiErrorMessage(error) });
  }
});

aiRouter.post("/scenarios/:id/summarize", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid scenario id" });
  const scenario = await ScenarioModel.findById(req.params.id);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });

  const project = await ProjectModel.findById(scenario.projectId);

  if (!hfToken) {
    return res.json({
      summary: "HF_TOKEN is missing. Set it in backend/.env to enable Hugging Face summaries."
    });
  }

  if (!hasEnoughScenarioInformation(normalizeScenarioForChecks(scenario))) {
    const summary = insufficientScenarioMessage();
    await ScenarioModel.findByIdAndUpdate(scenario._id, { summary });
    return res.json({ summary });
  }

  try {
    const projectContext = project
      ? `
Parent project: ${project.title}
Project description: ${project.description || "[missing]"}
Project formulas / notes: ${project.formulasAndInfo || "[missing]"}
`
      : "";
   const scenarioContext = buildScenarioContextBlock(scenario);

    const prompt = buildCriticalInsightsPrompt(
      "scenario",
      `${projectContext}
${scenarioContext.text}`
    );

    const summary = await scenarioVisionText({
      prompt,
      graphPngDataUrl: selectedScenarioImage(scenario),
      system:
        "You are a senior government analyst. Use the scenario text as context, the Excel-derived statistics as evidence, and the selected chart source as support. Focus on number-driven insights, inflection points, and probable causes."
    });

    await ScenarioModel.findByIdAndUpdate(scenario._id, { summary });
    res.json({ summary });
  } catch (error) {
    res.status(502).json({ error: getAiErrorMessage(error) });
  }
});

aiRouter.post("/scenarios/:id/summary-more", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid scenario id" });
  const scenario = await ScenarioModel.findById(req.params.id);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });

  const project = await ProjectModel.findById(scenario.projectId);
  const currentSummary = String(req.body?.currentSummary || "").trim();
  const rounds = Number.isFinite(Number(req.body?.rounds)) ? Number(req.body?.rounds) : 0;

  if (!hfToken) {
    return res.json({
      summary: "HF_TOKEN is missing. Set it in backend/.env to enable Hugging Face summaries."
    });
  }

  if (!hasEnoughScenarioInformation(normalizeScenarioForChecks(scenario))) {
    return res.json({
      summary:
        "There is not enough scenario information yet for grounded AI help. Add a description plus assumptions/information, Excel values, equation, or a graph image first."
    });
  }

  try {
    const projectContext = project
      ? `
Parent project: ${project.title}
Project description: ${project.description || "[missing]"}
Project formulas / notes: ${project.formulasAndInfo || "[missing]"}
`
      : "";
    const scenarioContext = buildScenarioContextBlock(scenario);
    const prompt = buildMoreInsightsPrompt({
      scope: "scenario",
      context: `${projectContext}
${scenarioContext.text}`,
      currentSummary,
      rounds
    });

    const summary = await scenarioVisionText({
      prompt,
      graphPngDataUrl: selectedScenarioImage(scenario),
      system:
        "You are a senior government analyst. Continue the summary with only the next most important grounded insights. Avoid repetition and focus on meaningful additional detail."
    });

    res.json({ summary });
  } catch (error) {
    res.status(502).json({ error: getAiErrorMessage(error) });
  }
});

aiRouter.post("/scenarios/:id/chat", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ error: "question is required" });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid scenario id" });

  const scenario = await ScenarioModel.findById(req.params.id);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });
  const messages = await ChatMessageModel.find({ scenarioId: scenario._id }).sort({ createdAt: -1 }).limit(8);

  const project = await ProjectModel.findById(scenario.projectId);
  const projectContext = project
    ? `Parent project title: ${project.title}. Description: ${project.description || ""}. Formulas/notes: ${project.formulasAndInfo || ""}.`
    : "";

  if (!hfToken) {
    return res.json({
      answer: "HF_TOKEN is missing. Chat is disabled until backend/.env is configured."
    });
  }

  if (!hasEnoughScenarioInformation(normalizeScenarioForChecks(scenario))) {
    return res.json({
      answer:
        "There is not enough scenario information yet for grounded AI help. Add a description plus assumptions/information, Excel values, equation, or a graph image first."
    });
  }

  try {
    const scenarioContext = buildScenarioContextBlock(scenario);
    const prompt = `Answer only with scenario-grounded information.
${projectContext}
${scenarioContext.text}
Recent chat: ${JSON.stringify(messages)}
User question: ${question}

Rules:
- Do not invent values not supported by the scenario text, Excel data, or graph.
- If the user asks for something not grounded in the scenario, say what is missing.
- Use the graph as supporting evidence, not as a replacement for table values.
- Mention mismatches between text, Excel, and graph when they matter.
- Prefer concise, decision-useful answers.`;

    const answer = await scenarioVisionText({
      prompt,
      graphPngDataUrl: selectedScenarioImage(scenario)
    });

    await ChatMessageModel.insertMany([
      { scenarioId: scenario._id, role: "user", content: question },
      { scenarioId: scenario._id, role: "assistant", content: answer }
    ]);

    res.json({ answer });
  } catch (error) {
    res.status(502).json({ error: getAiErrorMessage(error) });
  }
});

export default aiRouter;
