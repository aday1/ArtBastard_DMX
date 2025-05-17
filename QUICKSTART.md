# Quickstart - ArtBastard DMX512FTW

Welcome, maestro! This guide will get your ArtBastard DMX512FTW system up and running with theatrical flair!

## Automated Quickstart Scripts

For a dazzlingly simple setup, we've prepared automated scripts:

*   **Windows (PowerShell):**
    Open PowerShell, navigate to the project root (`ArtBastard_DMX`), and run:
    ```powershell
    .\QUICKSTART.ps1
    ```
*   **Linux/macOS (Bash):**
    Open your terminal, navigate to the project root (`ArtBastard_DMX`), and run:
    ```bash
    bash ./QUICKSTART.sh
    ```

These scripts will guide you through dependency installation and starting the backend and frontend servers.

## Manual Start (If you prefer to conduct each section yourself)

### 1. Install All Dependencies:
```bash
npm install && (cd react-app && npm install)
```

### 2. Run Backend (also builds):
(In project root `ArtBastard_DMX`)
```bash
node start-server.js
```
*   Backend on port 3030.

### 3. Run Frontend (Dev Mode):
(In a **new terminal**, from project root `ArtBastard_DMX`)
```bash
cd react-app
npm run dev
```
*   Frontend on port 3001.

### 4. View:
[http://localhost:3001](http://localhost:3001) (It could be something else tho.... )
