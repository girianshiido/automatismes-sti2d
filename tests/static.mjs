import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const engineAPI = require("../question-engine.js");

const [html, app, engine, sheet, sheetStyles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../question-engine.js", import.meta.url), "utf8"),
  readFile(new URL("../fiche.html", import.meta.url), "utf8"),
  readFile(new URL("../fiche.css", import.meta.url), "utf8")
]);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, "les identifiants HTML doivent être uniques");
for (const id of [...app.matchAll(/\$\("#([^"]+)"\)/g)].map(match => match[1])) assert.ok(ids.includes(id), `élément #${id} manquant`);
assert.match(html, /noindex, nofollow, noarchive/, "la page ne doit pas être indexée");
assert.doesNotMatch(html, /href="\.\.\/atelier-automatismes|Retour au jeu|NEXUS 1re|NEXUS/i, "l'application ne doit pas mentionner une autre application");
assert.match(app, /Engine\.generateForKinds/, "les questions doivent venir du moteur embarqué");
assert.match(app, /seededRandom/, "un lien partagé doit reproduire la même série");
assert.match(app, /showReview/, "une correction finale doit être disponible");
assert.match(app, /showReviewItem/, "la correction doit être projetée question par question");
assert.match(app, /review-visual/, "les graphiques et programmes doivent être répétés pendant la correction");
assert.match(html, /QCM projeté/, "le QCM projeté doit être proposé");
assert.match(html, /QCM individuel/, "le QCM individuel doit être proposé");
assert.equal((html.match(/name="answer-mode"/g) || []).length, 3, "les trois modes de réponse doivent être proposés");
assert.match(html, /value="projection" checked/, "le QCM projeté doit être le mode par défaut");
assert.doesNotMatch(html + app + (await readFile(new URL("../styles.css", import.meta.url), "utf8")), /value="free"|free-answer|Réponse libre/, "le mode réponse libre ne doit pas réapparaître");
assert.match(app, /ANSWER_LETTERS = \["A", "B", "C", "D"\]/, "les choix doivent être repérés par les lettres A à D");
assert.match(app, /projected-answer answer-card/, "les réponses du QCM projeté doivent être visibles sans être des boutons");
assert.match(app, /answer-button answer-card/, "les réponses du QCM individuel doivent rester cliquables");
assert.match(app, /La bonne réponse est/, "la correction doit annoncer clairement la bonne réponse");
assert.match(app, /review-answer-letter correct/, "la bonne lettre doit être encerclée dans la correction");
assert.match(app, /showProjectionSummary/, "un résumé final doit être disponible en projection");
assert.match(html, /id="projection-summary"/, "l'écran de résumé projeté doit exister");
assert.match(app, /Question \$\{index \+ 1\}.*ANSWER_LETTERS\[question\.answer\]/s, "le résumé doit associer chaque question à sa lettre correcte");
assert.match(app, /total sur \$\{questions\.length\}/, "le total doit utiliser le nombre réel de questions");
assert.match(app, /function renderMathText/, "le rendu mathématique doit être embarqué");
assert.match(app, /function renderPromptText/, "les données et la question doivent pouvoir être séparées automatiquement");
assert.equal((app.match(/renderPromptText\([^,]+, question\.prompt\)/g) || []).length, 2, "le saut avant la question doit fonctionner pendant la série et la correction");
assert.ok(app.includes('.replace(/([A-Za-zÀ-ÿ])-(?=[A-Za-zÀ-ÿ])/g, "$1‑")'), "les mots reliés par un trait d'union doivent rester insécables");
assert.match(app, /math-inline-fraction/, "les fractions doivent bénéficier du rendu mathématique amélioré");
assert.match(app, /math-set-operator/, "les opérateurs d'ensembles doivent bénéficier d'un rendu mathématique lisible");
assert.match(app, /\[A-Z\]\\s\*\=\\s\*\\\{\[\^\{\}\]\+\\\}/, "chaque nom d'ensemble doit rester attaché à son contenu");
assert.match(engine, /\.\\n\$\{mode === "intersection"/, "les données et la question sur les ensembles doivent être sur deux lignes");
assert.match(app, /context\.fillText/, "les graphiques doivent afficher leurs graduations");
assert.match(engine, /quadratic-sign-reading/, "une lecture graphique parabolique doit être proposée");
assert.match(engine, /const coefficient = pick\(\[-1, 1\], rng\)/, "les paraboles doivent rester visibles dans les deux orientations");
assert.match(engine, /value \/ maximum \* 86/, "les diagrammes en barres doivent réserver une marge aux étiquettes supérieures");
assert.match(engine, /P_A\(B\).*P_Ā\(B\)/s, "les probabilités conditionnelles doivent utiliser des événements majuscules en indice");
assert.doesNotMatch(engine, /P\(B\|A\)|P\(B\|Ā\)|Pₐ/, "les anciennes notations conditionnelles ne doivent plus apparaître");
assert.match(engine, /formatNumber\(pA\)\} ; P_A\(B\)/, "les données probabilistes décimales doivent être séparées par un point-virgule");
assert.match(engine, /const exactProbability = fraction\(numerator, denominator\)/, "les probabilités issues d'un tableau doivent être données exactement");
assert.match(engine, /Donner une fraction irréductible/, "les probabilités issues d'un tableau doivent annoncer la forme attendue");
assert.match(engine, /Dans un tableur, on teste la ligne \$\{row\}\. Quelle formule renvoie VRAI si la valeur de \$\{firstColumn\}\$\{row\}/, "les filtres de tableur doivent annoncer la cellule effectivement testée");
assert.match(app, /choice\.length > 36 \? " long-answer"/, "les réponses longues doivent être adaptées dans les deux modes");
assert.match(app, /subskill\.label \|\| subskill\.id\} · \$\{subskill\.id\}/, "la sélection personnelle doit distinguer chaque format");
assert.match(await readFile(new URL("../styles.css", import.meta.url), "utf8"), /\.math-radical-sign::before/, "les styles de rendu mathématique doivent être présents");
assert.match(app, /quickStart/, "le rituel par défaut doit pouvoir démarrer en un clic");
assert.match(engine, /14100|KIND_GENERATORS|SUBSKILLS/, "le catalogue complet doit être embarqué");
assert.match(engine, /Object\.keys\(KIND_GENERATORS\)\.filter\(id => COMMON_KIND_IDS\.has\(id\)\)/, "le catalogue visible doit exclure les générateurs de spécialité");
assert.ok(engineAPI.SUBSKILLS.every(subskill => !String(subskill.origin).startsWith("Spécialité")), "aucun contenu de spécialité ne doit être exposé dans l'exerciseur");
assert.ok(!engineAPI.SUBSKILLS.some(subskill => subskill.id === "euler-step"), "la méthode d'Euler ne doit pas apparaître dans l'exerciseur commun");
assert.match(html, /fiche\.html/, "la fiche élève doit être accessible depuis l'exerciseur");
assert.equal((sheet.match(/class="session"/g) || []).length, 8, "la fiche doit proposer huit séances");
assert.doesNotMatch(sheet, /Nom\s*:|Prénom\s*:/, "la fiche collée au cahier ne doit pas réserver de zone nominative");
assert.match(sheet, /Date :/, "chaque grille doit permettre d'inscrire la date");
assert.match(sheet, /lettre A, B, C ou D/, "la fiche doit indiquer que les élèves reportent une lettre");
assert.match(sheet, /Score : ____ \/ 6/, "chaque grille doit permettre de compter les points");
assert.match(sheetStyles, /@page[^]*A4 portrait/, "la fiche doit être préparée pour une impression A4");
console.log("Exerciseur autonome : structure et confidentialité validées.");
