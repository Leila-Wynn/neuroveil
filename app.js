// ------------------------------------
// NEUROVEIL — Phase 1 Core (stable)
// No imports. No fetch. GitHub Pages safe.
// ------------------------------------

// helpers
const $ = (id) => document.getElementById(id);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const pad2 = (n) => String(n).padStart(2, "0");
const formatMMSS = (totalSeconds) => `${pad2(Math.floor(totalSeconds/60))}:${pad2(totalSeconds%60)}`;

// UI refs
const ui = {
  nodeTitle: $("nodeTitle"),
  nodeMeta: $("nodeMeta"),
  nodeBody: $("nodeBody"),
  choices: $("choices"),
  log: $("log"),

  stabilityChip: $("stabilityChip"),
  scoreChip: $("scoreChip"),
  timerChip: $("timerChip"),

  startSessionBtn: $("startSessionBtn"),
  pauseBtn: $("pauseBtn"),
  resetBtn: $("resetBtn"),
  minutesSelect: $("minutesSelect"),

  quizPanel: $("quizPanel"),
  quizQuestion: $("quizQuestion"),
  quizOptions: $("quizOptions"),
  quizSubmitBtn: $("quizSubmitBtn"),
  quizProgress: $("quizProgress"),
  quizMeta: $("quizMeta"),
};

// Save (JSON only)
const SAVE_KEY = "neuroveil_phase1_save";

function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    return {
      nodeId: obj.nodeId || "boot",
      stability: typeof obj.stability === "number" ? obj.stability : 50,
      lastScore: typeof obj.lastScore === "number" ? obj.lastScore : null,
      missed: Array.isArray(obj.missed) ? obj.missed : []
    };
  }catch{
    return null;
  }
}

function saveNow(){
  localStorage.setItem(SAVE_KEY, JSON.stringify(state.save));
}

// Story (Phase 1 intro)
const STORY = {
  boot: {
    title: "Boot Sequence • The Veil Reactivates",
    meta: "Sector: A0 • Consciousness Research Node",
    body:
`The chamber is black glass and humming circuitry.
Teal glyphs float like dust caught in a projector beam.

You are the consciousness researcher assigned to NEUROVEIL —
a system built to stabilize memory by training the nervous system through cycles.

The console speaks:
“Begin session. Calibrate limbic and hippocampal channels.”`,
    choices: [
      { text: "Begin calibration (recommended)", go: "calibration" },
      { text: "Inspect the neural interface", go: "interface" },
    ]
  },

  interface: {
    title: "Interface Inspection • Synaptic Lattice",
    meta: "Sector: A0 • Hardware Bay",
    body:
`The lattice vibrates with a familiar language: neurotransmission.
A note from your predecessor flickers into view:

“Attention is fuel. Recall is the map.
We train in cycles: focus → test → encode → score.”`,
    choices: [
      { text: "Return to console", go: "boot" },
      { text: "Start calibration now", go: "calibration" },
    ]
  },

  calibration: {
    title: "Calibration • Limbic Gate Online",
    meta: "Sector: A1 • Study Loop",
    body:
`Protocol:
When a Pomodoro session starts → NEUROVEIL tests your knowledge.
When the timer ends → NEUROVEIL scores your accuracy.

Phase 1 targets:
AMYGDALA & HIPPOCAMPUS.`,
    choices: [
      { text: "Start Session (Pomodoro + Knowledge Check)", action: "startSession" },
      { text: "Run a 5-minute test cycle", action: "set5andStart" },
    ]
  },
};

