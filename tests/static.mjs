import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
assert.match(app, /math-inline-fraction/, "les fractions doivent bénéficier du rendu mathématique amélioré");
assert.match(app, /context\.fillText/, "les graphiques doivent afficher leurs graduations");
assert.match(await readFile(new URL("../question-engine.js", import.meta.url), "utf8"), /quadratic-sign-reading/, "une lecture graphique parabolique doit être proposée");
assert.match(await readFile(new URL("../question-engine.js", import.meta.url), "utf8"), /pick\(\[-2, -1, 1, 2\], rng\)/, "les paraboles doivent pouvoir être orientées vers le haut ou vers le bas");
assert.match(app, /subskill\.label \|\| subskill\.id\} · \$\{subskill\.id\}/, "la sélection personnelle doit distinguer chaque format");
assert.match(await readFile(new URL("../styles.css", import.meta.url), "utf8"), /\.math-radical-sign::before/, "les styles de rendu mathématique doivent être présents");
assert.match(app, /quickStart/, "le rituel par défaut doit pouvoir démarrer en un clic");
assert.match(engine, /14100|KIND_GENERATORS|SUBSKILLS/, "le catalogue complet doit être embarqué");
assert.match(html, /fiche\.html/, "la fiche élève doit être accessible depuis l'exerciseur");
assert.equal((sheet.match(/class="session"/g) || []).length, 8, "la fiche doit proposer huit séances");
assert.doesNotMatch(sheet, /Nom\s*:|Prénom\s*:/, "la fiche collée au cahier ne doit pas réserver de zone nominative");
assert.match(sheet, /Date :/, "chaque grille doit permettre d'inscrire la date");
assert.match(sheet, /lettre A, B, C ou D/, "la fiche doit indiquer que les élèves reportent une lettre");
assert.match(sheet, /Score : ____ \/ 6/, "chaque grille doit permettre de compter les points");
assert.match(sheetStyles, /@page[^]*A4 portrait/, "la fiche doit être préparée pour une impression A4");
console.log("Exerciseur autonome : structure et confidentialité validées.");
