# Life's a Gamble

Jeu de bluff et de roulette russe dans un bar. Mode **Liar**, de 1 à 4 joueurs humains, en ligne, avec des IA pour compléter la table.

## Mettre le jeu en ligne avec GitHub Pages (5 minutes)

1. Sur github.com, clique sur **New repository**. Nomme-le par exemple `lifes-a-gamble`, laisse-le en **Public**, puis clique sur **Create repository**.
2. Dans le dépôt, clique sur **Add file → Upload files** et glisse `index.html` (et ce `README.md` si tu veux). Valide avec **Commit changes**.
3. Va dans **Settings → Pages**. Sous **Branch**, choisis `main` et le dossier `/ (root)`, puis clique sur **Save**.
4. Attends environ une minute. Ton jeu est en ligne à l'adresse :
   `https://TON-PSEUDO.github.io/lifes-a-gamble/`

Pour mettre à jour le jeu plus tard, il suffit de réuploader `index.html` dans le dépôt.

## Jouer à plusieurs

1. **L'hôte** ouvre le site, clique sur **Créer un salon** et entre son pseudo.
2. Il partage le **code à 4 caractères**, le **lien** ou le **QR code** affiché.
3. **Les autres joueurs** ouvrent le lien (ou cliquent sur **Rejoindre un salon** et tapent le code). Ils entrent leur pseudo et choisissent un personnage.
4. Les joueurs apparaissent dans le salon au fur et à mesure qu'ils arrivent. L'hôte clique sur **Fermer le salon et jouer** quand il veut. Les places vides sont prises par des IA.

Ça marche sur téléphone comme sur ordinateur, en Wi-Fi ou en 4G/5G, sans rien installer.

## Bon à savoir

- **L'hôte doit garder sa page ouverte.** La partie tourne sur son appareil. S'il ferme l'onglet, la partie s'arrête pour tout le monde. Sur téléphone, l'hôte doit éviter de verrouiller l'écran ou de changer d'application.
- **Déconnexion d'un joueur** : après environ 12 secondes sans réponse, une IA prend sa place. S'il rouvre le lien, il récupère sa place.
- **Joueur absent** : l'hôte peut cliquer sur **Remplacer par une IA** sous le portrait d'un joueur.
- **Triche** : chaque joueur ne reçoit que ses propres cartes. Personne ne peut voir la main des autres dans le code de la page, sauf l'hôte, dont l'appareil fait tourner la partie.
- **Connexion impossible** : les appareils se connectent directement entre eux (WebRTC, via le service gratuit PeerJS pour la mise en relation). Sur certains réseaux très verrouillés (Wi-Fi d'entreprise ou d'école, certains opérateurs), la connexion peut échouer. Essayer avec un autre réseau, par exemple en partage de connexion, règle en général le problème.

## Fichiers

- `index.html` contient tout le jeu : moteur, IA, réseau, graphismes et sons. Aucune autre ressource n'est nécessaire, à part les polices Google, la bibliothèque PeerJS et le générateur de QR code, chargés depuis Internet.
