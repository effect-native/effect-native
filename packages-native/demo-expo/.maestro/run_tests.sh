#!/bin/bash
# Rootin' tootin' test runner for both native and web

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🤠 Starting Maestro test suite for demo-expo"

# Function to run tests
run_tests() {
    local platform=$1
    local test_dir=$2
    
    echo -e "${YELLOW}Running $platform tests...${NC}"
    
    if [ "$platform" = "web" ]; then
        # For web, we need the dev server running
        echo "Starting Expo web server..."
        npx expo start --web --non-interactive &
        SERVER_PID=$!
        
        # Wait for server to be ready
        echo "Waiting for web server to be ready..."
        sleep 10
        
        # Run web tests
        maestro -p web test "$test_dir"
        TEST_RESULT=$?
        
        # Clean up
        kill $SERVER_PID 2>/dev/null || true
    else
        # Run native tests
        maestro test "$test_dir"
        TEST_RESULT=$?
    fi
    
    if [ $TEST_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ $platform tests passed!${NC}"
    else
        echo -e "${RED}❌ $platform tests failed!${NC}"
        exit 1
    fi
}

# Parse arguments
PLATFORM=${1:-all}

case $PLATFORM in
    native)
        run_tests "native" ".maestro"
        ;;
    web)
        run_tests "web" ".maestro/web"
        ;;
    all)
        run_tests "native" ".maestro"
        run_tests "web" ".maestro/web"
        ;;
    *)
        echo "Usage: $0 [native|web|all]"
        exit 1
        ;;
esac

echo -e "${GREEN}🎯 All tests completed successfully!${NC}"