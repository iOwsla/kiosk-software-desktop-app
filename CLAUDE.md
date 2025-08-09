# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based kiosk application with a React frontend and Express API backend, featuring license verification and automatic updates. The application runs in kiosk mode with API key-based licensing.

## Key Commands

### Development
```bash
# Start development environment (runs all processes concurrently)
npm run dev

# Individual development processes
npm run dev:main      # Electron main process
npm run dev:renderer  # React frontend
npm run dev:preload   # Preload scripts

# Run linting
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues

# Build check (lint + build)
npm run check
```

### Production Build
```bash
# Build all components
npm run build

# Create installer package
npm run pack          # Build without publishing
npm run dist          # Build for distribution
npm run release       # Build and publish to GitHub
```

### Running the Application
```bash
# Start Electron app (requires build first)
npm start
```

## Architecture Overview

### Three-Process Architecture
1. **Main Process** (`src/main/main.ts`): Electron main process managing windows, IPC, and services
2. **Renderer Process** (`src/renderer/`): React frontend with TypeScript and Tailwind CSS
3. **API Server** (`api/server.ts`): Express server running on port 3001

### Service Layer (`src/main/services/`)
- **LicenseManager**: Handles API key validation and license lifecycle
- **WindowManager**: Manages Electron windows and navigation
- **UpdateManager**: Auto-update functionality via electron-updater
- **PortManager**: Dynamic port allocation and monitoring
- **PrinterManager**: Receipt printer integration

### API Routes (`api/routes/`)
- `/api/license`: License verification and status
- `/api/port`: Port management
- `/api/update`: Update checking and downloading
- `/api/printer`: Printer operations
- `/api/pavo`: Pavo integration services

### Frontend Routes
- `/`: Main kiosk interface
- `/license-key`: API key input page
- `/license-renewal`: License renewal page

## Key Technical Details

### IPC Communication
- Uses typed IPC channels defined in `shared/types.ts`
- Main-to-renderer communication via `ipcMain.handle()` and `ipcRenderer.invoke()`
- Preload script bridges the gap with context isolation

### Build Configuration
- **Webpack**: Separate configs for main, preload, and renderer
- **TypeScript**: Strict mode enabled with path aliases
- **Auto-update**: GitHub releases integration (owner: iOwsla, repo: kiosk-software-desktop-app)

### Database
- SQLite3 via better-sqlite3 for local data storage
- Tables: license_cache, app_logs, update_history, port_configuration

### Security
- Helmet.js for API security headers
- CORS configured for localhost and file:// origins
- Context isolation and nodeIntegration disabled in renderer
- Menu removed in production mode

## Development Workflow

### Adding New Features
1. Create route in `api/routes/` if backend logic needed
2. Add service in `src/main/services/` for Electron-side logic
3. Define IPC channels in `shared/types.ts`
4. Implement UI components in `src/renderer/components/`
5. Add pages in `src/renderer/pages/` if new routes needed

### Testing Changes
Currently no test framework is configured. Manual testing required through:
1. Run `npm run dev` for development mode
2. Check Electron DevTools console for errors
3. Verify API endpoints via `/health` endpoint

### Before Committing
1. Run `npm run lint:fix` to fix code style issues
2. Run `npm run check` to ensure build succeeds
3. Test in development mode thoroughly

## Important Notes

- License API keys are stored in localStorage
- Application requires valid license to access kiosk functionality
- Auto-update checks occur every 60 minutes in production
- Port 3001 is default for API server (configurable)
- Logs are written via winston logger to `api/utils/logger.ts`