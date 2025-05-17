#!/bin/bash

# Define some fabulous colors and emojis (Bash specific)
C_MAGENTA="\\033[1;35m"
C_GREEN="\\033[1;32m"
C_CYAN="\\033[1;36m"
C_YELLOW="\\033[1;33m"
C_RED="\\033[1;31m"
C_DARK_GRAY="\\033[1;30m"
C_WHITE="\\033[1;37m"
C_RESET="\\033[0m"

echo -e "${C_MAGENTA}🎭✨ Encore! Encore! ArtBastard DMX512FTW Grand Premiere Script! ✨🎭${C_RESET}"
echo -e "${C_DARK_GRAY}----------------------------------------------------------------${C_RESET}"
echo -e "${C_CYAN}Prepare for an artistic explosion, mon cher!${C_RESET}"
echo ""

# Determine the script's own directory and navigate to the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
if [ ! -f "$SCRIPT_DIR/package.json" ] || [ ! -d "$SCRIPT_DIR/react-app" ]; then
  echo -e "${C_RED}🛑 HALT! This script demands to be run from the ArtBastard_DMX project's center stage!${C_RESET}"
  echo -e "${C_RED}Ensure 'package.json' and the 'react-app' directory are present.${C_RESET}"
  exit 1
fi
cd "$SCRIPT_DIR"
echo -e "${C_YELLOW}📍 Our grand stage is located at: $SCRIPT_DIR${C_RESET}"
echo ""

echo -e "${C_GREEN}🧹 Overture: Clearing the Stage for Brilliance! 🧹${C_RESET}"
echo -e "${C_CYAN}Dusting off the old, making way for the new masterpiece...${C_RESET}"

# Remove potential leftover build artifacts
BACKEND_DIST_DIR="./dist"
FRONTEND_DIST_DIR="./react-app/dist"
# NODE_MODULES_DIR="./node_modules" # Optional
# FRONTEND_NODE_MODULES_DIR="./react-app/node_modules" # Optional

if [ -d "$BACKEND_DIST_DIR" ]; then
    echo -e "${C_CYAN}Vanishing backend build directory: $BACKEND_DIST_DIR 💨${C_RESET}"
    rm -rf "$BACKEND_DIST_DIR"
fi
if [ -d "$FRONTEND_DIST_DIR" ]; then
    echo -e "${C_CYAN}Eradicating frontend build directory: $FRONTEND_DIST_DIR 💨${C_RESET}"
    rm -rf "$FRONTEND_DIST_DIR"
fi

 if [ -d "$NODE_MODULES_DIR" ]; then
     echo -e "${C_YELLOW}Banishing backend node_modules: $NODE_MODULES_DIR (A moment of dramatic pause!) 🌪️${C_RESET}"
     rm -rf "$NODE_MODULES_DIR"
 fi
 if [ -d "$FRONTEND_NODE_MODULES_DIR" ]; then
     echo -e "${C_YELLOW}Dismissing frontend node_modules: $FRONTEND_NODE_MODULES_DIR (Patience, artiste!) 🌪️${C_RESET}"
     rm -rf "$FRONTEND_NODE_MODULES_DIR"
 fi

echo -e "${C_GREEN}✨ Voila! The stage is pristine! Ready for the magic!${C_RESET}"
echo ""

echo -e "${C_GREEN}🎶 Interlude: Summoning the Creative Spirits (Dependencies)! 🎶${C_RESET}"
echo -e "${C_CYAN}Calling upon the muses (npm packages)...${C_RESET}"

echo -e "${C_CYAN}Awakening the backend spirits...${C_RESET}"
npm install
if [ $? -ne 0 ]; then echo -e "${C_RED}💔 Catastrophe! The backend spirits are displeased! (npm install failed)${C_RESET}"; exit 1; fi
echo -e "${C_GREEN}✅ Backend spirits have answered the call!${C_RESET}"

echo -e "${C_CYAN}Inviting the frontend phantoms...${C_RESET}"
if [ ! -d "react-app" ]; then
    echo -e "${C_RED}🛑 The frontend realm is missing! 'react-app' directory not found.${C_RESET}"
    exit 1
fi
cd react-app
npm install
if [ $? -ne 0 ]; then echo -e "${C_RED}💔 Alas! The frontend phantoms refuse to materialize! (npm install failed)${C_RESET}"; cd ..; exit 1; fi
cd ..
echo -e "${C_GREEN}✅ Frontend phantoms are now part of our spectral ensemble!${C_RESET}"
echo ""

echo -e "${C_GREEN}🎬 Act I: The Backend's Grand Performance! 🎬${C_RESET}"
echo -e "${C_CYAN}The server-side saga unfolds... (node start-server.js)${C_RESET}"
echo -e "${C_CYAN}This mystical incantation also builds the frontend if destiny wills it!${C_RESET}"
echo -e "${C_CYAN}The backend will whisper its secrets on port 3030, and log its tales to backend.log.${C_RESET}"

node start-server.js > backend.log 2>&1 &
BACKEND_PID=$!

# A dramatic pause for the server to awaken...
sleep 5

if ps -p $BACKEND_PID > /dev/null; then
   echo -e "${C_GREEN}🚀 Backend server has taken flight into the background (PID: $BACKEND_PID)! Its chronicles are in backend.log.${C_RESET}"
else
   echo -e "${C_RED}❌ Oh, the tragedy! The backend server's debut was a flop. Consult backend.log for the grim details.${C_RESET}"
   if [ -f "backend.log" ]; then
       echo -e "${C_YELLOW}Last whispers from backend.log:${C_RESET}"
       tail -n 10 backend.log
   fi
   exit 1
fi
echo ""

echo -e "${C_GREEN}💡 Act II: The Frontend's Dazzling Debut - Your Moment to Shine! 💡${C_RESET}"
echo -e "${C_YELLOW}--------------------------------------------------------------------${C_RESET}"
echo -e "${C_RED}‼️ SPOTLIGHT ON YOU, MAESTRO! ‼️${C_RESET}"
echo -e "${C_YELLOW}The stage is yours for the frontend spectacle!${C_RESET}"
echo -e "${C_YELLOW}With passion and precision, open a NEW terminal window/tab, and declare:${C_RESET}"
echo ""
echo -e "${C_WHITE}  cd \"$SCRIPT_DIR/react-app\"${C_RESET}"
echo -e "${C_WHITE}  npm run dev${C_RESET}"
echo ""
echo -e "${C_YELLOW}And lo! The frontend UI will burst forth in glory, typically at http://localhost:3001${C_RESET}"
echo -e "${C_YELLOW}--------------------------------------------------------------------${C_RESET}"
echo ""
echo -e "${C_MAGENTA}🎉 Magnifique! The ArtBastard DMX Quickstart is a GO! 🎉${C_RESET}"
echo -e "${C_CYAN}The backend is performing its clandestine ballet in the background (PID: $BACKEND_PID).${C_RESET}"
echo -e "${C_CYAN}Heed the call of Act II to unveil the frontend's brilliance!${C_RESET}"
echo -e "${C_GREEN}May your DMX channels dance and your audience be mesmerized! ✨${C_RESET}"
echo ""
echo -e "${C_DARK_GRAY}ℹ️  To bring the curtain down on the background backend server later, command: kill $BACKEND_PID${C_RESET}"
echo -e "${C_DARK_GRAY}    (Or it may gracefully exit when this terminal bows out, depending on your shell's temperament)${C_RESET}"
