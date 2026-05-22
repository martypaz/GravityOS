#!/bin/bash

# GravityOS Dashboard Startup Helper

# Color definitions for pristine CLI printing
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}             GRAVITYOS CONTROL DASHBOARD            ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "System: ${GREEN}WSL2 (Ubuntu)${NC}"
echo -e "Hardware: ${GREEN}NVIDIA GTX 1080 Ti (11GB VRAM) detected${NC}"
echo -e ""

# 1. Check if node_modules exists
if [ ! -d "dashboard-ui/node_modules" ]; then
    echo -e "${YELLOW}[System] First-time setup: Installing dashboard dependencies...${NC}"
    cd dashboard-ui && npm install
    cd ..
fi

# 2. Check if port 3000 is already occupied
PORT_OCCUPIED=$(lsof -i :3000 -t)

if [ ! -z "$PORT_OCCUPIED" ]; then
    echo -e "${RED}[Warning] Port 3000 is already in use by process ID: $PORT_OCCUPIED${NC}"
    echo -e "${YELLOW}Would you like to terminate this process? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        kill -9 "$PORT_OCCUPIED"
        echo -e "${GREEN}[Success] Terminated process $PORT_OCCUPIED.${NC}"
    else
        echo -e "${RED}[Error] Please stop the other application or edit the server configuration port.${NC}"
        exit 1
    fi
fi

# 3. Launch dev server
echo -e "${GREEN}[Success] Starting dev server on port 3000...${NC}"
cd dashboard-ui && npm run dev
