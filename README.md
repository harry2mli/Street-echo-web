# Street Echo — Barcelone V1 (prototype web)

Ceci est une **première base réelle de prototype web 3D**, pas le jeu final prévu. Elle comprend :
- scène 3D générée par code avec rues, bâtiments, arbres, place centrale et stade stylisé ;
- personnage contrôlable à pied ;
- personnage Sarah qui suit le joueur ;
- voiture stylisée conduisible ;
- commandes tactiles et clavier ;
- caméra à la troisième personne ;
- sauvegarde locale de position ;
- manifest PWA et service worker de base.

## Important
- Le moteur Three.js est chargé depuis jsDelivr : connexion Internet nécessaire au premier chargement.
- Les ressources 3D sont provisoires et générées par code. Il ne s'agit pas d'une carte exacte de Barcelone ni d'une reproduction officielle du Camp Nou.
- Pas encore de vrais modèles haute résolution, de missions complètes, de bâtiments réellement visitables, de trafic/PNJ avancés, ni de compilation APK.
- Aucun système de poursuite policière n'est inclus.

## Lancer localement
Un navigateur bloque parfois les modules JavaScript depuis `file://`. Il faut servir le dossier par un serveur web local ou le publier sur un hébergement statique HTTPS.

## Hébergement gratuit
1. Créer un dépôt GitHub et téléverser les fichiers de ce dossier.
2. Dans **Settings → Pages**, choisir la branche principale et le dossier racine.
3. Attendre l'URL HTTPS fournie par GitHub Pages.
4. Ouvrir cette URL dans Chrome Android. Pour installer, menu Chrome → « Ajouter à l'écran d'accueil » (si proposé).

GitHub Pages est un service tiers ; ses conditions et limites peuvent changer. Le projet lui-même n'utilise aucune API payante.

## Commandes
- Clavier : W/A/S/D ou flèches pour bouger ; E pour entrer/sortir de la voiture ; C pour changer de caméra.
- Mobile : pavé tactile à gauche, boutons d'action à droite.
