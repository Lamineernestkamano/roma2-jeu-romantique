# ROMA2 — Jeu romantique avec réponses enregistrées

## Installation locale

1. Installer Node.js 20 ou plus récent.
2. Ouvrir un terminal dans ce dossier.
3. Exécuter :

npm install

4. Copier `.env.example` vers `.env`.
5. Modifier `.env` avec ton email et tes identifiants SMTP.
6. Lancer :

npm start

7. Ouvrir :

http://localhost:3000

## Page privée

Remplace `CHANGE_MOI_AVEC_UN_MOT_DE_PASSE_LONG_ET_SECRET` dans `.env` par un mot de passe secret.

Ensuite ouvre :

http://localhost:3000/admin?token=TON_MOT_DE_PASSE

## Gmail

Pour Gmail, utilise une adresse Gmail et un mot de passe d'application Google dans `SMTP_PASS`. N'utilise pas le mot de passe normal de ton compte Google.

## Déploiement

Le projet nécessite un hébergement capable d'exécuter Node.js et de conserver les fichiers persistants, car SQLite stocke les réponses dans `responses.db`.

Variables d'environnement à configurer sur l'hébergeur :

PORT
DB_PATH
ADMIN_TOKEN
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
MAIL_FROM
NOTIFY_EMAIL

Le lien public sera l'URL fournie par ton hébergeur.
