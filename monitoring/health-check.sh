#!/bin/bash

# Health check monitoring script
# Usage: ./health-check.sh [frontend|backend|all]

SERVICE=${1:-all}
FRONTEND_URL="http://localhost:3000/health"
BACKEND_URL="http://localhost:3001/health"
TIMEOUT=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local service_name=$1
    local url=$2
    
    echo -n "Checking $service_name... "
    
    response=$(curl -s -w "\n%{http_code}" --connect-timeout $TIMEOUT $url 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ HEALTHY${NC}"
        if [ -n "$body" ]; then
            echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
        fi
    elif [ "$http_code" = "503" ]; then
        echo -e "${YELLOW}⚠ DEGRADED${NC}"
        if [ -n "$body" ]; then
            echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
        fi
    else
        echo -e "${RED}✗ UNHEALTHY${NC} (HTTP $http_code)"
    fi
    echo
}

echo "==================================="
echo "Transcription System Health Check"
echo "Time: $(date)"
echo "==================================="
echo

case $SERVICE in
    frontend)
        check_service "Frontend" "$FRONTEND_URL"
        ;;
    backend)
        check_service "Backend" "$BACKEND_URL"
        ;;
    all|*)
        check_service "Frontend" "$FRONTEND_URL"
        check_service "Backend" "$BACKEND_URL"
        
        # PM2 process check
        echo "PM2 Process Status:"
        pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (PID: \(.pid), Uptime: \(.pm2_env.pm_uptime)ms, Restarts: \(.pm2_env.restart_time))"'
        ;;
esac

echo
echo "==================================="