// Quiz bank (Phase 1: Amygdala + Hippocampus)
const QUESTION_SETS = [
  {
    id: "amygdala_1",
    concept: "Amygdala",
    q: "What is the primary role of the amygdala?",
    opts: [
      "Coordinating balance and fine motor movement",
      "Threat detection and fear-related processing",
      "Transmitting signals from spinal cord to muscles",
      "Regulating blood glucose"
    ],
    answer: 1,
    teach: "Amygdala = threat detection + fear processing. It helps trigger fight-or-flight responses."
  },
  {
    id: "hippocampus_1",
    concept: "Hippocampus",
    q: "Which function is most associated with the hippocampus?",
    opts: [
      "Forming new long-term (episodic/spatial) memories",
      "Controlling reflexes in the spinal cord",
      "Regulating heart rate directly",
      "Producing dopamine"
    ],
    answer: 0,
    teach: "Hippocampus = forming new long-term memories (especially episodic/spatial). Damage → difficulty creating new memories."
  },
  {
    id: "amygdala_2",
    concept: "Amygdala",
    q: "Why might amygdala activation influence memory?",
    opts: [
      "It labels events as emotionally significant",
      "It prevents neurons from firing",
      "It shuts down sensory input entirely",
      "It produces myelin"
    ],
    answer: 0,
    teach: "Emotion boosts encoding. The amygdala flags significance, which can strengthen memory formation."
  },
  {
    id: "hippocampus_2",
    concept: "Hippocampus",
    q: "A classic symptom of hippocampal damage is:",
    opts: [
      "Loss of hearing",
      "Inability to form new memories (anterograde amnesia)",
      "Loss of reflexes",
      "Total loss of language"
    ],
    answer: 1,
    teach: "Hippocampal damage often causes anterograde amnesia: trouble forming new memories."
  },
  {
    id: "mix_1",
    concept: "Amygdala & Hippocampus",
    q: "Which pairing best matches function?",
    opts: [
      "Amygdala = balance; Hippocampus = reflexes",
      "Amygdala = emotion/threat; Hippocampus = memory formation",
      "Amygdala = blood pressure; Hippocampus = digestion",
      "Amygdala = vision; Hippocampus = hearing"
    ],
    answer: 1,
    teach: "Amygdala → emotion/threat. Hippocampus → forming new long-term memories."
  }
];

// State
const state = {
  save: loadSave() || { nodeId: "boot", stability: 50, lastScore: null, missed: [] },

  timer: {
    totalSeconds: 25 * 60,
    remaining: 25 * 60,
    running: false,
    interval: null
  },

  quiz: {
    active: false,
    questions: [],
    idx: 0,
    selected: null,
    answers: []
  }
};

function logLine(text, cls="sys"){
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = text;
  ui.log.appendChild(div);
  ui.log.scrollTop = ui.log.scrollHeight;
}

function setStability(val){
  state.save.stability = clamp(val, 0, 100);
  ui.stabilityChip.textContent = `Stability: ${state.save.stability}`;
  saveNow();
}

function setScore(val){
  state.save.lastScore = val;
  ui.scoreChip.textContent = `Score: ${val}%`;
  saveNow();
}

function renderNode(nodeId){
  const node = STORY[nodeId];
  if(!node){
    ui.nodeTitle.textContent = "ERROR: Missing node";
    ui.nodeBody.textContent = `Node '${nodeId}' not found.`;
    ui.choices.innerHTML = "";
    return;
  }

  state.save.nodeId = nodeId;
  saveNow();

  ui.nodeTitle.textContent = node.title;
  ui.nodeMeta.textContent = node.meta;
  ui.nodeBody.textContent = node.body;

  ui.choices.innerHTML = "";
  node.choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.textContent = c.text;

    btn.onclick = () => {
      if(c.go) return renderNode(c.go);
      if(c.action === "startSession") return startSession();
      if(c.action === "set5andStart"){
        ui.minutesSelect.value = "5";
        applyMinutes();
        return startSession();
      }
    };

    ui.choices.appendChild(btn);
  });
}

function applyMinutes(){
  const mins = parseInt(ui.minutesSelect.value, 10);
  state.timer.totalSeconds = mins * 60;
  state.timer.remaining = mins * 60;
  ui.timerChip.textContent = formatMMSS(state.timer.remaining);
}

function startTimer(){
  if(state.timer.running) return;
  state.timer.running = true;

  ui.startSessionBtn.disabled = true;
  ui.pauseBtn.disabled = false;

  state.timer.interval = setInterval(() => {
    state.timer.remaining = Math.max(0, state.timer.remaining - 1);
    ui.timerChip.textContent = formatMMSS(state.timer.remaining);

    if(state.timer.remaining <= 0){
      stopTimer();
      endSessionScore();
    }
  }, 1000);
}

function stopTimer(){
  state.timer.running = false;
  if(state.timer.interval) clearInterval(state.timer.interval);
  state.timer.interval = null;

  ui.startSessionBtn.disabled = false;
  ui.pauseBtn.disabled = true;
}

function resetAll(){
  stopTimer();
  applyMinutes();

  ui.quizPanel.hidden = true;
  state.quiz.active = false;
  state.quiz.idx = 0;
  state.quiz.selected = null;
  state.quiz.answers = [];
  state.quiz.questions = [];

  ui.quizOptions.innerHTML = "";
  ui.quizQuestion.textContent = "";
  ui.quizSubmitBtn.disabled = true;

  ui.log.innerHTML = "";
  logLine("System reset.", "sys");

  setStability(50);
  ui.scoreChip.textContent = "Score: —";
  state.save.lastScore = null;
  state.save.missed = [];
  saveNow();

  renderNode(state.save.nodeId || "boot");
}

