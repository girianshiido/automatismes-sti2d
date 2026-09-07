# Automatismes STI2D

Exerciseur autonome construit à partir du générateur de questions de NEXUS 1re.

Le moteur embarqué a été resynchronisé avec la version auditée de NEXUS le 7 septembre 2026. L'interface de projection reste volontairement indépendante.

L'exerciseur propose uniquement deux modes :

- **QCM projeté** (par défaut) : les quatre choix A, B, C et D sont visibles mais non cliquables ; les élèves reportent une lettre sur leur fiche.
- **QCM individuel** : les mêmes choix sont cliquables et le score est calculé automatiquement.

Pendant la correction, la bonne lettre est encerclée et accompagnée du résultat. Le mode projeté se termine par un résumé des lettres correctes.

Le rendu mathématique de NEXUS est également repris : fractions empilées, indices et exposants alignés, racines, vecteurs et graphiques gradués. Les couleurs sont adaptées au fond clair de l'exerciseur.

- Aucun fichier du jeu NEXUS n'est appelé ou modifié.
- Aucun lien vers cet exerciseur n'est ajouté dans NEXUS.
- La page demande aux moteurs de recherche de ne pas l'indexer.
- Le projet n'est pas publié automatiquement.

Ouvrir `index.html` dans un navigateur ou servir ce dossier avec un serveur statique local.

Les liens de série contiennent un identifiant aléatoire et les réglages choisis. Ils permettent de recréer la même série de questions sur une autre machine une fois le dossier hébergé à une adresse distincte.

`fiche.html` fournit une fiche élève A4 : quatre séances de six questions avec date, réponse personnelle, correction et score sur 6.
