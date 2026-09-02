(() => {
  "use strict";

  const Engine = window.QuestionEngine;
  if (!Engine) throw new Error("Le générateur de questions n'a pas été chargé.");

  const $ = selector => document.querySelector(selector);
  const CORE_SKILLS = ["proportions", "numeric", "evolutions", "units", "logic", "algebra", "functions", "sequences", "derivatives", "statistics", "probability", "algorithmics"];
  const PRESETS = {
    mixed: CORE_SKILLS,
    calculation: ["proportions", "numeric", "evolutions", "units"],
    algebra: ["algebra", "functions", "sequences", "derivatives"],
    data: ["statistics", "probability"]
  };

  const dom = {
    setup: $("#setup-screen"), series: $("#series-screen"), review: $("#review-screen"),
    presetList: $("#preset-list"), skillPicker: $("#skill-picker"), skillList: $("#skill-list"), toggleAllSkills: $("#toggle-all-skills"),
    count: $("#question-count"), duration: $("#question-duration"), quickStart: $("#quick-start"), start: $("#start-series"), copyLink: $("#copy-series-link"),
    seriesProgress: $("#series-progress"), progressBar: $("#progress-bar"), pause: $("#pause-series"), quit: $("#quit-series"), next: $("#next-question"),
    questionSkill: $("#question-skill"), timer: $("#timer"), timerValue: $("#timer-value"), visual: $("#question-visual"), questionText: $("#question-text"), answerZone: $("#answer-zone"),
    reviewTitle: $("#review-title"), reviewSummary: $("#review-summary"), scoreCard: $("#score-card"), scoreValue: $("#score-value"), reviewList: $("#review-list"), reviewProgress: $("#review-progress"), previousCorrection: $("#previous-correction"), nextCorrection: $("#next-correction"), restart: $("#restart-series"), newSeries: $("#new-series"),
    pauseDialog: $("#pause-dialog"), resume: $("#resume-series"), toast: $("#toast")
  };

  let selectedPreset = "mixed";
  let seed = "";
  let questions = [];
  let answers = [];
  let currentIndex = 0;
  let reviewIndex = 0;
  let remainingMs = 0;
  let lastTick = 0;
  let timerFrame = 0;
  let paused = false;
  let toastTimer = 0;

  function hashSeed(value) {
    let hash = 1779033703 ^ String(value).length;
    for (let index = 0; index < String(value).length; index += 1) {
      hash = Math.imul(hash ^ String(value).charCodeAt(index), 3432918353);
      hash = hash << 13 | hash >>> 19;
    }
    return () => {
      hash = Math.imul(hash ^ hash >>> 16, 2246822507);
      hash = Math.imul(hash ^ hash >>> 13, 3266489909);
      return (hash ^= hash >>> 16) >>> 0;
    };
  }

  function seededRandom(value) {
    let state = hashSeed(value)();
    return () => {
      state += 0x6D2B79F5;
      let result = state;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function createSeed() {
    if (crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      crypto.getRandomValues(values);
      return [...values].map(value => value.toString(36)).join("");
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }

  function optionSkills() {
    dom.skillList.replaceChildren();
    CORE_SKILLS.forEach(skill => {
      const label = document.createElement("label");
      label.className = "skill-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = skill;
      input.checked = true;
      label.append(input, document.createTextNode(Engine.SKILLS[skill]));
      dom.skillList.append(label);
    });
  }

  function selectPreset(preset) {
    selectedPreset = PRESETS[preset] || preset === "custom" ? preset : "mixed";
    dom.presetList.querySelectorAll("[data-preset]").forEach(button => {
      const active = button.dataset.preset === selectedPreset;
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", String(active));
    });
    dom.skillPicker.hidden = selectedPreset !== "custom";
  }

  function selectedSkills() {
    if (selectedPreset !== "custom") return PRESETS[selectedPreset] || CORE_SKILLS;
    return [...dom.skillList.querySelectorAll("input:checked")].map(input => input.value);
  }

  function answerMode() {
    return document.querySelector('input[name="answer-mode"]:checked')?.value || "qcm";
  }

  function settings() {
    return { count: Number(dom.count.value), duration: Number(dom.duration.value), mode: answerMode(), skills: selectedSkills() };
  }

  function makeQuestions(config, nextSeed) {
    const rng = seededRandom(nextSeed);
    const kinds = Engine.SUBSKILLS.filter(subskill => config.skills.includes(subskill.skill)).map(subskill => subskill.id);
    if (!kinds.length) throw new Error("Choisis au moins une notion.");
    const generated = [];
    const fingerprints = [];
    for (let index = 0; index < config.count; index += 1) {
      const question = Engine.generateForKinds(kinds, {}, rng, { keys: fingerprints, kinds: index < kinds.length ? generated.map(item => item.kind) : [] });
      const fingerprint = Engine.fingerprint(question);
      fingerprints.push(fingerprint);
      generated.push(question);
    }
    return generated;
  }

  function showScreen(name) {
    dom.setup.hidden = name !== "setup";
    dom.series.hidden = name !== "series";
    dom.review.hidden = name !== "review";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 2600);
  }

  function createShareURL(nextSeed = seed || createSeed()) {
    const config = settings();
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("seed", nextSeed);
    url.searchParams.set("n", String(config.count));
    url.searchParams.set("t", String(config.duration));
    url.searchParams.set("mode", config.mode);
    url.searchParams.set("skills", config.skills.join(","));
    return url;
  }

  async function copySeriesLink() {
    if (!selectedSkills().length) return showToast("Choisis au moins une notion.");
    seed = createSeed();
    const url = createShareURL(seed);
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.href);
      showToast("Lien copié : cette adresse recréera exactement la même série.");
    } catch {
      showToast("Le lien est prêt dans la barre d’adresse.");
    }
  }

  function startSeries({ reuse = false } = {}) {
    const config = settings();
    if (!config.skills.length) return showToast("Choisis au moins une notion.");
    cancelAnimationFrame(timerFrame);
    seed = reuse && seed ? seed : (new URL(window.location.href).searchParams.get("seed") || createSeed());
    try { questions = makeQuestions(config, seed); }
    catch (error) { return showToast(error.message); }
    answers = questions.map(() => ({ value: null, timedOut: false }));
    currentIndex = 0;
    showScreen("series");
    renderQuestion();
  }

  function renderQuestion() {
    const question = questions[currentIndex];
    const config = settings();
    dom.seriesProgress.textContent = `Question ${currentIndex + 1} sur ${questions.length}`;
    dom.progressBar.style.width = `${currentIndex / questions.length * 100}%`;
    dom.questionSkill.textContent = Engine.SKILLS[question.skill];
    dom.questionText.textContent = question.prompt;
    dom.visual.innerHTML = question.visual || "";
    dom.visual.hidden = !question.visual;
    renderQuestionCanvases();
    dom.answerZone.replaceChildren();
    if (config.mode === "qcm") {
      question.choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-button";
        button.textContent = choice;
        button.addEventListener("click", () => {
          answers[currentIndex].value = index;
          dom.answerZone.querySelectorAll(".answer-button").forEach((item, itemIndex) => item.classList.toggle("selected", itemIndex === index));
        });
        dom.answerZone.append(button);
      });
    } else if (config.mode === "free") {
      const input = document.createElement("input");
      input.className = "free-answer";
      input.type = "text";
      input.autocomplete = "off";
      input.placeholder = "Écrire la réponse…";
      input.setAttribute("aria-label", "Réponse libre");
      input.addEventListener("input", () => { answers[currentIndex].value = input.value; });
      input.addEventListener("keydown", event => { if (event.key === "Enter") nextQuestion(); });
      dom.answerZone.append(input);
      setTimeout(() => input.focus(), 0);
    } else {
      const note = document.createElement("div");
      note.className = "projection-note";
      note.textContent = "Répondre sur feuille. La solution sera dévoilée à la fin de la série.";
      dom.answerZone.append(note);
    }
    dom.next.textContent = currentIndex === questions.length - 1 ? "Terminer la série" : (config.mode === "projection" ? "Question suivante" : "Valider et continuer");
    startTimer();
  }

  function startTimer() {
    cancelAnimationFrame(timerFrame);
    const duration = settings().duration;
    remainingMs = duration * 1000;
    lastTick = performance.now();
    paused = false;
    dom.pause.disabled = duration === 0;
    updateTimerDisplay();
    if (duration > 0) timerFrame = requestAnimationFrame(tickTimer);
  }

  function tickTimer(now) {
    if (paused) return;
    remainingMs -= now - lastTick;
    lastTick = now;
    if (remainingMs <= 0) {
      remainingMs = 0;
      updateTimerDisplay();
      answers[currentIndex].timedOut = true;
      nextQuestion({ fromTimer: true });
      return;
    }
    updateTimerDisplay();
    timerFrame = requestAnimationFrame(tickTimer);
  }

  function updateTimerDisplay() {
    const duration = settings().duration;
    const seconds = duration ? Math.max(0, Math.ceil(remainingMs / 1000)) : "∞";
    dom.timerValue.textContent = seconds;
    dom.timer.style.setProperty("--timer-progress", duration ? Math.max(0, remainingMs / (duration * 1000)) : 1);
    dom.timer.classList.toggle("warning", duration > 0 && seconds <= 10 && seconds > 5);
    dom.timer.classList.toggle("urgent", duration > 0 && seconds <= 5);
  }

  function nextQuestion({ fromTimer = false } = {}) {
    cancelAnimationFrame(timerFrame);
    if (!fromTimer && settings().mode === "qcm" && answers[currentIndex].value === null) answers[currentIndex].timedOut = true;
    if (!fromTimer && settings().mode === "free" && !String(answers[currentIndex].value || "").trim()) answers[currentIndex].timedOut = true;
    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
      renderQuestion();
    } else {
      showReview();
    }
  }

  function isCorrect(question, answer) {
    if (settings().mode === "qcm") return answer.value === question.answer;
    if (settings().mode === "free") return Engine.canonicalChoice(answer.value || "") === Engine.canonicalChoice(question.choices[question.answer]);
    return null;
  }

  function showReview() {
    cancelAnimationFrame(timerFrame);
    showScreen("review");
    const mode = settings().mode;
    const results = questions.map((question, index) => isCorrect(question, answers[index]));
    const correct = results.filter(Boolean).length;
    dom.reviewTitle.textContent = `Reprenons les ${questions.length} questions.`;
    dom.scoreCard.hidden = mode === "projection";
    dom.scoreValue.textContent = `${correct}/${questions.length}`;
    dom.reviewSummary.textContent = mode === "projection"
      ? "Corrigez chaque réponse avec une autre couleur, puis ajoutez un point lorsque le résultat est juste."
      : `${correct} réponse${correct > 1 ? "s" : ""} juste${correct > 1 ? "s" : ""}. Les corrections n’ont été affichées qu’après la dernière question.`;
    dom.reviewList.replaceChildren();
    questions.forEach((question, index) => {
      const result = results[index];
      const answer = answers[index];
      const article = document.createElement("article");
      article.className = `review-item ${result === true ? "correct" : answer.timedOut ? "unanswered" : "wrong"}`;
      const status = mode === "projection" ? "Correction" : result === true ? "Juste" : answer.timedOut ? "Sans réponse" : "À reprendre";
      let studentAnswer = "";
      if (mode === "qcm" && Number.isInteger(answer.value)) studentAnswer = question.choices[answer.value];
      if (mode === "free") studentAnswer = String(answer.value || "").trim();
      article.innerHTML = `<div class="review-item-head"><span>Question ${index + 1} · ${escapeHTML(Engine.SKILLS[question.skill])}</span><strong class="review-status">${status}</strong></div>${question.visual ? `<div class="review-visual">${question.visual}</div>` : ""}<div class="review-question">${escapeHTML(question.prompt)}</div><div class="review-answer">${mode !== "projection" ? `<span class="student">Ta réponse : ${escapeHTML(studentAnswer || "aucune")}</span>` : ""}<strong>Bonne réponse : ${escapeHTML(question.choices[question.answer])}</strong></div><p class="review-explanation">${escapeHTML(question.explanation)}</p>`;
      article.hidden = index !== 0;
      dom.reviewList.append(article);
    });
    reviewIndex = 0;
    showReviewItem();
    dom.progressBar.style.width = "100%";
  }

  function showReviewItem() {
    const items = [...dom.reviewList.querySelectorAll(".review-item")];
    items.forEach((item, index) => { item.hidden = index !== reviewIndex; });
    dom.reviewProgress.textContent = `Correction ${reviewIndex + 1} sur ${items.length}`;
    dom.previousCorrection.disabled = reviewIndex === 0;
    dom.nextCorrection.textContent = reviewIndex === items.length - 1 ? "Correction terminée ✓" : "Correction suivante →";
    renderQuestionCanvases(items[reviewIndex]);
  }

  function moveReview(direction) {
    const lastIndex = questions.length - 1;
    if (direction > 0 && reviewIndex === lastIndex) {
      showToast("Correction terminée : chacun peut inscrire son total sur 6.");
      return;
    }
    reviewIndex = Math.max(0, Math.min(lastIndex, reviewIndex + direction));
    showReviewItem();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function renderQuestionCanvases(root = dom.visual) {
    root.querySelectorAll("canvas[data-plot='line']").forEach(canvas => {
      const width = Math.max(260, Math.min(780, Math.round(canvas.getBoundingClientRect().width || 620)));
      const height = Math.round(Math.max(210, width * .48));
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * ratio; canvas.height = height * ratio; canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d"); context.scale(ratio, ratio);
      const margin = 28, xMin = -4, xMax = 4, yMin = -6, yMax = 6;
      const px = x => margin + (x - xMin) / (xMax - xMin) * (width - margin * 2);
      const py = y => height - margin - (y - yMin) / (yMax - yMin) * (height - margin * 2);
      context.fillStyle = "rgba(4,20,29,.78)"; context.fillRect(0, 0, width, height); context.lineWidth = 1; context.font = "10px system-ui";
      for (let x = xMin; x <= xMax; x += 1) { context.strokeStyle = x === 0 ? "rgba(220,246,250,.62)" : "rgba(125,196,210,.13)"; context.beginPath(); context.moveTo(px(x), margin); context.lineTo(px(x), height - margin); context.stroke(); }
      for (let y = yMin; y <= yMax; y += 1) { context.strokeStyle = y === 0 ? "rgba(220,246,250,.62)" : "rgba(125,196,210,.13)"; context.beginPath(); context.moveTo(margin, py(y)); context.lineTo(width - margin, py(y)); context.stroke(); }
      if (canvas.dataset.level !== undefined) { context.setLineDash([6,5]); context.strokeStyle = "rgba(255,186,107,.85)"; context.beginPath(); context.moveTo(margin, py(Number(canvas.dataset.level))); context.lineTo(width - margin, py(Number(canvas.dataset.level))); context.stroke(); context.setLineDash([]); }
      const slope = Number(canvas.dataset.slope), intercept = Number(canvas.dataset.intercept);
      context.save(); context.beginPath(); context.rect(margin, margin, width - margin * 2, height - margin * 2); context.clip(); context.lineWidth = 3; context.strokeStyle = "#c47cff"; context.beginPath(); context.moveTo(px(xMin), py(slope * xMin + intercept)); context.lineTo(px(xMax), py(slope * xMax + intercept)); context.stroke(); context.restore();
    });
  }

  function pauseSeries() {
    if (settings().duration === 0) return;
    paused = true;
    cancelAnimationFrame(timerFrame);
    dom.pauseDialog.showModal();
  }

  function resumeSeries() {
    paused = false;
    lastTick = performance.now();
    dom.pauseDialog.close();
    timerFrame = requestAnimationFrame(tickTimer);
  }

  function loadURLSettings() {
    const params = new URL(window.location.href).searchParams;
    const sharedSkills = (params.get("skills") || "").split(",").filter(skill => CORE_SKILLS.includes(skill));
    if (!params.has("seed") || !sharedSkills.length) return;
    seed = params.get("seed");
    const count = params.get("n"), duration = params.get("t"), mode = params.get("mode");
    if ([...dom.count.options].some(option => option.value === count)) dom.count.value = count;
    if ([...dom.duration.options].some(option => option.value === duration)) dom.duration.value = duration;
    const modeInput = document.querySelector(`input[name="answer-mode"][value="${mode}"]`);
    if (modeInput) modeInput.checked = true;
    selectPreset("custom");
    dom.skillList.querySelectorAll("input").forEach(input => { input.checked = sharedSkills.includes(input.value); });
    showToast("Série partagée chargée. Elle est prête à démarrer.");
  }

  dom.presetList.addEventListener("click", event => { const button = event.target.closest("[data-preset]"); if (button) selectPreset(button.dataset.preset); });
  dom.toggleAllSkills.addEventListener("click", () => {
    const inputs = [...dom.skillList.querySelectorAll("input")];
    const check = inputs.some(input => !input.checked);
    inputs.forEach(input => { input.checked = check; });
    dom.toggleAllSkills.textContent = check ? "Tout désélectionner" : "Tout sélectionner";
  });
  dom.start.addEventListener("click", () => startSeries());
  dom.quickStart.addEventListener("click", () => {
    selectPreset("mixed");
    dom.count.value = "6";
    dom.duration.value = "30";
    document.querySelector('input[name="answer-mode"][value="projection"]').checked = true;
    startSeries();
  });
  dom.copyLink.addEventListener("click", copySeriesLink);
  dom.next.addEventListener("click", () => nextQuestion());
  dom.quit.addEventListener("click", () => { cancelAnimationFrame(timerFrame); showScreen("setup"); });
  dom.pause.addEventListener("click", pauseSeries);
  dom.resume.addEventListener("click", resumeSeries);
  dom.restart.addEventListener("click", () => startSeries({ reuse: true }));
  dom.previousCorrection.addEventListener("click", () => moveReview(-1));
  dom.nextCorrection.addEventListener("click", () => moveReview(1));
  dom.newSeries.addEventListener("click", () => { seed = ""; history.replaceState(null, "", window.location.pathname); showScreen("setup"); });
  window.addEventListener("resize", () => !dom.series.hidden && renderQuestionCanvases());
  document.addEventListener("keydown", event => {
    if (dom.series.hidden || paused || event.metaKey || event.ctrlKey || event.altKey) return;
    if (settings().mode === "qcm" && ["1","2","3","4"].includes(event.key)) dom.answerZone.querySelectorAll(".answer-button")[Number(event.key) - 1]?.click();
    if (event.key === "Enter" && document.activeElement?.classList.contains("free-answer") === false) nextQuestion();
    if (event.key === " ") { event.preventDefault(); pauseSeries(); }
  });

  optionSkills();
  loadURLSettings();
})();
