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
assert.doesNotMatch(html, /href="\.\.\/atelier-automatismes|Retour au jeu|NEXUS 1re/, "la page ne doit pas renvoyer vers NEXUS");
assert.match(app, /Engine\.generateForKinds/, "les questions doivent venir du moteur NEXUS réutilisé");
assert.match(app, /seededRandom/, "un lien partagé doit reproduire la même série");
assert.match(app, /showReview/, "une correction finale doit être disponible");
assert.match(app, /showReviewItem/, "la correction doit être projetée question par question");
assert.match(app, /review-visual/, "les graphiques et programmes doivent être répétés pendant la correction");
assert.match(app, /projection/, "le mode sans réponses proposées doit exister");
assert.match(app, /quickStart/, "le rituel par défaut doit pouvoir démarrer en un clic");
assert.match(engine, /14100|KIND_GENERATORS|SUBSKILLS/, "le catalogue complet doit être embarqué");
assert.match(html, /fiche\.html/, "la fiche élève doit être accessible depuis l'exerciseur");
assert.equal((sheet.match(/class="session"/g) || []).length, 4, "la fiche doit proposer quatre séances");
assert.match(sheet, /Date :/, "chaque grille doit permettre d'inscrire la date");
assert.match(sheet, /Score : ____ \/ 6/, "chaque grille doit permettre de compter les points");
assert.match(sheetStyles, /@page[^]*A4 portrait/, "la fiche doit être préparée pour une impression A4");
console.log("Exerciseur autonome : structure et confidentialité validées.");
