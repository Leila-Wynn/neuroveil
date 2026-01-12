// ----------------------------------------------------
// NEUROVEIL • Phase 1 (GitHub Pages safe)
// No imports. No fetch. Dark-mode cinematic UI.
// ----------------------------------------------------

const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pad2 = (n) => String(n).padStart(2, "0");
const formatMMSS = (s) => `${pad2(Math.floor(s/60))}:${pad2(s%60)}`;

const ui = {
  hudStability: $("hudStability"),
  hudScore: $("hudScore"),
  hudTimer: $("hudTimer"),
  soundBtn: $("soundBtn"),

  sceneKicker: $("sceneKicker"),
  sceneTitle: $("sceneTitle"),
  sceneMeta: $("sceneMeta"),
  sceneText: $("sceneText"),
  choiceRow: $("choiceRow"),

  logBox: $("logBox"),

  startBtn: $("startBtn"),
  pauseBtn: $("pauseBtn"),
  resetBtn: $("resetBtn"),
  minutesSelect: $("minutesSelect"),

  termList: $("termList"),

  quizPanel: $("quizPanel"),
  quizConcept: $("quizConcept"),
  quizMeta: $("quizMeta"),
  quizQ: $("quizQ"),
  quizOpts: $("quizOpts"),
  quizProgress: $("quizProgress"),
  submitBtn: $("submitBtn"),
};

const SAVE_KEY = "neuroveil_phase1_save_v2";

function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    return {
      nodeId: s.nodeId || "boot",
      stability: typeof s.stability === "number" ? s.stability : 50,
      lastScore: typeof s.lastScore === "number" ? s.lastScore : null,
      missed: Array.isArray(s.missed) ? s.missed : [],
      soundOn: !!s.soundOn
    };
  }catch{
    return null;
  }
}

function saveNow(){
  localStorage.setItem(SAVE_KEY, JSON.stringify(state.save));
}

const state = {
  save: loadSave() || { nodeId:"boot", stability:50, lastScore:null, missed:[], soundOn:false },

  timer: { total: 25*60, remaining: 25*60, running:false, handle:null },

  quiz: { active:false, questions:[], idx:0, selected:null, answers:[] }
};

