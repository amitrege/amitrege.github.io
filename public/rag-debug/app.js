const state = {
  scenarioIndex: [],
  scenarioCache: new Map(),
  selectedScenarioId: null,
  selectedStep: 1
};

const stepLabels = [
  { id: 1, title: "Question" },
  { id: 2, title: "What broke" },
  { id: 3, title: "What it saw" },
  { id: 4, title: "Fix" }
];

const stageLabels = {
  ingestion: "Chunking",
  retrieval: "Retrieval",
  filter: "Filter",
  rerank: "Reranker",
  packing: "Context pack",
  synthesis: "Answer"
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function familyClass(family) {
  if (family === "Chunk Split") {
    return "family-chunk";
  }
  if (family === "Metadata Filter") {
    return "family-filter";
  }
  return "family-rerank";
}

function currentEntry() {
  return state.scenarioIndex.find((entry) => entry.id === state.selectedScenarioId) ?? null;
}

function currentScenario() {
  return state.scenarioCache.get(state.selectedScenarioId) ?? null;
}

function baselineRun(scenario) {
  return scenario.runs.find((run) => run.kind === "baseline") ?? scenario.runs[0];
}

function fixRun(scenario) {
  return scenario.runs.find((run) => run.id === scenario.recommendedRunId) ?? scenario.runs[1] ?? scenario.runs[0];
}

function chunkLookup(scenario) {
  const map = new Map();
  for (const doc of scenario.docs) {
    for (const chunk of doc.chunks) {
      map.set(chunk.id, { ...chunk, doc });
    }
  }
  return map;
}

function rankingMap(run) {
  return new Map(run.rankings.map((item) => [item.chunkId, item]));
}

function firstBrokenStage(run) {
  return (
    run.stageBoard.find((stage) => stage.status === "fail") ??
    run.stageBoard.find((stage) => stage.status === "warn") ??
    run.stageBoard[run.stageBoard.length - 1]
  );
}

function stageSummary(stageId) {
  if (stageId === "ingestion") {
    return "The answer got split across chunks. The model only saw part of it.";
  }
  if (stageId === "filter") {
    return "The right doc was there, but the filter threw it out.";
  }
  if (stageId === "rerank") {
    return "The right doc was found, then pushed down by reranking.";
  }
  if (stageId === "packing") {
    return "The right chunk was found, but it did not make it into the final context window.";
  }
  if (stageId === "synthesis") {
    return "The context was okay, but the final answer still made a jump it could not support.";
  }
  return "The retriever never got the right evidence high enough to use.";
}

function stageFixSummary(stageId) {
  if (stageId === "ingestion") {
    return "The fix keeps the full idea together so the model can see the rule in one place.";
  }
  if (stageId === "filter") {
    return "The fix lets the right doc survive long enough to be ranked and used.";
  }
  if (stageId === "rerank") {
    return "The fix stops a phrase-heavy distractor from beating the real answer.";
  }
  if (stageId === "packing") {
    return "The fix keeps the right chunk inside the final context window.";
  }
  if (stageId === "synthesis") {
    return "The fix keeps the answer closer to what the retrieved context actually says.";
  }
  return "The fix raises the right evidence earlier in the pipeline.";
}

function findUsedChunk(scenario, run) {
  const goldIds = new Set(scenario.goldChunkIds);
  const candidate =
    run.rankings.find((item) => item.packed && !goldIds.has(item.chunkId)) ??
    run.rankings.find((item) => item.packed) ??
    run.rankings[0];
  return candidate ? { ...candidate, chunk: chunkLookup(scenario).get(candidate.chunkId) } : null;
}

function findMissingChunk(scenario, run) {
  const missing =
    run.rankings.find((item) => scenario.goldChunkIds.includes(item.chunkId) && !item.packed) ??
    run.rankings.find((item) => scenario.goldChunkIds.includes(item.chunkId));
  return missing ? { ...missing, chunk: chunkLookup(scenario).get(missing.chunkId) } : null;
}

function claimCounts(run) {
  const counts = { supported: 0, weak: 0, unsupported: 0 };
  for (const claim of run.answer.claims) {
    counts[claim.status] += 1;
  }
  return counts;
}

function changedConfig(base, fix) {
  return Object.keys(base.config)
    .filter((key) => base.config[key] !== fix.config[key])
    .map((key) => ({
      key,
      before: base.config[key],
      after: fix.config[key]
    }));
}

function shorten(text) {
  if (text.length <= 220) {
    return text;
  }
  return `${text.slice(0, 217).trimEnd()}...`;
}

function updateUrl() {
  const params = new URLSearchParams(window.location.search);
  if (state.selectedScenarioId) {
    params.set("scenario", state.selectedScenarioId);
  }
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

async function loadScenarioIndex() {
  const response = await fetch("./data/scenarios/index.json");
  if (!response.ok) {
    throw new Error("Failed to load scenario index.");
  }
  return response.json();
}

async function loadScenario(entry) {
  if (state.scenarioCache.has(entry.id)) {
    return state.scenarioCache.get(entry.id);
  }
  const response = await fetch(entry.path);
  if (!response.ok) {
    throw new Error(`Failed to load scenario ${entry.id}.`);
  }
  const scenario = await response.json();
  state.scenarioCache.set(entry.id, scenario);
  return scenario;
}

function renderScenarioList() {
  const root = document.getElementById("scenario-list");
  root.innerHTML = state.scenarioIndex
    .map((entry) => {
      const selected = entry.id === state.selectedScenarioId;
      return `
        <button type="button" class="scenario-button ${selected ? "is-active" : ""}" data-scenario-id="${escapeHtml(entry.id)}">
          <span class="scenario-code">${escapeHtml(entry.shortLabel)}</span>
          <span class="scenario-title">${escapeHtml(entry.title)}</span>
          <span class="scenario-family ${familyClass(entry.family)}">${escapeHtml(entry.family)}</span>
          ${selected ? `<span class="scenario-note">${escapeHtml(entry.hook)}</span>` : ""}
        </button>
      `;
    })
    .join("");

  root.querySelectorAll("[data-scenario-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextId = button.dataset.scenarioId;
      if (!nextId || nextId === state.selectedScenarioId) {
        return;
      }
      await selectScenario(nextId);
    });
  });
}

