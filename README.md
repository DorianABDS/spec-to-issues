# GDD → GitHub Issues Generator

> Transforme automatiquement tes GDD et cahiers des charges en issues GitHub structurées grâce à l'IA Claude.

**Workers Studio** · [issues.abbadessa-dorian.fr](https://issues.abbadessa-dorian.fr)

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| IA | Claude (Anthropic) |
| Auth | GitHub OAuth 2.0 |
| Déploiement | VPS + Docker + Nginx + SSL |

---

## Démarrage rapide (dev)

### 1. Cloner et installer

```bash
git clone https://github.com/Workers-Studio/gdd-to-issues.git
cd gdd-to-issues
npm install
```

### 2. Variables d'environnement

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Remplis `backend/.env` avec :
- `ANTHROPIC_API_KEY` → [console.anthropic.com](https://console.anthropic.com)
- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` → [github.com/settings/developers](https://github.com/settings/developers)
- `JWT_SECRET` → chaîne aléatoire longue

### 3. Créer la GitHub OAuth App

Sur [github.com/settings/developers](https://github.com/settings/developers) :
- **Homepage URL** : `http://localhost:5173`
- **Authorization callback URL** : `http://localhost:3001/api/auth/github/callback`

### 4. Lancer

```bash
npm run dev
```

- Frontend : http://localhost:5173
- Backend : http://localhost:3001

---

## Déploiement VPS

### Prérequis

- VPS avec Docker + Docker Compose
- DNS : enregistrement A `issues.abbadessa-dorian.fr` → IP du VPS
- Nginx installé sur le VPS

### 1. Setup initial sur le VPS

```bash
# Cloner le repo
git clone https://github.com/Workers-Studio/gdd-to-issues.git /opt/gdd-to-issues
cd /opt/gdd-to-issues

# Configurer les .env de production
cp backend/.env.example backend/.env
# Éditer backend/.env avec les valeurs de prod (FRONTEND_URL=https://issues.abbadessa-dorian.fr etc.)

# Copier la config Nginx
sudo cp nginx/issues.abbadessa-dorian.fr.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/issues.abbadessa-dorian.fr.conf /etc/nginx/sites-enabled/

# SSL avec Let's Encrypt
sudo certbot --nginx -d issues.abbadessa-dorian.fr

# Lancer
docker compose -f docker-compose.prod.yml up -d --build
```

### 2. CI/CD automatique

Ajoute ces secrets dans ton repo GitHub :
- `VPS_HOST` : IP de ton VPS
- `VPS_USER` : Utilisateur SSH (ex: `ubuntu`)
- `VPS_SSH_KEY` : Clé privée SSH

Chaque push sur `main` déclenche un déploiement automatique.

---

## Architecture des routes backend

| Route | Méthode | Description |
|-------|---------|-------------|
| `GET /api/auth/github` | GET | Redirect OAuth GitHub |
| `GET /api/auth/github/callback` | GET | Callback OAuth → JWT |
| `GET /api/auth/me` | GET | Infos utilisateur |
| `POST /api/parse/text` | POST | Parser texte brut |
| `POST /api/parse/file` | POST | Parser PDF/DOCX/MD |
| `POST /api/parse/url` | POST | Parser URL Notion/GDocs |
| `POST /api/generate` | POST | Générer issues via Claude |
| `GET /api/github/repos` | GET | Lister les repos |
| `POST /api/github/create-issues` | POST | Créer les issues |
| `POST /api/github/dry-run` | POST | Preview sans push |

---

## Structure du projet

```
gdd-to-issues/
├── frontend/          # React + Vite
│   └── src/
│       ├── pages/     # ImportStep, ConfigStep, ReviewStep, ResultsStep
│       ├── stores/    # Zustand (état global)
│       ├── services/  # API calls
│       └── types/     # TypeScript interfaces
├── backend/           # Node.js + Express
│   └── src/
│       ├── routes/    # auth, parse, generate, github
│       ├── services/  # claude.service, github.service, parser.service
│       └── middlewares/
├── nginx/             # Config Nginx VPS
├── .github/workflows/ # CI/CD
└── docker-compose*.yml
```

---

Made with ❤️ by Workers Studio
