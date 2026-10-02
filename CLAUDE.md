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
| `src/music.js` | Musique des menus : thème original « Last Call » (acid-jazz), synthétisé en WebAudio, joué en boucle du menu jusqu'au lancement d'une partie |
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

## Modes de jeu

- Les modes sont déclarés dans `MODES` (`src/core.js`). Chaque mode a ses règles dans un `<template id="rules-<id>">` de `src/body.html`.
- Le mode est choisi sur l'écran `scr-mode`, qui s'ouvre au moment de créer un salon ou de lancer le solo. Il passe ensuite par `PICKED_MODE`, `NET.mode`, `engNew(seats, mode)` et `E.mode`, puis il est affiché dans le salon et dans la barre du haut.
- Chaque mode déclare son paquet (`deck`), la taille de main (`hand`), le nombre maximum de cartes posées par tour (`maxPlay`) et les figures de table possibles (`tables`). La résolution d'une accusation passe par `resolveChaos` ou `resolveClassic`.
- Une pose est une entrée `{cards:[...], by, revealed}`. La demande `play` renvoie un **tableau d'indices**, validé par `validPlay` (1 à `maxPlay` cartes).
- Modes disponibles : `chaos-liar` (« Chaos Liar ») et `classic-liar` (« Classic Liar »). Une carte « Bientôt » annonce les suivants.

## Règles du mode Chaos Liar (telles que validées par le créateur)

- Le paquet compte 12 cartes : 5 Rois, 5 Reines, 1 Maître et 1 Chaos. Chaque survivant reçoit 3 cartes, et une figure de table (Rois ou Reines) est tirée par manche.
- À son tour, on pose une carte face cachée en annonçant la figure de table. Le Maître et le Chaos sont toujours des mensonges.
- **Seul le joueur suivant** peut crier « Menteur », sans limite de temps pour décider.
- Le **dernier joueur qui a encore des cartes** ne peut pas poser : il doit accuser la dernière carte posée (`soleHolder`, `forcedAccuseNotice`).
- **Toute accusation termine la manche**, qu'elle soit juste ou non : on redistribue.
- Selon la carte retournée :
  - vérité : l'accusateur se tire dessus ;
  - mensonge : l'accusateur tire sur qui il veut ;
  - Maître : celui qui l'a posée tire sur qui il veut ;
  - Chaos : tout le monde tire en même temps.
- Le premier joueur de la partie est tiré au hasard. À chaque manche suivante, c'est le joueur après le premier joueur de la manche précédente qui commence, en sautant les éliminés.
- Pendant les tirs, tout le monde voit en direct qui vise qui. La visée en cours est en pointillés fins avec « … », la visée validée est en trait épais avec « ✓ ». Événement `aimset`, message client `aiming`, fonction `engAimPreview`.
- Le revolver a 6 chambres et 1 balle. Il est rechargé après une balle réelle. Le dernier joueur en vie gagne.

## Règles du mode Classic Liar (inspiré de Liar's Deck, le jeu de cartes de Liar's Bar)

- Le paquet compte 20 cartes : 6 Rois, 6 Reines, 6 As et 2 Jokers. Pas de carte du Diable : le créateur l'a retirée. Chaque survivant reçoit 5 cartes. La figure de table (Rois, Reines ou As) est tirée à chaque manche.
- On pose de 1 à 3 cartes en annonçant qu'elles sont toutes la figure de table. Les Jokers comptent toujours comme la figure de table. Une seule mauvaise carte suffit pour que la pose soit un mensonge.
- Seul le joueur suivant peut accuser. Le dernier joueur à avoir des cartes doit accuser. Toute accusation termine la manche.
- Selon la carte retournée :
  - mensonge : le menteur passe à la roulette (il tire sur lui-même) ;
  - vérité : l'accusateur passe à la roulette.
- On ne tire jamais sur un adversaire. Celui qui vient de passer à la roulette commence la manche suivante (`E.nextStarter`), ou le joueur d'après s'il est mort.

## IA

- `estimatePlay` simule environ 700 mains possibles du joueur précédent, à partir des cartes que l'IA ne voit pas et de la tendance au bluff observée chez ce joueur.
- `aiShouldAccuse` compare l'espérance d'accuser et celle de laisser passer. Elle tient compte du risque de sa propre arme, du Maître, du Chaos et de la qualité de sa main.
- Classic Liar : `estimateClassic` est une estimation pondérée (bayésienne). Elle tire des mains de 5 cartes, puis pondère chaque main selon la probabilité qu'elle produise exactement le nombre de cartes posées, en disant vrai ou en bluffant. `aiChooseClassic` pose surtout la vérité et bluffe selon la personnalité.
- Les personnalités (`bluff`, `aggr`, `speed`) sont définies par personnage dans `CHARS`.

## Musique

- Le morceau ne garde que la batterie, la basse et le piano électrique. Le saxo et les cuivres aigus ont été retirés à la demande du créateur.
- À l'ouverture, un écran « Appuie pour entrer » (`#splash`) récupère le premier geste, indispensable pour que les navigateurs autorisent le son, et lance la musique. `unlock` réessaie à chaque geste tant que l'audio n'est pas débloqué (iOS).
- `Music.start()` et `Music.stop()` sont appelés dans `ui.js` : la musique démarre au premier appui, s'arrête dans `startSolo`, `beginHostGame` et à la réception de `start` côté client, puis reprend dans `toMenu`. Le bouton `#btn-music` permet de couper le son sur les écrans de menu.
- Le créateur voulait « Life Will Change » de Persona 5. C'est impossible (œuvre protégée), donc on ne l'imite pas : le thème est une composition originale dans le même genre.

## Personnages

Ce sont des créations **originales** : Señor Oro, Don Velluto, La Comandante et Major Krupp. Le créateur avait demandé des versions cartoon de personnes réelles ou de personnages protégés, ce qui n'est pas possible. Il ne faut pas les faire ressembler à Pablo Escobar, au Parrain, à Che Guevara ou à Rambo.

## Tester

- Moteur : charger `src/core.js` dans Node avec `vm.runInThisContext`, remplacer les `HOOK` par des fonctions factices, puis lancer `engNew(...)` et `engRun()` avec 4 IA.
- Multijoueur : un serveur PeerJS local et plusieurs pages Chromium (Playwright). Dans le bac à sable, il faut donner un identifiant explicite aux clients.

## Idées pour la suite

- D'autres modes de jeu (ajouter une entrée dans `MODES` et un template de règles).
- Un relais TURN pour les réseaux très verrouillés.
- Un réglage de difficulté pour les IA.