function startSession(){
  logLine("SESSION START: focus corridor engaged.", "ok");
  applyMinutes();
  startTimer();
  startQuiz();
}

function pickQuestions(n=5){
  const missed = state.save.missed;
  const pool = QUESTION_SETS.slice();

  for(let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const prioritized = [];
  for(const q of pool){
    if(missed.includes(q.concept)) prioritized.push(q);
  }
  for(const q of pool){
    if(!missed.includes(q.concept)) prioritized.push(q);
  }

  return prioritized.slice(0, n);
}

function startQuiz(){
  state.quiz.active = true;
  state.quiz.idx = 0;
  state.quiz.selected = null;
  state.quiz.answers = [];
  state.quiz.questions = pickQuestions(5);

  ui.quizPanel.hidden = false;
  ui.quizMeta.textContent = "Timer started • Answer to stabilize";
  logLine("KNOWLEDGE CHECK: limbic/hippocampal calibration initiated.", "sys");

  renderQuizQuestion();
}

function renderQuizQuestion(){
  const q = state.quiz.questions[state.quiz.idx];
  ui.quizQuestion.textContent = q.q;
  ui.quizOptions.innerHTML = "";
  ui.quizSubmitBtn.disabled = true;
  state.quiz.selected = null;

  ui.quizProgress.textContent = `Question ${state.quiz.idx + 1} / ${state.quiz.questions.length}`;

  q.opts.forEach((optText, idx) => {
    const div = document.createElement("div");
    div.className = "opt";
    div.textContent = optText;
    div.onclick = () => {
      [...ui.quizOptions.children].forEach(el => el.classList.remove("selected"));
      div.classList.add("selected");
      state.quiz.selected = idx;
      ui.quizSubmitBtn.disabled = false;
    };
    ui.quizOptions.appendChild(div);
  });
}

function submitQuizAnswer(){
  const q = state.quiz.questions[state.quiz.idx];
  const correct = state.quiz.selected === q.answer;

  state.quiz.answers.push({ id: q.id, concept: q.concept, correct });

  if(correct){
    logLine(`✔ ${q.concept}: integrity confirmed.`, "ok");
    setStability(state.save.stability + 3);
    state.save.missed = state.save.missed.filter(c => c !== q.concept);
  }else{
    logLine(`✖ ${q.concept}: mismatch detected.`, "warn");
    logLine(`↳ ${q.teach}`, "sys");
    setStability(state.save.stability - 5);
    if(!state.save.missed.includes(q.concept)){
      state.save.missed.push(q.concept);
    }
  }

  saveNow();

  state.quiz.idx += 1;
  if(state.quiz.idx >= state.quiz.questions.length) finishQuiz();
  else renderQuizQuestion();
}

function finishQuiz(){
  const total = state.quiz.answers.length;
  const got = state.quiz.answers.filter(a => a.correct).length;
  const pct = Math.round((got/total)*100);

  logLine(`QUIZ COMPLETE: ${got}/${total} correct.`, "sys");
  setScore(pct);

  ui.quizPanel.hidden = true;
  state.quiz.active = false;

  // Narrative consequence tie-in
  if(state.save.missed.includes("Amygdala")){
    logLine("⚠ THREAT RESPONSE SPIKE: amygdala misfire detected.", "warn");
  }
  if(state.save.missed.includes("Hippocampus")){
    logLine("⚠ MEMORY CORRUPTION: hippocampal index mismatch.", "warn");
  }
}

function endSessionScore(){
  logLine("SESSION END: timer complete.", "sys");

  const last = state.save.lastScore;
  if(typeof last === "number") logLine(`FINAL SCORE: ${last}%`, "ok");
  else logLine("FINAL SCORE: — (no quiz completed)", "warn");

  renderNode("calibration");
}

// Wire UI
ui.startSessionBtn.onclick = () => startSession();
ui.pauseBtn.onclick = () => {
  if(state.timer.running){
    stopTimer();
    logLine("SESSION PAUSED.", "sys");
  }
};
ui.resetBtn.onclick = () => resetAll();
ui.minutesSelect.onchange = () => applyMinutes();
ui.quizSubmitBtn.onclick = () => submitQuizAnswer();

// Boot
applyMinutes();
ui.stabilityChip.textContent = `Stability: ${state.save.stability}`;
ui.scoreChip.textContent = `Score: ${state.save.lastScore ?? "—"}`;
logLine("System online.", "sys");
renderNode(state.save.nodeId || "boot");
