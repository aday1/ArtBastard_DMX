#!/bin/bash
# filepath: c:\Users\aday\Documents\GitHub\ArtBastard_DMX\CLEANUP.sh

# Define some fabulous colors and emojis (Bash specific)
C_MAGENTA="\033[1;35m"
C_GREEN="\033[1;32m"
C_CYAN="\033[1;36m"
C_YELLOW="\033[1;33m"
C_RED="\033[1;31m"
C_DARK_GRAY="\033[1;30m"
C_DARK_CYAN="\033[0;36m" # Adjusted for better visibility like PowerShell's DarkCyan
C_DARK_YELLOW="\033[0;33m"
C_RESET="\033[0m"

echo -e "${C_MAGENTA}🧼✨ The ArtBastard's Grand Exfoliation Ritual! (Bash Edition) ✨🧼${C_RESET}"
echo -e "${C_DARK_GRAY}--------------------------------------------------------------------${C_RESET}"
echo -e "${C_CYAN}Preparing your masterpiece for a flawless Git Push, mon ami!${C_RESET}"
echo ""

# Ensure we are at the project's magnificent proscenium (root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
if [ ! -f "$SCRIPT_DIR/package.json" ] || [ ! -d "$SCRIPT_DIR/react-app" ]; then
  echo -e "${C_RED}🛑 Hold the curtain! This ritual must be performed from the ArtBastard_DMX project's main stage!${C_RESET}"
  echo -e "${C_RED}Ensure 'package.json' and the 'react-app' directory are present.${C_RESET}"
  exit 1
fi
cd "$SCRIPT_DIR"
echo -e "${C_YELLOW}📍 Conducting cleanup from: $SCRIPT_DIR${C_RESET}"
echo ""

echo -e "${C_GREEN}🧹 Act I: Sweeping Away the Ephemeral! (Builds, Logs, Caches) 🧹${C_RESET}"

# Define the paths to artistic remnants
BACKEND_DIST_DIR="./dist"
FRONTEND_DIST_DIR="./react-app/dist"
LAUNCHER_DIST_DIR="./launcher-dist"
LOGS_DIR="./logs" # Targeting the whole logs directory
BACKEND_LOG_FILE="./backend.log"
VITE_CACHE_DIR="./react-app/.vite"
ROOT_ESLINTCACHE="./.eslintcache"
REACT_APP_ESLINTCACHE="./react-app/.eslintcache"

# Vanquishing build directories
if [ -d "$BACKEND_DIST_DIR" ]; then
    echo -e "${C_DARK_CYAN}Removing backend build directory: $BACKEND_DIST_DIR 💨${C_RESET}"
    rm -rf "$BACKEND_DIST_DIR"
fi
if [ -d "$FRONTEND_DIST_DIR" ]; then
    echo -e "${C_DARK_CYAN}Removing frontend build directory: $FRONTEND_DIST_DIR 💨${C_RESET}"
    rm -rf "$FRONTEND_DIST_DIR"
fi
if [ -d "$LAUNCHER_DIST_DIR" ]; then
    echo -e "${C_DARK_CYAN}Removing launcher build directory: $LAUNCHER_DIST_DIR 💨${C_RESET}"
    rm -rf "$LAUNCHER_DIST_DIR"
fi

# Expunging logs
if [ -d "$LOGS_DIR" ]; then
    echo -e "${C_DARK_CYAN}Clearing out the logs directory: $LOGS_DIR 📜🔥${C_RESET}"
    rm -rf "$LOGS_DIR" # Removes the directory and its contents
fi
if [ -f "$BACKEND_LOG_FILE" ]; then
    echo -e "${C_DARK_CYAN}Removing backend log file: $BACKEND_LOG_FILE 📜🔥${C_RESET}"
    rm -f "$BACKEND_LOG_FILE"
fi

# Obliterating caches
if [ -d "$VITE_CACHE_DIR" ]; then
    echo -e "${C_DARK_CYAN}Removing Vite cache: $VITE_CACHE_DIR 🌪️${C_RESET}"
    rm -rf "$VITE_CACHE_DIR"
fi
if [ -f "$ROOT_ESLINTCACHE" ]; then
    echo -e "${C_DARK_CYAN}Removing root .eslintcache 🌪️${C_RESET}"
    rm -f "$ROOT_ESLINTCACHE"
fi
if [ -f "$REACT_APP_ESLINTCACHE" ]; then
    echo -e "${C_DARK_CYAN}Removing react-app .eslintcache 🌪️${C_RESET}"
    rm -f "$REACT_APP_ESLINTCACHE"
fi

echo -e "${C_GREEN}✨ Stage is sparkling! Mandatory cleanup complete.${C_RESET}"
echo ""

echo -e "${C_YELLOW}🎭 Act II: The Optional Deep Cleanse (For the Discerning Artiste) 🎭${C_RESET}"
echo -e "${C_YELLOW}The following are commented out. Uncomment if you desire a truly spartan canvas.${C_RESET}"

# Define paths for the truly devoted
ROOT_NODE_MODULES="./node_modules"
REACT_APP_NODE_MODULES="./react-app/node_modules"
LAUNCHER_NODE_MODULES="./launcher/node_modules" # If you use the launcher's own deps

# Uncomment to banish node_modules (this will require a full 'npm install' afterwards!)
if [ -d "$ROOT_NODE_MODULES" ]; then
    echo -e "${C_DARK_YELLOW}OPTIONAL: Removing root node_modules: $ROOT_NODE_MODULES (This is a commitment, mon ami!) 🗑️${C_RESET}"
    rm -rf "$ROOT_NODE_MODULES"
fi
if [ -d "$REACT_APP_NODE_MODULES" ]; then
    echo -e "${C_DARK_YELLOW}OPTIONAL: Removing react-app node_modules: $REACT_APP_NODE_MODULES 🗑️${C_RESET}"
    rm -rf "$REACT_APP_NODE_MODULES"
fi
if [ -d "$LAUNCHER_NODE_MODULES" ]; then
    echo -e "${C_DARK_YELLOW}OPTIONAL: Removing launcher node_modules: $LAUNCHER_NODE_MODULES 🗑️${C_RESET}"
    rm -rf "$LAUNCHER_NODE_MODULES"
fi

# Uncomment to remove TypeScript build info files
echo -e "${C_DARK_YELLOW}OPTIONAL: Removing TypeScript build info files (*.tsbuildinfo) 📝${C_RESET}"
find . -name "*.tsbuildinfo" -type f -delete
find ./react-app -name "*.tsbuildinfo" -type f -delete


echo ""
echo -e "${C_MAGENTA}🎉 Bravo! The Grand Exfoliation is complete! 🎉${C_RESET}"
echo -e "${C_CYAN}Your ArtBastard DMX project is now impeccably prepared for its Git debut!${C_RESET}"
echo -e "${C_CYAN}Remember to re-install dependencies if you chose the deep cleanse!${C_RESET}"