function logLine(text, cls="sys"){
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = text;
  ui.logBox.appendChild(div);
  ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

function safeRun(label, fn){
  try{
    fn();
  }catch(e){
    logLine(`⛔ CLICK ERROR (${label}): ${e.message}`, "warn");
  }
}

function setStability(v){
  state.save.stability = clamp(v, 0, 100);
  ui.hudStability.textContent = `STABILITY ${pad2(state.save.stability)}`;
  saveNow();
}

function setScore(v){
  state.save.lastScore = v;
  ui.hudScore.textContent = `SCORE ${v}%`;
  saveNow();
}

function applyMinutes(){
  const mins = parseInt(ui.minutesSelect.value, 10);
  state.timer.total = mins * 60;
  state.timer.remaining = mins * 60;
  ui.hudTimer.textContent = formatMMSS(state.timer.remaining);
}

function stopTimer(){
  state.timer.running = false;
  if(state.timer.handle) clearInterval(state.timer.handle);
  state.timer.handle = null;
  ui.startBtn.disabled = false;
  ui.pauseBtn.disabled = true;
}

function startTimer(){
  if(state.timer.running) return;
  state.timer.running = true;
  ui.startBtn.disabled = true;
  ui.pauseBtn.disabled = false;

  state.timer.handle = setInterval(() => {
    state.timer.remaining = Math.max(0, state.timer.remaining - 1);
    ui.hudTimer.textContent = formatMMSS(state.timer.remaining);

    if(state.timer.remaining <= 0){
      stopTimer();
      endSession();
    }
  }, 1000);
}

/* -----------------------
   TERM BANK (Phase 1)
   - Starts with Amygdala & Hippocampus
   - Scaffold list for Chapter 3 terms (you provided a big list)
------------------------ */
const TERM_BANK = [
  {
    id: "amygdala",
    term: "Amygdala",
    chapter: "8.2",
    tags: ["memory", "emotion", "fear", "threat"],
    def: "Threat detection and fear-related processing; flags emotional significance and can strengthen encoding of intense events.",
    learn: "Amygdala = alarm system. It tags danger/emotion and can boost memory strength.",
    consequence: "THREAT RESPONSE SPIKE — the corridor feels hostile; perception shifts toward danger."
  },
  {
    id: "hippocampus",
    term: "Hippocampus",
    chapter: "8.2",
    tags: ["memory", "encoding", "episodic", "spatial"],
    def: "Forms new long-term (episodic/spatial) memories; damage often causes difficulty forming new memories (anterograde amnesia).",
    learn: "Hippocampus = memory librarian. It files new memories; damage → can’t create new files.",
    consequence: "MEMORY CORRUPTION — fragments loop; scenes feel repeated and unstable."
  },

  // Chapter 3 scaffold examples (you will expand this list with your full terms)
  {
    id: "neuron",
    term: "Neuron",
    chapter: "3",
    tags: ["cell", "nervous-system"],
    def: "A nerve cell; the basic unit of the nervous system.",
    learn: "Neurons communicate via electrical signals (action potentials) and chemical signals (neurotransmitters)."
  },
  {
    id: "action_potential",
    term: "Action Potential",
    chapter: "3",
    tags: ["electric", "signal"],
    def: "An electrical signal that travels down the axon of a neuron.",
    learn: "All-or-none electrical impulse; enables rapid communication."
  },
  {
    id: "synapse",
    term: "Synapse",
    chapter: "3",
    tags: ["communication", "neurotransmitters"],
    def: "The junction where neurons communicate—typically by neurotransmitters crossing a synaptic gap.",
    learn: "Synapse = handoff point between neurons."
  }
];


function renderTerms(){
  ui.termList.innerHTML = "";
  TERM_BANK.forEach((t) => {
    const card = document.createElement("div");
    card.className = "termCard";

    card.innerHTML = `
      <div class="termName">${t.term}</div>
      <div class="termDef">${t.def}</div>
      <div class="termHint">Click to expand</div>
    `;

    card.onclick = () => {
      logLine(`TERM LOADED: ${t.term}`, "sys");
      logLine(`↳ ${t.learn || t.def}`, "sys");
      if(t.consequence){
        logLine(`↳ Narrative consequence (if missed): ${t.consequence}`, "warn");
      }
    };

    ui.termList.appendChild(card);
  });
}


/* -----------------------
   STORY (Graphic-novel style)
------------------------ */
const STORY = {
  boot: {
    kicker: "CHAPTER 3 • BIOLOGICAL BASES",
    title: "BOOT SEQUENCE • THE VEIL REACTIVATES",
    meta: "Sector A0 • Consciousness Lab • Night Cycle",
    text:
`[SYSTEM] Black glass. Quiet fans. A low, patient hum.
[YOU] The NEUROVEIL console wakes when you touch the panel.
[SYSTEM] “Your role: Consciousness Researcher. Your task: stabilize memory under stress.”
[YOU] The screen shows two blinking channels:
      AMYGDALA  — threat & emotion
      HIPPOCAMPUS — memory formation

[SYSTEM] “Begin a Focus Cycle to calibrate.”`,
    choices: [
      { label: "Enter calibration chamber", go: "calibration" },
      { label: "Run a diagnostic scan first", go: "diagnostic" },
    ]
  },

  diagnostic: {
    kicker: "PROTOCOL • SYSTEM NOTES",
    title: "DIAGNOSTIC • SYNAPTIC LATTICE",
    meta: "Sector A0 • Hardware Bay",
    text:
`[SYSTEM] “The neural lattice is stable… but your recall is the weak link.”
[YOU] A note from the last researcher appears:
      “If you miss AMYGDALA, the world feels hostile.
       If you miss HIPPOCAMPUS, the world forgets you back.”

[SYSTEM] “Begin when ready.”`,
    choices: [
      { label: "Return to console", go: "boot" },
      { label: "Start calibration now", go: "calibration" },
    ]
  },

  calibration: {
    kicker: "SESSION • FOCUS CYCLE",
    title: "CALIBRATION • LIMBIC GATE ONLINE",
    meta: "Rules: Start → Quiz begins. End → Score + consequence.",
    text:
`[SYSTEM] “When Focus begins, I test you.
         When Focus ends, I score you.”

[YOU] You breathe once. The chamber’s violet light tightens into a corridor.

[PHASE 1 TARGETS] Amygdala + Hippocampus.`,
    choices: [
      { label: "START SESSION (Pomodoro + Knowledge Check)", action: "startSession" },
      { label: "5-minute test cycle (fast)", action: "startFast" },
      { label: "DEBUG: Jump to Module 2", go: "module2_intro" },
    ]
  },

  post_quiz: {
    kicker: "SESSION • AFTER-ACTION",
    title: "CALIBRATION RESULT • CORRIDOR STABILIZED?",
    meta: "Your answers changed the environment.",
    text:
`[SYSTEM] The chamber listens to your recall.
[YOU] The corridor responds — not to your courage… but to your accuracy.

[SYSTEM] “Proceed. Your next scene is determined by what you failed to stabilize.”`,
    choices: [
      { label: "Continue deeper into the corridor", action: "continueAfterQuiz" }
    ]
  },

  route_threat: {
    kicker: "AMYGDALA • THREAT FILTER",
    title: "THE HALL OF FALSE ALARMS",
    meta: "Consequence route: Amygdala mismatch",
    text:
`[SYSTEM] ⚠ THREAT RESPONSE SPIKE confirmed.
[YOU] The corridor re-renders as hostile architecture. Shadows feel intentional.

A door marked FIGHT-OR-FLIGHT unlocks.

[MISSION] Identify sympathetic vs parasympathetic responses before the corridor escalates.`,
    choices: [
  { label: "Stabilize the corridor through biology", go: "module1_intro" }
]
  },

  route_memory: {
    kicker: "HIPPOCAMPUS • MEMORY INDEX",
    title: "THE LOOPING ARCHIVE",
    meta: "Consequence route: Hippocampus mismatch",
    text:
`[SYSTEM] ⚠ MEMORY CORRUPTION confirmed.
[YOU] The corridor repeats. A scene plays twice with different details.

A door marked ENCODING flickers.

[MISSION] Explain hippocampus function to repair the index.`,
    choices: [
  { label: "Repair memory index by rebuilding signaling", go: "module1_intro" }
]
  },

  route_clear: {
    kicker: "SYSTEM • STABILITY",
    title: "CLEAR PASSAGE",
    meta: "No phase-1 mismatches detected",
    text:
`[SYSTEM] Stability holds. The corridor stays quiet.
[YOU] You earned a clean passage.

[MISSION] Proceed to Chapter 3: Neuron signaling.`,
    choices: [
  { label: "Proceed to Module 1: Neuron signaling", go: "module1_intro" }
]
  },

    module1_intro: {
    kicker: "CHAPTER 3 • MODULE 1",
    title: "NEURON SIGNALING • THE FIRST CIRCUIT",
    meta: "You are rebuilding stability through biology.",
    text:
`[SYSTEM] “Next objective: restore signal integrity.”
[YOU] A glass wall reveals billions of faint lines—like a city seen from orbit.
[SYSTEM] “Neurons. Signals. Synapses.”
[YOU] The corridor offers two interfaces: one for STRUCTURE, one for SIGNAL.

Choose your approach.`,
    choices: [
      { label: "Inspect neuron structure (dendrite → soma → axon)", go: "module1_structure" },
      { label: "Trace a signal (action potential → synapse)", go: "module1_signal" }
    ]
  },

  module1_structure: {
    kicker: "CHAPTER 3 • MODULE 1",
    title: "STRUCTURE MODE • THE NEURON MAP",
    meta: "Learn: dendrite, cell body, axon, myelin, terminal buttons",
    text:
`[YOU] The interface overlays a neuron like a blueprint.
[SYSTEM] “Dendrites receive. Cell body integrates. Axon transmits.”
A highlight flashes along a sheath:
[SYSTEM] “Myelin speeds transmission.”

A single question appears—quiet but unavoidable:
“What part receives input first?”`,
    choices: [
      { label: "Dendrites (receive incoming signals)", action: "microCheck_dendrite" },
      { label: "Axon (sends signals outward)", action: "microCheck_wrong" },
      { label: "Myelin sheath (insulation)", action: "microCheck_wrong" }
    ]
  },

  module1_signal: {
    kicker: "CHAPTER 3 • MODULE 1",
    title: "SIGNAL MODE • VOLTAGE AND RELEASE",
    meta: "Learn: action potential, synapse, neurotransmitters, receptors",
    text:
`[YOU] The corridor becomes a pulse—bright → dark → bright.
[SYSTEM] “Action potential initiated.”
The pulse hits a gap:
[SYSTEM] “Synapse.”
A shimmer crosses:
[SYSTEM] “Neurotransmitters released. Receptors receive.”

A calibration prompt appears:
“What crosses the synaptic gap?”`,
    choices: [
      { label: "Neurotransmitters (chemical messengers)", action: "microCheck_nt" },
      { label: "Myelin (insulation on axon)", action: "microCheck_wrong" },
      { label: "Dendrites (receiving branches)", action: "microCheck_wrong" }
    ]
  },

  module1_complete: {
    kicker: "MODULE COMPLETE",
    title: "CHECKPOINT • SIGNAL STABILIZED",
    meta: "You unlocked the next module.",
    text:
`[SYSTEM] “Good. The corridor holds.”
[YOU] The environment stops twitching—just slightly.
A sealed door appears with a new label:

“Nervous System Divisions: CNS vs PNS.”

[SYSTEM] “Continue when ready.”`,
    choices: [
  { label: "Proceed to Module 2: Control systems", go: "module2_intro" }
]
  },
module2_intro: {
  kicker: "CHAPTER 3 • SYSTEMS",
  title: "MODULE 2 • CONTROL VS REFLEX",
  meta: "Objective: restore command hierarchy.",
  text:
`[SYSTEM] “Signal integrity restored.”
[YOU] The corridor splits into two architectures.

One chamber pulses with deliberate thought.
Another hums with automatic response.

[SYSTEM] “Choose where control originates.”`,
  choices: [
    { label: "Enter Central Command (CNS)", go: "module2_cns" },
    { label: "Enter Peripheral Network (PNS)", go: "module2_pns" }
  ]
},

module2_cns: {
  kicker: "MODULE 2 • CNS",
  title: "CENTRAL NERVOUS SYSTEM",
  meta: "Brain & spinal cord",
  text:
`[YOU] The room sharpens—quiet, focused.
[SYSTEM] “Central Nervous System.”
[YOU] Thoughts here become commands.
Decisions form before movement exists.

Micro-check:
Which system includes the brain and spinal cord?`,
  choices: [
    { label: "Central Nervous System (CNS)", action: "microCheck_cns" },
    { label: "Peripheral Nervous System (PNS)", action: "microCheck_wrong" }
  ]
},

module2_pns: {
  kicker: "MODULE 2 • PNS",
  title: "PERIPHERAL NERVOUS SYSTEM",
  meta: "Communication lines",
  text:
`[YOU] Signals race outward—fast, automatic.
[SYSTEM] “Peripheral Nervous System.”
[YOU] This network connects command to action.

Micro-check:
What does the PNS primarily do?`,
  choices: [
    { label: "Connects CNS to body & senses", action: "microCheck_pns" },
    { label: "Generates conscious decisions", action: "microCheck_wrong" }
  ]
},

module2_split: {
  kicker: "MODULE 2 • DIVISION",
  title: "VOLUNTARY VS AUTOMATIC",
  meta: "Somatic vs Autonomic",
  text:
`[SYSTEM] “Peripheral control subdivides.”
Two subsystems emerge.

One obeys conscious will.
The other ignores it—keeping you alive.`,
  choices: [
    { label: "Somatic Nervous System", go: "module2_somatic" },
    { label: "Autonomic Nervous System", go: "module2_autonomic" }
  ]
},

module2_somatic: {
  kicker: "MODULE 2 • SOMATIC",
  title: "VOLUNTARY CONTROL",
  meta: "Movement under conscious intent",
  text:
`[YOU] Muscles respond when you decide.
[SYSTEM] “Somatic Nervous System.”
[YOU] You move because you choose to.

Micro-check:
Which system controls voluntary movement?`,
  choices: [
    { label: "Somatic Nervous System", action: "microCheck_somatic" },
    { label: "Autonomic Nervous System", action: "microCheck_wrong" }
  ]
},

module2_autonomic: {
  kicker: "MODULE 2 • AUTONOMIC",
  title: "SURVIVAL MODE",
  meta: "Automatic regulation",
  text:
`[YOU] Heartbeat. Breathing. Digestion.
[SYSTEM] “Autonomic Nervous System.”
[YOU] It acts without asking.

Two states flicker:
Acceleration.
Recovery.`,
  choices: [
    { label: "Sympathetic (fight or flight)", go: "module2_sympathetic" },
    { label: "Parasympathetic (rest & digest)", go: "module2_parasympathetic" }
  ]
},

module2_sympathetic: {
  kicker: "MODULE 2 • AUTONOMIC",
  title: "SYMPATHETIC STATE",
  meta: "Threat response",
  text:
`⚠ ALERT STATE ENGAGED
[SYSTEM] “Sympathetic activation.”
[YOU] Heart rate spikes. Attention narrows.

Micro-check:
Which state prepares the body for action?`,
  choices: [
    { label: "Sympathetic nervous system", action: "microCheck_sympathetic" },
    { label: "Parasympathetic nervous system", action: "microCheck_wrong" }
  ]
},

module2_parasympathetic: {
  kicker: "MODULE 2 • AUTONOMIC",
  title: "PARASYMPATHETIC STATE",
  meta: "Recovery mode",
  text:
`[SYSTEM] “Parasympathetic dominance.”
[YOU] Breathing slows. Systems recover.

Micro-check:
Which state restores the body after stress?`,
  choices: [
    { label: "Parasympathetic nervous system", action: "microCheck_parasympathetic" },
    { label: "Sympathetic nervous system", action: "microCheck_wrong" }
  ]
},

module2_complete: {
  kicker: "MODULE COMPLETE",
  title: "CHECKPOINT • COMMAND HIERARCHY STABLE",
  meta: "Next: Neurotransmitters & chemical balance",
  text:
`[SYSTEM] “Control restored.”
[YOU] Reflex, intent, and survival fall back into balance.

A new door unlocks:
“Chemical Messengers.”

Proceed when ready.`,
  choices: [
    { label: "Return to calibration (next Pomodoro)", go: "calibration" }
  ]
},

};

function renderNode(id){
  const n = STORY[id];

  if(!n){
    ui.sceneKicker.textContent = "ERROR";
    ui.sceneTitle.textContent = "MISSING NODE";
    ui.sceneMeta.textContent = "";
    ui.sceneText.textContent = `Node '${id}' not found.`;
    ui.choiceRow.innerHTML = "";
    return;
  }

  // Persist current node (✅ correct key)
  state.save.nodeId = id;
  saveNow();

  // Render text
  ui.sceneKicker.textContent = n.kicker || "";
  ui.sceneTitle.textContent = n.title || "";
  ui.sceneMeta.textContent = n.meta || "";
  ui.sceneText.textContent = n.text || "";

  // Render choices
  ui.choiceRow.innerHTML = "";

  (n.choices || []).forEach((c) => {
    const b = document.createElement("button");
    b.className = "choiceBtn";
    b.textContent = c.label || "Continue";

    b.onclick = () => safeRun(
      c.label || c.action || c.go || "choice",
      () => {
        if(c.go){
  logLine(`NAVIGATE → ${c.go}`, "sys");
  return renderNode(c.go);
}

        if(c.action === "startSession") return startSession(false);
        if(c.action === "startFast") return startSession(true);
        if(c.action === "continueAfterQuiz") return continueAfterQuiz();

        // --- Module 1 checks ---
        if(c.action === "microCheck_dendrite") return microCheck(true, "Dendrites receive incoming signals first.", "module1_complete");
        if(c.action === "microCheck_nt") return microCheck(true, "Neurotransmitters cross the synaptic gap and bind to receptors.", "module1_complete");
        if(c.action === "microCheck_wrong") return microCheck(false, "Not quite. Re-read the system hints and try again.");

        // --- Module 2 checks ---
        if(c.action === "microCheck_cns") return microCheck(true, "CNS includes the brain and spinal cord.", "module2_split");
        if(c.action === "microCheck_pns") return microCheck(true, "PNS connects the CNS to the rest of the body.", "module2_split");
        if(c.action === "microCheck_somatic") return microCheck(true, "Somatic controls voluntary movement.", "module2_autonomic");
        if(c.action === "microCheck_sympathetic") return microCheck(true, "Sympathetic prepares the body for action.", "module2_complete");
        if(c.action === "microCheck_parasympathetic") return microCheck(true, "Parasympathetic restores the body after stress.", "module2_complete");
      }
    );

    ui.choiceRow.appendChild(b);
  });
}

/* -----------------------
   QUIZ (Phase 1: Amygdala + Hippocampus)
------------------------ */
const CURATED_QUESTIONS = [
  {
    id:"amygdala_1", concept:"Amygdala",
    q:"What is the primary role of the amygdala?",
    opts:[
      "Balance and fine motor coordination",
      "Threat detection and fear-related processing",
      "Direct hormone production",
      "Vision processing"
    ],
    answer:1,
    teach:"Amygdala = threat detection + fear processing. It helps trigger fight-or-flight responses."
  },
  {
    id:"hippocampus_1", concept:"Hippocampus",
    q:"Which function is most associated with the hippocampus?",
    opts:[
      "Forming new long-term (episodic/spatial) memories",
      "Regulating breathing rate directly",
      "Producing dopamine",
      "Controlling reflex arcs"
    ],
    answer:0,
    teach:"Hippocampus = forming new long-term memories (episodic/spatial)."
  }
];

function buildQuestionPool(){
  const pool = [];

  // Always include curated A/H questions
  pool.push(...CURATED_QUESTIONS);

  // Add definition MCQs for every term (including A/H too—fine for repetition)
  TERM_BANK.forEach(t => {
    if(t.def){
      pool.push(buildDefinitionMCQ(t));
    }
  });

  return pool;
}


function getTermByConceptName(name){
  return TERM_BANK.find(t => t.term === name) || null;
}

const PHASE1_CONCEPTS = ["Amygdala", "Hippocampus"];

function buildDefinitionMCQ(termObj){
  // pick 3 distractors from other terms' definitions
  const others = TERM_BANK.filter(t => t.id !== termObj.id && t.def);
  // shuffle
  for(let i=others.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const distractors = others.slice(0,3).map(t => t.def);

  const options = [termObj.def, ...distractors];
  // shuffle options
  for(let i=options.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const answerIndex = options.indexOf(termObj.def);

  return {
    id: `def_${termObj.id}`,
    concept: termObj.term,
    q: `Which definition best matches: ${termObj.term}?`,
    opts: options,
    answer: answerIndex,
    teach: termObj.learn || termObj.def
  };
}

function pickQuestions(n=5){
  const missed = state.save.missed.slice();

  // Build pool then LOCK to Phase 1 concepts only
  const pool = buildQuestionPool().filter(q => PHASE1_CONCEPTS.includes(q.concept));

  // shuffle
  for(let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // prioritize missed (but only if they are Phase 1 concepts)
  const prioritized = [];
  for(const q of pool) if(missed.includes(q.concept)) prioritized.push(q);
  for(const q of pool) if(!missed.includes(q.concept)) prioritized.push(q);

  // In case pool is smaller than n, just return what's available
  return prioritized.slice(0, Math.min(n, prioritized.length));
}

function startQuiz(){
  state.quiz.active = true;
  state.quiz.questions = pickQuestions(4);
  state.quiz.idx = 0;
  state.quiz.selected = null;
  state.quiz.answers = [];

  ui.quizPanel.hidden = false;
  ui.submitBtn.disabled = true;

  logLine("KNOWLEDGE CHECK: calibration initiated.", "sys");
  renderQuizQ();
}

function renderQuizQ(){
  const q = state.quiz.questions[state.quiz.idx];
  ui.quizConcept.textContent = `CALIBRATION • ${q.concept.toUpperCase()}`;
  ui.quizMeta.textContent = "Answer to stabilize the system";
  ui.quizQ.textContent = q.q;

  ui.quizOpts.innerHTML = "";
  ui.submitBtn.disabled = true;
  state.quiz.selected = null;

  ui.quizProgress.textContent = `Question ${state.quiz.idx+1} / ${state.quiz.questions.length}`;

  q.opts.forEach((t, idx) => {
    const opt = document.createElement("div");
    opt.className = "opt";
    opt.textContent = t;
    opt.onclick = () => {
      [...ui.quizOpts.children].forEach(el => el.classList.remove("selected"));
      opt.classList.add("selected");
      state.quiz.selected = idx;
      ui.submitBtn.disabled = false;
    };
    ui.quizOpts.appendChild(opt);
  });
}

function submitQuiz(){
  const q = state.quiz.questions[state.quiz.idx];
  const correct = state.quiz.selected === q.answer;

  state.quiz.answers.push({ concept:q.concept, correct });

  if(correct){
    logLine(`✔ ${q.concept}: integrity confirmed.`, "ok");
    setStability(state.save.stability + 3);
    state.save.missed = state.save.missed.filter(c => c !== q.concept);
  }else{
    logLine(`✖ ${q.concept}: mismatch detected.`, "warn");
    logLine(`↳ ${q.teach}`, "sys");
    setStability(state.save.stability - 5);
    if(!state.save.missed.includes(q.concept)) state.save.missed.push(q.concept);
  }

  saveNow();

  state.quiz.idx += 1;
  if(state.quiz.idx >= state.quiz.questions.length){
    finishQuiz();
  }else{
    renderQuizQ();
  }
}

function finishQuiz(){
  const total = state.quiz.answers.length;
  const got = state.quiz.answers.filter(a => a.correct).length;
  const pct = Math.round((got/total)*100);

  setScore(pct);
  logLine(`QUIZ COMPLETE: ${got}/${total} correct.`, "sys");

  // Narrative consequences (data-driven)
  state.save.missed.forEach((conceptName) => {
    const t = getTermByConceptName(conceptName);
    if(t && t.consequence){
      logLine(`⚠ ${t.term.toUpperCase()} CONSEQUENCE: ${t.consequence}`, "warn");
    }
  });

  // ✅ First close quiz UI
  ui.quizPanel.hidden = true;
state.quiz.active = false;

renderNode("post_quiz");
return;
}

function continueAfterQuiz(){
  const missed = state.save.missed || [];

  if(missed.includes("Amygdala")){
    return renderNode("route_threat");
  }
  if(missed.includes("Hippocampus")){
    return renderNode("route_memory");
  }
  return renderNode("route_clear");
}

function microCheck(correct, message, nextNode){
  if(correct){
    logLine(`✔ MICRO-CHECK: ${message}`, "ok");
    setStability(state.save.stability + 2);

    // ✅ go where the caller wants (Module 1, Module 2, etc.)
    if(nextNode) renderNode(nextNode);
  }else{
    logLine(`✖ MICRO-CHECK: ${message}`, "warn");
    setStability(state.save.stability - 2);
    // Stay on same node
  }
}

/* -----------------------
   Session start/end
------------------------ */
function startSession(fast){
  if(fast){
    ui.minutesSelect.value = "5";
  }
  applyMinutes();

  logLine("SESSION START: Focus corridor engaged.", "ok");
  startTimer();
  startQuiz();
}

function endSession(){
  logLine("SESSION END: timer complete.", "sys");

  if(typeof state.save.lastScore === "number"){
    logLine(`FINAL SCORE: ${state.save.lastScore}%`, "ok");
  }else{
    logLine("FINAL SCORE: — (quiz incomplete)", "warn");
  }

  // Return to calibration node
  renderNode("calibration");
}

/* -----------------------
   Sound toggle (placeholder)
------------------------ */
function syncSoundUI(){
  ui.soundBtn.setAttribute("aria-pressed", String(state.save.soundOn));
  ui.soundBtn.textContent = state.save.soundOn ? "SOUND: ON" : "SOUND: OFF";
}
ui.soundBtn.onclick = () => {
  state.save.soundOn = !state.save.soundOn;
  saveNow();
  syncSoundUI();
  logLine(state.save.soundOn ? "Audio channel armed (placeholder)." : "Audio channel muted (placeholder).", "sys");
};

/* -----------------------
   Wire controls
------------------------ */
ui.startBtn.onclick = () => startSession(false);
ui.pauseBtn.onclick = () => {
  if(state.timer.running){
    stopTimer();
    logLine("SESSION PAUSED.", "sys");
  }
};
ui.resetBtn.onclick = () => {
  stopTimer();
  ui.quizPanel.hidden = true;

  state.quiz.active = false;
  state.quiz.questions = [];
  state.quiz.idx = 0;
  state.quiz.selected = null;
  state.quiz.answers = [];

  ui.logBox.innerHTML = "";
  logLine("System reset.", "sys");

  state.save.stability = 50;
  state.save.lastScore = null;
  state.save.missed = [];
  saveNow();

  setStability(50);
  ui.hudScore.textContent = "SCORE —";
  applyMinutes();
  renderNode("post_quiz");
};

ui.minutesSelect.onchange = () => applyMinutes();
ui.submitBtn.onclick = () => submitQuiz();

/* -----------------------
   Boot
------------------------ */
syncSoundUI();
renderTerms();

setStability(state.save.stability);
ui.hudScore.textContent = (typeof state.save.lastScore === "number") ? `SCORE ${state.save.lastScore}%` : "SCORE —";
applyMinutes();

logLine("System online. Neuroveil protocol loaded.", "sys");
renderNode(state.save.nodeId || "boot");
