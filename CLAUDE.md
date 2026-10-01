# Life's a Gamble : fiche projet

Jeu de bluff et de roulette russe dans un bar, au style graphique inspiré de Persona (collage de lettres, rouge, noir et blanc, angles inclinés). Interface et textes en français.

- Jeu en ligne : https://framagstudio.github.io/lifes-a-gamble/
- Dépôt : https://github.com/framagstudio/lifes-a-gamble (GitHub Pages, branche `main`, dossier racine)

## Structure du code

`index.html` est le seul fichier servi, et il est **généré**. Il ne faut pas le modifier à la main : on modifie `src/`, puis on lance `python3 src/build.py`.

| Fichier | Rôle |
|---|---|
| `src/head.html` | `<head>` : polices Google (Anton, Barlow Condensed), PeerJS 1.5.4 (unpkg), qrcodejs 1.0.0 (cdnjs) |
| `src/style.css` | Tout le CSS (thème sombre unique, mise en page bureau et téléphone) |
| `src/body.html` | Le balisage : scène du bar, écrans (titre, solo, profil, salon, fin), fenêtre modale, règles |
| `src/core.js` | Données (personnages, cartes), **moteur de jeu** et **IA**. Ne touche pas au DOM, ce qui permet de le tester dans Node |
| `src/ui.js` | Rendu, animations, sons (WebAudio), écrans, **réseau** (hôte et client PeerJS) |

## Architecture

- Le **moteur tourne uniquement chez l'hôte**, ou localement en solo. Il communique par `HOOK` :
  - `emit(ev)` envoie des événements d'animation à tous les joueurs ;
  - `sync()` envoie l'état, construit par `stateFor(place)`, qui ne contient que la main du joueur concerné ;
  - `ask` / `cancelAsk` gèrent les demandes adressées à un joueur.
- Chaque place est de type `local`, `remote` ou `ai`. `input(i, kind, data, ms)` gère les trois cas.
  - Les types de demande sont `play`, `accuse` et `target`. Aucune n'a de délai. Pour `target`, le joueur touche une cible (jamais lui-même) puis confirme avec « Tirer sur… ».
- En cas de déconnexion (battement de cœur toutes les 3 s, coupure après 12 s), `seatToAI(i)` fait jouer une IA à la place. Le joueur se reconnecte grâce à un jeton stocké dans le `localStorage`.
- Les places autour de la table sont tirées au hasard à chaque partie, relances comprises (`beginHostGame`). La place de l'hôte n'est donc pas forcément la 0.
- Les identifiants PeerJS sont de la forme `lifesagamble-v1-` suivis du code de salon à 4 caractères. Le lien de partage est `…/#CODE`.

## Règles du mode Liar (telles que validées par le créateur)

- Le paquet compte 12 cartes : 5 Rois, 5 Reines, 1 Maître et 1 Chaos. Chaque survivant reçoit 3 cartes, et une figure de table (Rois ou Reines) est tirée par manche.
- À son tour, on pose une carte face cachée en annonçant la figure de table. Le Maître et le Chaos sont toujours des mensonges.
- **Seul le joueur suivant** peut crier « Menteur », sans limite de temps pour décider.
- **Toute accusation termine la manche**, qu'elle soit juste ou non : on redistribue.
- Selon la carte retournée :
  - vérité : l'accusateur se tire dessus ;
  - mensonge : l'accusateur tire sur qui il veut ;
  - Maître : celui qui l'a posée tire sur qui il veut ;
  - Chaos : tout le monde tire en même temps.
- Le revolver a 6 chambres et 1 balle. Il est rechargé après une balle réelle. Le dernier joueur en vie gagne.

## IA

- `estimatePlay` simule environ 700 mains possibles du joueur précédent, à partir des cartes que l'IA ne voit pas et de la tendance au bluff observée chez ce joueur.
- `aiShouldAccuse` compare l'espérance d'accuser et celle de laisser passer. Elle tient compte du risque de sa propre arme, du Maître, du Chaos et de la qualité de sa main.
- Les personnalités (`bluff`, `aggr`, `speed`) sont définies par personnage dans `CHARS`.

## Personnages

Ce sont des créations **originales** : Señor Oro, Don Velluto, La Comandante et Major Krupp. Le créateur avait demandé des versions cartoon de personnes réelles ou de personnages protégés, ce qui n'est pas possible. Il ne faut pas les faire ressembler à Pablo Escobar, au Parrain, à Che Guevara ou à Rambo.

## Tester

- Moteur : charger `src/core.js` dans Node avec `vm.runInThisContext`, remplacer les `HOOK` par des fonctions factices, puis lancer `engNew(...)` et `engRun()` avec 4 IA.
- Multijoueur : un serveur PeerJS local et plusieurs pages Chromium (Playwright). Dans le bac à sable, il faut donner un identifiant explicite aux clients.

## Idées pour la suite

- D'autres modes de jeu, évoqués par le créateur.
- Un relais TURN pour les réseaux très verrouillés.
- Un réglage de difficulté pour les IA.
