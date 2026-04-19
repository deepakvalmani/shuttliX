# ShuttliX v2.0

Real-time shuttle tracking platform for universities, campuses and corporate fleets.

## Stack
- **Backend:** Node.js, Express, MongoDB, Redis, Socket.IO
- **Frontend:** React 18, Vite, Tailwind CSS, Leaflet, Zustand

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/youruser/shuttliX.git
cd shuttliX

# 2. Backend
cd backend
cp .env.example .env   # Fill in your values
npm install
npm run dev

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Or use Docker:
```bash
docker-compose up -d   # Starts MongoDB + Redis
cd backend && npm run dev
cd frontend && npm run dev
```

## Environment Setup

Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories.

Key backend variables:
- `MONGODB_URI` — MongoDB connection string
- `REDIS_URL` — Redis connection string  
- `JWT_SECRET` — 64-character random secret
- `CLIENT_URLS` — Comma-separated frontend URLs

## v2.0 Changes

See [CHANGELOG.md](docs/CHANGELOG.md) for all 38 fixes.

## License
MIT