function renderOverview(entry, scenario) {
  const root = document.getElementById("scenario-overview");
  const baseline = baselineRun(scenario);
  const broken = firstBrokenStage(baseline);

  root.innerHTML = `
    <div class="overview-head">
      <div>
        <p class="panel-kicker">${escapeHtml(entry.family)}</p>
        <h2>${escapeHtml(scenario.title)}</h2>
        <p class="overview-copy">${escapeHtml(entry.hook)}</p>
      </div>
      <div class="overview-badges">
        <span class="info-pill">${escapeHtml(`${scenario.dataset.docCount} docs`)}</span>
        <span class="info-pill">${escapeHtml(`${scenario.dataset.chunkCount} chunks`)}</span>
        <span class="info-pill problem-pill">${escapeHtml(`Broken at ${stageLabels[broken.id] ?? broken.id}`)}</span>
      </div>
    </div>

    <div class="overview-grid">
      <article class="focus-card">
        <p class="mini-label">Question</p>
        <p class="query-text">${escapeHtml(scenario.query)}</p>
      </article>

      <article class="focus-card">
        <p class="mini-label">How to read this</p>
        <p>Start with the question, then check the broken step, then look at one chunk the model used and one chunk it needed.</p>
      </article>
    </div>

    <div class="overview-actions">
      <button type="button" class="action primary-button" data-jump-step="4">Skip to the fix</button>
    </div>
  `;

  root.querySelector("[data-jump-step]")?.addEventListener("click", () => {
    state.selectedStep = 4;
    render();
  });
}

