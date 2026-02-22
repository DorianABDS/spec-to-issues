# Spec → Issues · Workers Studio

Transforme tes GDD et cahiers des charges en issues GitHub via Claude AI.

## Stack
- **Backend** : Node.js + Express (JavaScript pur)
- **Frontend** : HTML/CSS/JS vanilla
- **IA** : Claude API (Anthropic)
- **Auth** : GitHub OAuth 2.0

---

## Déploiement

### 1. Backend → Render

1. Va sur [render.com](https://render.com) → New → Web Service
2. Connecte ton repo GitHub
3. Configure :
   - **Root Directory** : `backend`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. Ajoute les variables d'environnement :
   - `ANTHROPIC_API_KEY` → [console.anthropic.com](https://console.anthropic.com)
   - `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` → GitHub OAuth App
   - `JWT_SECRET` → chaîne aléatoire longue
   - `FRONTEND_URL` → `https://issues.abbadessa-dorian.fr`
   - `BACKEND_URL` → ton URL Render (ex: `https://spec-to-issues.onrender.com`)

### 2. GitHub OAuth App

Sur [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App :
- **Homepage URL** : `https://issues.abbadessa-dorian.fr`
- **Callback URL** : `https://TON-SERVICE.onrender.com/api/auth/github/callback`

### 3. Frontend → Hostinger

1. Ouvre `frontend/js/app.js` et remplace la ligne :
   ```js
   : '/api'; // Render backend URL — update this after deploy
   ```
   par :
   ```js
   : 'https://TON-SERVICE.onrender.com/api';
   ```

2. Upload tout le dossier `frontend/` sur Hostinger dans `public_html/issues/`

3. Crée un fichier `.htaccess` dans ce dossier :
   ```apache
   Options -MultiViews
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteRule ^ index.html [QSA,L]
   ```

### 4. DNS Hostinger

Ajoute un sous-domaine `issues` pointant vers `public_html/issues/`

---

## Dev local

```bash
cd backend
cp .env.example .env
# Remplis .env
npm install
npm run dev
```

Ouvre `frontend/index.html` avec Live Server (VSCode) ou similaire.
