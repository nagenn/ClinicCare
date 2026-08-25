# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

**ClinicCare** is a microservices-based referral management platform with:

- **Frontend**: Angular 18.2.21 (standalone API, TypeScript, RxJS)
- **Backend**: Microservices architecture using FastAPI (Python 3) with SQLAlchemy ORM
- **API Gateway**: FastAPI reverse proxy that routes requests to downstream services
- **Services**:
  - Patient Service (port 8001) - patient data management
  - Doctors Service (port 8002) - doctor profiles and specialties
  - Referral Service (port 8003) - referral workflows, depends on doctors and notification services
  - Document Service (port 8004) - document storage/retrieval
  - Notification Service (port 8005) - notifications and alerts
- **Deployment**: Docker Compose orchestration

### Key Architecture Patterns

1. **API Gateway Pattern**: All frontend requests go through port 8000 (gateway), which proxies to specific services based on URL segment (`/api/{service}/{resource}`)
2. **Service Dependencies**: Referral Service calls Doctors and Notification services directly via environment-configured URLs
3. **Frontend Structure**: Organized into `core/` (models, services, guards, config) and `features/` (page components)
4. **Authentication**: Token-based via auth guard protecting shell component routes

## Quick Commands

### Frontend Development

```bash
cd frontend
npm install                 # Install dependencies
npm start                   # Dev server at http://localhost:4200
npm run build              # Production build to dist/frontend
npm test                   # Unit tests (Karma + Jasmine)
npm run watch              # Rebuild on file changes
```

### Backend Development (Local, Without Docker)

Each service runs independently:

```bash
cd services/patient
pip install -r requirements.txt
python main.py            # Service runs on port 8001

cd services/doctors
python main.py            # Service runs on port 8002

# Similar for referral, document, notification services
# Gateway typically runs last so it can reach all upstream services
cd gateway
python main.py            # Gateway on port 8000
```

### Docker Development

```bash
docker-compose up        # Spin up entire stack (all 5 services + gateway)
docker-compose down      # Stop and remove containers
docker-compose logs -f   # Stream logs from all services
docker-compose logs gateway  # Logs from specific service
```

## Frontend Structure

```
frontend/src/
  app/
    core/                # Shared utilities
      guards/           # authGuard protects authenticated routes
      models/           # TypeScript interfaces (Doctor, Patient, Referral, etc.)
      services/         # HTTP clients and business logic
      config.ts         # App configuration
    features/           # Feature components
      dashboard/        # Main view
      patients/         # Patient list and details
      referrals/        # Referral creation and tracking
      documents/        # Document management
      login/            # Authentication entry point
    shell/              # Layout wrapper (protected by authGuard)
    app.routes.ts       # Routing configuration (modern standalone API)
    app.config.ts       # DI providers
  styles.css            # Global styles
```

### Key Services in Frontend

- `AuthService`: Manages login/logout and token persistence
- `PatientService`, `DoctorService`, `ReferralService`, `DocumentService`, `NotificationService`: HTTP clients for respective APIs
- `authGuard`: Route guard that redirects to login if not authenticated

## Backend Structure

### Service Common Pattern

Each service follows this structure:

```
services/{service_name}/
  main.py        # FastAPI app definition + endpoints
  models.py      # SQLAlchemy ORM models
  schemas.py     # Pydantic request/response schemas
  db.py          # Database connection and SessionLocal
  seed.py        # Initial data population (runs on startup)
  requirements.txt
  Dockerfile
```

### Service Communication

- **Referral Service** → Doctors Service (validates doctor exists)
- **Referral Service** → Notification Service (sends notifications on referral status change)
- Gateway is the only service-to-frontend entry point

## Database Notes

- SQLAlchemy ORM with SQLite (file-based, auto-initialized)
- Models created at app startup: `Base.metadata.create_all(bind=engine)`
- Seed data loads on first startup (if DB is empty) via `seed_if_empty()`
- Each service is independent with its own database

## Environment Variables

Used in `docker-compose.yml` to configure service URLs (for inter-service calls and gateway routing):

```
PATIENT_SERVICE_URL=http://patient-service:8001
DOCTORS_SERVICE_URL=http://doctors-service:8002
REFERRAL_SERVICE_URL=http://referral-service:8003
DOCUMENT_SERVICE_URL=http://document-service:8004
NOTIFICATION_SERVICE_URL=http://notification-service:8005
```

Services fall back to `localhost` URLs for local development (see `gateway/main.py` and referral service endpoints).

## Testing

### Frontend

```bash
cd frontend
npm test              # Runs Karma test runner
npm test -- --watch  # Watch mode
npm test -- --code-coverage  # Coverage report
```

Tests use Jasmine framework; test files: `*.spec.ts` in src/app/

### Backend

No explicit test commands configured. Services can be tested via:
- HTTP requests to local/running service
- Import and unit test individual functions
- Integration tests via Docker Compose stack

## Development Workflow

1. **Feature Branch**: Create off `master` (main branch)
2. **Frontend Changes**: Run `npm start`, test at localhost:4200
3. **Backend Changes**: Run `docker-compose up` or run individual services locally
4. **Testing**: Run `npm test` (frontend) before committing
5. **Commit & PR**: Create PR against `master` with changes

## Important Gotchas

1. **Service Dependencies at Runtime**: Referral Service will fail to initialize if Doctors/Notification services aren't available during startup (when it connects to them). Use Docker Compose `depends_on` to manage this.
2. **CORS**: Gateway only allows origin `http://localhost:4200` in dev (configured in `gateway/main.py`). Update for production.
3. **Token Cleanup**: Frontend stores auth token in localStorage; no automatic expiration handling currently.
4. **Database Persistence**: SQLite databases are inside containers—they're lost when containers stop unless mounted as volumes.
5. **Port Conflicts**: All 6 services (5 backend + gateway) occupy specific ports. If running locally without Docker, ensure ports 8000-8005 are available.

## Debugging Tips

- **Frontend**: Use Chrome DevTools; services log to browser console
- **Backend Services**: Check `docker-compose logs {service-name}` or run service directly to see stdout
- **Gateway Routing**: Add debug logging to `gateway/main.py` around the SERVICE_MAP lookup if routes aren't matching
- **CORS Issues**: Check that CORS middleware is configured in gateway for the frontend origin

## Adding a New Feature

1. **Add API Endpoint**: Create route in relevant service's `main.py`
2. **Add Data Model**: Define Pydantic schema and SQLAlchemy model
3. **Add Frontend Service**: Create HTTP client in `frontend/src/app/core/services/`
4. **Add Component**: Create feature component in `frontend/src/app/features/`
5. **Add Route**: Update `frontend/src/app/app.routes.ts`
6. **Test**: Run `npm test` and verify with dev server/Docker Compose