function renderStepper() {
  const root = document.getElementById("stepper-panel");
  root.innerHTML = `
    <div class="panel-head">
      <p class="panel-kicker">Walkthrough</p>
      <h2>One step at a time</h2>
    </div>
    <div class="stepper">
      ${stepLabels
        .map(
          (step) => `
            <button type="button" class="step-button ${step.id === state.selectedStep ? "is-active" : ""}" data-step="${step.id}">
              <span class="step-number">${step.id}</span>
              <span class="step-title">${escapeHtml(step.title)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;

  root.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedStep = Number(button.dataset.step);
      render();
    });
  });
}

function renderQuestionStep(entry, scenario) {
  const fix = fixRun(scenario);
  return `
    <div class="panel-head">
      <p class="panel-kicker">Step 1</p>
      <h2>What was the model trying to answer?</h2>
      <p>Start here. This gives you the question and the answer we want after the fix.</p>
    </div>

    <div class="card-grid">
      <article class="content-card">
        <p class="mini-label">User question</p>
        <p class="big-text">${escapeHtml(scenario.query)}</p>
      </article>

      <article class="content-card">
        <p class="mini-label">What a good answer looks like</p>
        <p>${escapeHtml(fix.answer.text)}</p>
      </article>

      <article class="content-card">
        <p class="mini-label">Why this case is tricky</p>
        <p>${escapeHtml(entry.hook)}</p>
      </article>
    </div>
  `;
}

