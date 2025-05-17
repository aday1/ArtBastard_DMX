# ArtBastard DMX Launcher

This is a standalone Windows executable launcher for ArtBastard DMX, replacing the PowerShell script.

## Features

- Beautiful GUI interface
- DMX, MIDI, ArtNet, and WebServer log displays
- Starts both backend server and React frontend
- Builds the backend if needed
- Handles process management and cleanup

## Development

To work on the launcher in development mode:

1. Install dependencies:
   ```
   npm run install-all
   ```

2. Start the launcher in development mode:
   ```
   npm run start-launcher
   ```

## Building the Executable

To build the standalone executable:

1. Make sure all dependencies are installed:
   ```
   npm run install-all
   ```

2. Build the launcher:
   ```
   npm run build-launcher
   ```

This will create the executable in the `launcher-dist` folder.

## Running the Application

After building, you can run the application by:

1. Double-clicking the `ArtBastardDMX.bat` file
2. Or directly running `launcher-dist\ArtBastard DMX Launcher.exe`

## Notes

- The launcher handles building the backend if needed
- It automatically manages the server and React processes
- Logs are displayed in real-time in the UI
- All processes are properly cleaned up when the application is closed
