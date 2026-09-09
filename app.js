(() => {
  "use strict";

  const Engine = window.QuestionEngine;
  if (!Engine) throw new Error("Le générateur de questions n'a pas été chargé.");

  const $ = selector => document.querySelector(selector);
  const SUBSCRIPT_CHARACTERS = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "−", "ₙ": "n" };
  const SUPERSCRIPT_CHARACTERS = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "−" };
  const MATH_INLINE_PATTERN = /f′?\(x\)\s*=\s*[−-]?(?:√(?:\([^()]+\)|[A-Za-z]|\d+(?:[,.]\d+)?)|\d*π|\d+(?:[,.]\d+)?|[a-zω])\s*\/\s*(?:\([^()]+\)(?:²|³)?|\d+(?:[,.]\d+)?|[a-zω])|P\([^()]*\)\s*\/\s*P\([^()]*\)|(?:sin|cos)\([^()]+\)\s*\/\s*[a-zω]|norm\(vec\([^)]+\)\)|vec\([^)]+\)\s*·\s*vec\([^)]+\)|\(\s*vec\([^)]+\)\s*,\s*vec\([^)]+\)\s*\)|vec\([^)]+\)|(?:√?\d+|ρ)\((?:cos|sin)\([^()]+\)\s*\+\s*(?:sin|cos)\([^()]+\)i\)|\[(?:√?\d+|ρ)\s*,\s*[^,\]]+\]|(?:cos|sin)\([^()]+\)|P\([^()]*\)(?:\s*=\s*[−-]?\d+(?:[,.]\d+)?)?|u[₀₁₂₃₄₅₆₇₈₉₊₋ₙ]+(?:\s*=\s*(?:u[₀₁₂₃₄₅₆₇₈₉₊₋ₙ]+|[−-]?\d+)(?:\s*[+−-]\s*\d+)?)?|(?:[−-]?\d*)?\(x\s*[+−-]\s*\d+\)(?:\(x\s*[+−-]\s*\d+\))+(?:\s*=\s*0)?|[xy]\s*=\s*[−-]?(?:\d+(?:[,.]\d+)?)?x(?:\s*[+−-]\s*\d+(?:[,.]\d+)?)?|(?:f′?\(x\)|[xy])\s*[=<>≤≥]\s*[−-]?\d+(?:\s+(?:ou|et)\s*[xy]\s*[=<>≤≥]\s*[−-]?\d+)?|\d+\s*×\s*10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
  const MATH_DECORATION_PATTERN = /norm\(vec\(([^)]+)\)\)|vec\(([^)]+)\)|(?<![A-Za-zÀ-ÿ])([−-]?(?:√(?:\([^()]+\)|[A-Za-z]|\d+(?:[,.]\d+)?)|\d*π|\d+(?:[,.]\d+)?|[a-zω](?:′)?|(?:sin|cos)\([^()]+\)|\([^()]+\)))\s*\/\s*(\([^()]+\)(?:²|³)?|\d+(?:[,.]\d+)?|[a-zωπ](?:²|³)?)(?![A-Za-zÀ-ÿ])|√(\([^()]+\)|[A-Za-z]|\d+(?:[,.]\d+)?)/gi;
  const CORE_SKILLS = ["proportions", "numeric", "evolutions", "units", "logic", "algebra", "functions", "sequences", "derivatives", "statistics", "probability", "algorithmics"];
  const PRESETS = {
    mixed: CORE_SKILLS,
    calculation: ["proportions", "numeric", "evolutions", "units"],
    algebra: ["algebra", "functions", "sequences", "derivatives"],
    data: ["statistics", "probability"]
  };

  const dom = {
    setup: $("#setup-screen"), series: $("#series-screen"), review: $("#review-screen"),
    presetList: $("#preset-list"), skillPicker: $("#skill-picker"), skillList: $("#skill-list"), toggleAllSkills: $("#toggle-all-skills"), sheetLink: $("#sheet-link"),
    count: $("#question-count"), duration: $("#question-duration"), quickStart: $("#quick-start"), start: $("#start-series"), copyLink: $("#copy-series-link"),
    seriesProgress: $("#series-progress"), progressBar: $("#progress-bar"), pause: $("#pause-series"), quit: $("#quit-series"), next: $("#next-question"),
    questionSkill: $("#question-skill"), timer: $("#timer"), timerValue: $("#timer-value"), visual: $("#question-visual"), questionText: $("#question-text"), answerZone: $("#answer-zone"),
    reviewTitle: $("#review-title"), reviewSummary: $("#review-summary"), scoreCard: $("#score-card"), scoreValue: $("#score-value"), reviewList: $("#review-list"), reviewNav: $("#review-nav"), reviewProgress: $("#review-progress"), previousCorrection: $("#previous-correction"), nextCorrection: $("#next-correction"), projectionSummary: $("#projection-summary"), projectionSummaryList: $("#projection-summary-list"), backToCorrections: $("#back-to-corrections"), restart: $("#restart-series"), newSeries: $("#new-series"),
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
  const ANSWER_LETTERS = ["A", "B", "C", "D"];

  function appendMathCharacters(target, text) {
    String(text)
      .replace(/(^|[\s=(;,])-(?=[0-9xyzuiρπ])/gi, "$1−")
      .replace(/(?<=[0-9A-Za-z)])\s+([=+−×÷<>≤≥])\s+(?=[0-9A-Za-z(])/g, "\u00a0$1\u00a0")
      .split(/([₀₁₂₃₄₅₆₇₈₉₊₋ₙ]+|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g).forEach(fragment => {
      if (!fragment) return;
      const subscript = [...fragment].every(character => SUBSCRIPT_CHARACTERS[character] !== undefined);
      const superscript = [...fragment].every(character => SUPERSCRIPT_CHARACTERS[character] !== undefined);
      if (!subscript && !superscript) return target.append(document.createTextNode(fragment));
      const modifier = document.createElement("span");
      modifier.className = subscript ? "math-sub" : "math-sup";
      modifier.textContent = [...fragment].map(character => (subscript ? SUBSCRIPT_CHARACTERS : SUPERSCRIPT_CHARACTERS)[character]).join("");
      target.append(modifier);
    });
  }

  function appendVector(target, label) {
    const vector = document.createElement("span");
    vector.className = "math-vector";
    appendMathCharacters(vector, label);
    target.append(vector);
  }

  function appendFraction(target, numerator, denominator) {
    const fraction = document.createElement("span");
    fraction.className = "math-fraction";
    const top = document.createElement("span");
    const bottom = document.createElement("span");
    const normalizedNumerator = numerator.replace("-", "−");
    const isNegative = normalizedNumerator.startsWith("−");
    appendDecoratedMath(top, isNegative ? normalizedNumerator.slice(1) : normalizedNumerator);
    const normalizedDenominator = denominator.trim();
    const displayedDenominator = /^\([^()]+\)$/.test(normalizedDenominator) ? normalizedDenominator.slice(1, -1) : normalizedDenominator;
    appendDecoratedMath(bottom, displayedDenominator);
    fraction.append(top, bottom);
    if (isNegative) {
      const signedFraction = document.createElement("span");
      signedFraction.className = "math-signed-fraction";
      const sign = document.createElement("span");
      sign.className = "math-fraction-sign";
      sign.textContent = "−";
      signedFraction.append(sign, fraction);
      target.append(signedFraction);
    } else {
      target.append(fraction);
    }
  }

  function appendRadical(target, radicand) {
    const radical = document.createElement("span");
    radical.className = "math-radical";
    const sign = document.createElement("span");
    sign.className = "math-radical-sign";
    sign.textContent = "√";
    const content = document.createElement("span");
    content.className = "math-radicand";
    appendMathCharacters(content, radicand);
    radical.append(sign, content);
    target.append(radical);
  }

  function appendDecoratedMath(target, text) {
    const source = String(text);
    let cursor = 0;
    for (const match of source.matchAll(MATH_DECORATION_PATTERN)) {
      appendMathCharacters(target, source.slice(cursor, match.index));
      if (match[1]) {
        const norm = document.createElement("span");
        norm.className = "math-norm";
        norm.append(document.createTextNode("‖"));
        appendVector(norm, match[1]);
        norm.append(document.createTextNode("‖"));
        target.append(norm);
      } else if (match[2]) {
        appendVector(target, match[2]);
      } else if (match[3]) {
        appendFraction(target, match[3], match[4]);
      } else {
        appendRadical(target, match[5]);
      }
      cursor = match.index + match[0].length;
    }
    appendMathCharacters(target, source.slice(cursor));
  }

  function renderMathText(target, text) {
    const fragment = document.createDocumentFragment();
    const source = String(text).replace(/\bh\s*=\s*[−-]?\d+(?:[,.]\d+)?/g, formula => formula.replace(/\s/g, "\u00a0"));
    let cursor = 0;
    for (const match of source.matchAll(MATH_INLINE_PATTERN)) {
      appendDecoratedMath(fragment, source.slice(cursor, match.index));
      const formula = document.createElement("span");
      formula.className = "math-inline";
      appendDecoratedMath(formula, match[0]);
      if (formula.querySelector(".math-fraction")) formula.classList.add("math-inline-fraction");
      fragment.append(formula);
      cursor = match.index + match[0].length;
    }
    appendDecoratedMath(fragment, source.slice(cursor));
    target.replaceChildren(fragment);
  }

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
      const group = document.createElement("section");
      group.className = "skill-group";
      const title = document.createElement("strong");
      title.textContent = Engine.SKILLS[skill];
      group.append(title);
      Engine.SUBSKILLS.filter(subskill => subskill.skill === skill).forEach(subskill => {
        const label = document.createElement("label");
        label.className = "skill-option";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = subskill.id;
        input.dataset.skill = skill;
        input.checked = true;
        label.append(input, document.createTextNode(`${subskill.label || subskill.id} · ${subskill.id}`));
        group.append(label);
      });
      dom.skillList.append(group);
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
    return [...new Set([...dom.skillList.querySelectorAll("input:checked")].map(input => input.dataset.skill))];
  }

  function selectedKinds() {
    if (selectedPreset !== "custom") return Engine.SUBSKILLS.filter(subskill => selectedSkills().includes(subskill.skill)).map(subskill => subskill.id);
    return [...dom.skillList.querySelectorAll("input:checked")].map(input => input.value);
  }

  function answerMode() {
    return document.querySelector('input[name="answer-mode"]:checked')?.value || "projection";
  }

  function settings() {
    return { count: Number(dom.count.value), duration: Number(dom.duration.value), mode: answerMode(), skills: selectedSkills(), kinds: selectedKinds() };
  }

  function makeQuestions(config, nextSeed) {
    const rng = seededRandom(nextSeed);
    const kinds = config.kinds?.length ? config.kinds : Engine.SUBSKILLS.filter(subskill => config.skills.includes(subskill.skill)).map(subskill => subskill.id);
    if (!kinds.length) throw new Error("Choisis au moins une notion.");
    const generated = [];
    const fingerprints = [];
    const order = [...kinds].sort(() => rng() - 0.5);
    for (let index = 0; index < config.count; index += 1) {
      const preferred = order[index % order.length];
      // On parcourt les formats dans un ordre mélangé puis on recommence :
      // chaque thème est ainsi représenté avant qu'un autre ne réapparaisse.
      const pool = [preferred];
      const recentKinds = generated.slice(-Math.min(order.length - 1, generated.length)).map(item => item.kind);
      const question = Engine.generateForKinds(pool, {}, rng, { keys: fingerprints, kinds: recentKinds });
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
    if (selectedPreset === "custom") url.searchParams.set("kinds", config.kinds.join(","));
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
    renderMathText(dom.questionText, question.prompt);
    dom.visual.innerHTML = question.visual || "";
    dom.visual.hidden = !question.visual;
    renderQuestionCanvases();
    dom.answerZone.replaceChildren();
    if (config.mode === "qcm") {
      question.choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-button answer-card";
        const letter = document.createElement("span");
        letter.className = "answer-letter";
        letter.textContent = ANSWER_LETTERS[index];
        const text = document.createElement("span");
        text.className = "answer-text";
        renderMathText(text, choice);
        button.append(letter, text);
        button.addEventListener("click", () => {
          answers[currentIndex].value = index;
          dom.answerZone.querySelectorAll(".answer-button").forEach((item, itemIndex) => item.classList.toggle("selected", itemIndex === index));
        });
        dom.answerZone.append(button);
      });
    } else {
      question.choices.forEach((choice, index) => {
        const item = document.createElement("div");
        item.className = "projected-answer answer-card";
        const letter = document.createElement("span");
        letter.className = "answer-letter";
        letter.textContent = ANSWER_LETTERS[index];
        const text = document.createElement("span");
        text.className = "answer-text";
        renderMathText(text, choice);
        item.append(letter, text);
        dom.answerZone.append(item);
      });
      const note = document.createElement("div");
      note.className = "projection-note";
      note.textContent = "Recopier seulement la lettre choisie sur la fiche. La correction sera dévoilée à la fin.";
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
    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
      renderQuestion();
    } else {
      showReview();
    }
  }

  function isCorrect(question, answer) {
    if (settings().mode === "qcm") return answer.value === question.answer;
    return null;
  }

  function showReview() {
    cancelAnimationFrame(timerFrame);
    showScreen("review");
    const mode = settings().mode;
    if (mode === "summary") {
      showProjectionSummary();
      return;
    }
    const results = questions.map((question, index) => isCorrect(question, answers[index]));
    const correct = results.filter(Boolean).length;
    dom.reviewTitle.textContent = `Reprenons les ${questions.length} questions.`;
    dom.reviewList.hidden = false;
    dom.reviewNav.hidden = false;
    dom.projectionSummary.hidden = true;
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
      const correctLetter = ANSWER_LETTERS[question.answer];
      const correctChoice = question.choices[question.answer];
      const studentMarkup = mode !== "qcm" ? "" : Number.isInteger(answer.value)
        ? `<span class="student">Ta réponse est <span class="review-answer-letter">${ANSWER_LETTERS[answer.value]}</span> : <span class="student-answer-text"></span></span>`
        : `<span class="student">Ta réponse : aucune</span>`;
      article.innerHTML = `<div class="review-item-head"><span>Question ${index + 1} · ${escapeHTML(Engine.SKILLS[question.skill])}</span><strong class="review-status">${status}</strong></div>${question.visual ? `<div class="review-visual">${question.visual}</div>` : ""}<div class="review-question"></div><div class="review-answer">${studentMarkup}<strong>La bonne réponse est <span class="review-answer-letter correct">${correctLetter}</span> : <span class="review-correct-text"></span></strong></div><p class="review-explanation"></p>`;
      renderMathText(article.querySelector(".review-question"), question.prompt);
      renderMathText(article.querySelector(".review-correct-text"), correctChoice);
      renderMathText(article.querySelector(".review-explanation"), question.explanation);
      if (mode === "qcm" && Number.isInteger(answer.value)) renderMathText(article.querySelector(".student-answer-text"), question.choices[answer.value]);
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
      if (settings().mode === "projection") {
        showProjectionSummary();
        return;
      }
      showToast(`Correction terminée : chacun peut inscrire son total sur ${questions.length}.`);
      return;
    }
    reviewIndex = Math.max(0, Math.min(lastIndex, reviewIndex + direction));
    showReviewItem();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showProjectionSummary() {
    dom.reviewList.hidden = true;
    dom.reviewNav.hidden = true;
    dom.projectionSummary.hidden = false;
    dom.reviewTitle.textContent = "Résumé des réponses.";
    dom.reviewSummary.textContent = "Les élèves peuvent vérifier une dernière fois les lettres reportées sur leur fiche.";
    dom.projectionSummaryList.replaceChildren();
    questions.forEach((question, index) => {
      const item = document.createElement("div");
      item.className = "projection-summary-item";
      item.setAttribute("aria-label", `Question ${index + 1} : réponse ${ANSWER_LETTERS[question.answer]}`);
      item.innerHTML = `<span>Question ${index + 1}</span><b aria-hidden="true">→</b><strong>${ANSWER_LETTERS[question.answer]}</strong>`;
      dom.projectionSummaryList.append(item);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToCorrections() {
    dom.projectionSummary.hidden = true;
    dom.reviewList.hidden = false;
    dom.reviewNav.hidden = false;
    dom.reviewTitle.textContent = `Reprenons les ${questions.length} questions.`;
    dom.reviewSummary.textContent = "Corrigez chaque réponse avec une autre couleur, puis ajoutez un point lorsque le résultat est juste.";
    showReviewItem();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function renderQuestionCanvases(root = dom.visual) {
    root.querySelectorAll("canvas[data-plot='quadratic']").forEach(canvas => {
      const width = Math.max(260, Math.min(780, Math.round(canvas.getBoundingClientRect().width || 620)));
      const height = Math.round(Math.max(210, width * 0.48));
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * ratio; canvas.height = height * ratio; canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d"); context.scale(ratio, ratio);
      const margin = 28, xMin = -6, xMax = 6, yMin = -8, yMax = 12;
      const px = x => margin + (x - xMin) / (xMax - xMin) * (width - margin * 2);
      const py = y => height - margin - (y - yMin) / (yMax - yMin) * (height - margin * 2);
      const a = Number(canvas.dataset.coefficient), left = Number(canvas.dataset.rootLeft), right = Number(canvas.dataset.rootRight);
      const curve = x => a * (x - left) * (x - right);
      context.clearRect(0, 0, width, height); context.fillStyle = "#fff"; context.fillRect(0, 0, width, height);
      context.lineWidth = 1; context.font = "11px system-ui, sans-serif"; context.textAlign = "center"; context.textBaseline = "top";
      for (let x = xMin; x <= xMax; x += 1) { context.strokeStyle = x === 0 ? "#171717" : "#d8d8d8"; context.beginPath(); context.moveTo(px(x), margin); context.lineTo(px(x), height - margin); context.stroke(); if (x !== 0) { context.fillStyle = "#444"; context.fillText(x < 0 ? `−${Math.abs(x)}` : String(x), px(x), py(0) + 5); } }
      context.textAlign = "right"; context.textBaseline = "middle";
      for (let y = yMin; y <= yMax; y += 2) { context.strokeStyle = y === 0 ? "#171717" : "#d8d8d8"; context.beginPath(); context.moveTo(margin, py(y)); context.lineTo(width - margin, py(y)); context.stroke(); if (y !== 0) { context.fillStyle = "#444"; context.fillText(y < 0 ? `−${Math.abs(y)}` : String(y), px(0) - 5, py(y)); } }
      context.save(); context.beginPath(); context.rect(margin, margin, width - margin * 2, height - margin * 2); context.clip(); context.strokeStyle = "#7257e8"; context.lineWidth = 4; context.beginPath();
      for (let step = 0; step <= 240; step += 1) { const x = xMin + (xMax - xMin) * step / 240; if (step === 0) context.moveTo(px(x), py(curve(x))); else context.lineTo(px(x), py(curve(x))); } context.stroke(); context.restore();
      context.fillStyle = "#dc3f67"; [left, right].forEach(rootValue => { context.beginPath(); context.arc(px(rootValue), py(0), 5, 0, Math.PI * 2); context.fill(); });
    });
    root.querySelectorAll("canvas[data-plot='line']").forEach(canvas => {
      const width = Math.max(260, Math.min(780, Math.round(canvas.getBoundingClientRect().width || 620)));
      const height = Math.round(Math.max(210, width * 0.48));
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      context.scale(ratio, ratio);
      const margin = 28;
      const xMin = -4, xMax = 4, yMin = -6, yMax = 6;
      const px = x => margin + (x - xMin) / (xMax - xMin) * (width - margin * 2);
      const py = y => height - margin - (y - yMin) / (yMax - yMin) * (height - margin * 2);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.lineWidth = 1;
      context.font = "11px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";
      for (let x = xMin; x <= xMax; x += 1) {
        context.strokeStyle = x === 0 ? "#171717" : "#d8d8d8";
        context.beginPath(); context.moveTo(px(x), margin); context.lineTo(px(x), height - margin); context.stroke();
        if (x !== 0) { context.fillStyle = "#444"; context.fillText(x < 0 ? `−${Math.abs(x)}` : String(x), px(x), py(0) + 5); }
      }
      context.textAlign = "right";
      context.textBaseline = "middle";
      for (let y = yMin; y <= yMax; y += 1) {
        context.strokeStyle = y === 0 ? "#171717" : "#d8d8d8";
        context.beginPath(); context.moveTo(margin, py(y)); context.lineTo(width - margin, py(y)); context.stroke();
        if (y !== 0 && y % 2 === 0) { context.fillStyle = "#444"; context.fillText(y < 0 ? `−${Math.abs(y)}` : String(y), px(0) - 5, py(y)); }
      }
      if (canvas.dataset.level !== undefined) {
        const level = Number(canvas.dataset.level);
        context.setLineDash([6, 5]); context.strokeStyle = "#dc3f67";
        context.beginPath(); context.moveTo(margin, py(level)); context.lineTo(width - margin, py(level)); context.stroke(); context.setLineDash([]);
      }
      const slope = Number(canvas.dataset.slope), intercept = Number(canvas.dataset.intercept);
      context.save(); context.beginPath(); context.rect(margin, margin, width - margin * 2, height - margin * 2); context.clip();
      context.lineWidth = 4; context.strokeStyle = "#7257e8"; context.beginPath();
      context.moveTo(px(xMin), py(slope * xMin + intercept)); context.lineTo(px(xMax), py(slope * xMax + intercept)); context.stroke(); context.restore();
      context.fillStyle = "#13b8c4"; context.beginPath(); context.arc(px(0), py(intercept), 4, 0, Math.PI * 2); context.fill();
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
    const sharedKinds = (params.get("kinds") || "").split(",").filter(kind => Engine.SUBSKILLS.some(subskill => subskill.id === kind));
    if (!params.has("seed") || (!sharedSkills.length && !sharedKinds.length)) return;
    seed = params.get("seed");
    const count = params.get("n"), duration = params.get("t"), mode = params.get("mode");
    if ([...dom.count.options].some(option => option.value === count)) dom.count.value = count;
    if ([...dom.duration.options].some(option => option.value === duration)) dom.duration.value = duration;
    const modeInput = document.querySelector(`input[name="answer-mode"][value="${mode}"]`);
    if (modeInput) modeInput.checked = true;
    selectPreset("custom");
    dom.skillList.querySelectorAll("input").forEach(input => { input.checked = sharedKinds.length ? sharedKinds.includes(input.value) : sharedSkills.includes(input.dataset.skill); });
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
  dom.backToCorrections.addEventListener("click", returnToCorrections);
  dom.newSeries.addEventListener("click", () => { seed = ""; history.replaceState(null, "", window.location.pathname); showScreen("setup"); });
  window.addEventListener("resize", () => !dom.series.hidden && renderQuestionCanvases());
  document.addEventListener("keydown", event => {
    if (dom.series.hidden || paused || event.metaKey || event.ctrlKey || event.altKey) return;
    if (settings().mode === "qcm" && ["1","2","3","4"].includes(event.key)) dom.answerZone.querySelectorAll(".answer-button")[Number(event.key) - 1]?.click();
    if (event.key === "Enter" && (settings().mode === "projection" || answers[currentIndex].value !== null)) nextQuestion();
    if (event.key === " ") { event.preventDefault(); pauseSeries(); }
  });

  optionSkills();
  const updateSheetLink = () => { if (dom.sheetLink) dom.sheetLink.href = `fiche.html?n=${encodeURIComponent(dom.count.value)}`; };
  dom.count.addEventListener("change", updateSheetLink);
  updateSheetLink();
  loadURLSettings();
})();