function renderBrokenStep(scenario) {
  const baseline = baselineRun(scenario);
  const broken = firstBrokenStage(baseline);

  return `
    <div class="panel-head">
      <p class="panel-kicker">Step 2</p>
      <h2>What broke first?</h2>
      <p>Only focus on the first broken step. Everything after that is fallout.</p>
    </div>

    <div class="card-grid">
      <article class="content-card standout-card">
        <p class="mini-label">First broken step</p>
        <h3>${escapeHtml(stageLabels[broken.id] ?? broken.id)}</h3>
        <p class="big-text">${escapeHtml(stageSummary(broken.id))}</p>
      </article>

      <article class="content-card">
        <p class="mini-label">What happened</p>
        <p>${escapeHtml(broken.note)}</p>
      </article>
    </div>

    <div class="stage-strip">
      ${baseline.stageBoard
        .map(
          (stage) => `
            <div class="stage-pill stage-${escapeHtml(stage.status)}">
              <span>${escapeHtml(stageLabels[stage.id] ?? stage.id)}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderEvidenceStep(scenario) {
  const baseline = baselineRun(scenario);
  const used = findUsedChunk(scenario, baseline);
  const missing = findMissingChunk(scenario, baseline);

  return `
    <div class="panel-head">
      <p class="panel-kicker">Step 3</p>
      <h2>What did the model see, and what did it miss?</h2>
      <p>Look at one chunk the model used and one chunk it needed. That is usually enough to understand the failure.</p>
    </div>

    <div class="card-grid">
      <article class="content-card">
        <p class="mini-label">It used this</p>
        <h3>${escapeHtml(used.chunk.label)}</h3>
        <p class="chunk-source">${escapeHtml(used.chunk.doc.title)}</p>
        <p>${escapeHtml(shorten(used.chunk.text))}</p>
        <p class="small-note">${escapeHtml(used.why)}</p>
      </article>

      <article class="content-card alert-card">
        <p class="mini-label">It needed this</p>
        <h3>${escapeHtml(missing.chunk.label)}</h3>
        <p class="chunk-source">${escapeHtml(missing.chunk.doc.title)}</p>
        <p>${escapeHtml(shorten(missing.chunk.text))}</p>
        <p class="small-note">${escapeHtml(missing.note)}</p>
      </article>
    </div>

    <div class="hint-row">
      <span class="info-pill">${escapeHtml(typeof used.finalRank === "number" ? `Used at #${used.finalRank}` : "Used chunk not ranked")}</span>
      <span class="info-pill">${escapeHtml(missing.filtered ? "Missing chunk was filtered out" : missing.packed ? "Missing chunk was packed" : "Missing chunk stayed out of context")}</span>
    </div>
  `;
}

function renderFixStep(scenario) {
  const baseline = baselineRun(scenario);
  const fix = fixRun(scenario);
  const broken = firstBrokenStage(baseline);
  const baselineCounts = claimCounts(baseline);
  const fixCounts = claimCounts(fix);
  const diffs = changedConfig(baseline, fix);

  return `
    <div class="panel-head">
      <p class="panel-kicker">Step 4</p>
      <h2>How does the fix help?</h2>
      <p>Now compare the bad answer to the fixed one and see the one thing that changed.</p>
    </div>

    <div class="answer-compare">
      <article class="content-card">
        <p class="mini-label">Before</p>
        <h3>${escapeHtml(baseline.label)}</h3>
        <p>${escapeHtml(baseline.answer.text)}</p>
        <div class="claim-summary">
          <span class="summary-pill bad-pill">${escapeHtml(`${baselineCounts.unsupported} unsupported`)}</span>
          <span class="summary-pill">${escapeHtml(`${baselineCounts.supported} supported`)}</span>
        </div>
      </article>

      <article class="content-card good-card">
        <p class="mini-label">After</p>
        <h3>${escapeHtml(fix.label)}</h3>
        <p>${escapeHtml(fix.answer.text)}</p>
        <div class="claim-summary">
          <span class="summary-pill good-pill">${escapeHtml(`${fixCounts.supported} supported`)}</span>
          <span class="summary-pill">${escapeHtml(`${fixCounts.unsupported} unsupported`)}</span>
        </div>
      </article>
    </div>

    <div class="card-grid">
      <article class="content-card">
        <p class="mini-label">What changed</p>
        <ul class="simple-list">
          ${diffs.map((item) => `<li>${escapeHtml(item.key)}: ${escapeHtml(item.before)} -> ${escapeHtml(item.after)}</li>`).join("")}
        </ul>
      </article>

      <article class="content-card">
        <p class="mini-label">Why it worked</p>
        <p>${escapeHtml(stageFixSummary(broken.id))}</p>
      </article>
    </div>
  `;
}

function renderStepContent(entry, scenario) {
  const root = document.getElementById("step-content-panel");
  if (state.selectedStep === 1) {
    root.innerHTML = renderQuestionStep(entry, scenario);
    return;
  }
  if (state.selectedStep === 2) {
    root.innerHTML = renderBrokenStep(scenario);
    return;
  }
  if (state.selectedStep === 3) {
    root.innerHTML = renderEvidenceStep(scenario);
    return;
  }
  root.innerHTML = renderFixStep(scenario);
}

function render() {
  const entry = currentEntry();
  const scenario = currentScenario();

  if (!entry || !scenario) {
    document.getElementById("scenario-overview").innerHTML = `<div class="empty-state">Loading…</div>`;
    return;
  }

  renderScenarioList();
  renderOverview(entry, scenario);
  renderStepper();
  renderStepContent(entry, scenario);
}

async function selectScenario(id) {
  const entry = state.scenarioIndex.find((item) => item.id === id);
  if (!entry) {
    return;
  }
  await loadScenario(entry);
  state.selectedScenarioId = id;
  state.selectedStep = 1;
  updateUrl();
  render();
}

async function init() {
  try {
    state.scenarioIndex = await loadScenarioIndex();
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("scenario");
    const initial = state.scenarioIndex.find((entry) => entry.id === requestedId) ?? state.scenarioIndex[0];
    await selectScenario(initial.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load demo.";
    document.getElementById("scenario-overview").innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  }
}

init();
