#!/bin/bash

# WebSocket Quality Assurance Test Runner
# Comprehensive testing script for WebSocket transcription progress feature

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=300  # 5 minutes
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
LOG_DIR="logs/qa-tests"
REPORT_DIR="reports/qa-tests"
TEST_ENV="test"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$REPORT_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_DIR/qa-test.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_DIR/qa-test.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_DIR/qa-test.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_DIR/qa-test.log"
}

log_section() {
    echo -e "\n${PURPLE}============================================${NC}" | tee -a "$LOG_DIR/qa-test.log"
    echo -e "${PURPLE}$1${NC}" | tee -a "$LOG_DIR/qa-test.log"
    echo -e "${PURPLE}============================================${NC}\n" | tee -a "$LOG_DIR/qa-test.log"
}

# Initialize test environment
init_test_env() {
    log_section "Initializing WebSocket QA Test Environment"
    
    # Clear previous logs
    rm -f "$LOG_DIR"/*.log
    
    # Set environment variables
    export NODE_ENV="$TEST_ENV"
    export FRONTEND_URL="http://localhost:3000"
    export BACKEND_URL="http://localhost:3001"
    
    log_info "Environment: $TEST_ENV"
    log_info "Frontend URL: $FRONTEND_URL"
    log_info "Backend URL: $BACKEND_URL"
    
    # Check dependencies
    check_dependencies
}

# Check required dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if frontend directory exists
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    # Check if backend directory exists
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    log_success "All dependencies check passed"
}

# Install dependencies
install_dependencies() {
    log_section "Installing Dependencies"
    
    # Install frontend dependencies
    log_info "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install --silent > "$LOG_DIR/frontend-install.log" 2>&1
    if [ $? -eq 0 ]; then
        log_success "Frontend dependencies installed"
    else
        log_error "Failed to install frontend dependencies"
        cat "$LOG_DIR/frontend-install.log"
        exit 1
    fi
    cd ..
    
    # Install backend dependencies
    log_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install --silent > "$LOG_DIR/backend-install.log" 2>&1
    if [ $? -eq 0 ]; then
        log_success "Backend dependencies installed"
    else
        log_error "Failed to install backend dependencies"
        cat "$LOG_DIR/backend-install.log"
        exit 1
    fi
    cd ..
}

# Run frontend WebSocket tests
run_frontend_tests() {
    log_section "Running Frontend WebSocket Tests"
    
    cd "$FRONTEND_DIR"
    
    # Connection reliability tests
    log_info "Running connection reliability tests..."
    timeout $TEST_TIMEOUT npm test -- --testPathPattern="TranscriptionProgress.test.tsx" --verbose > "$LOG_DIR/frontend-connection-tests.log" 2>&1
    if [ $? -eq 0 ]; then
        log_success "Connection reliability tests passed"
    else
        log_error "Connection reliability tests failed"
        tail -n 20 "$LOG_DIR/frontend-connection-tests.log"
    fi
    
    # Integration tests
    log_info "Running WebSocket integration tests..."
    timeout $TEST_TIMEOUT npm test -- --testPathPattern="WebSocketIntegration.test.tsx" --verbose > "$LOG_DIR/frontend-integration-tests.log" 2>&1
    if [ $? -eq 0 ]; then
        log_success "Integration tests passed"
    else
        log_error "Integration tests failed"
        tail -n 20 "$LOG_DIR/frontend-integration-tests.log"
    fi
    
    # Error handling tests
    log_info "Running error handling tests..."
    timeout $TEST_TIMEOUT npm test -- --testPathPattern="WebSocketErrorHandling.test.tsx" --verbose > "$LOG_DIR/frontend-error-tests.log" 2>&1
    if [ $? -eq 0 ]; then
        log_success "Error handling tests passed"
    else
        log_error "Error handling tests failed"
        tail -n 20 "$LOG_DIR/frontend-error-tests.log"
    fi
    
    # Performance tests
    log_info "Running performance tests..."
    timeout $TEST_TIMEOUT npm test -- --testPathPattern="WebSocketPerformance.test.tsx" --verbose > "$LOG_DIR/frontend-performance-tests.log" 2>&1
    if [ $? -eq 0 ]; then
        log_success "Performance tests passed"
    else
        log_error "Performance tests failed"
        tail -n 20 "$LOG_DIR/frontend-performance-tests.log"
    fi
    
    # Generate frontend coverage report
    log_info "Generating frontend test coverage..."
    npm run test:coverage > "$LOG_DIR/frontend-coverage.log" 2>&1
    
    cd ..
}

# Run backend WebSocket tests
run_backend_tests() {
    log_section "Running Backend WebSocket Tests"
    
    cd "$BACKEND_DIR"
    
    # WebSocket service tests
    log_info "Running WebSocket service tests..."
    timeout $TEST_TIMEOUT npm test -- --testPathPattern="websocket.service.test.ts" --verbose > "$LOG_DIR/backend-service-tests.log" 2>&1
    if [ $? -eq 0 ]; then
        log_success "WebSocket service tests passed"
    else
        log_error "WebSocket service tests failed"
        tail -n 20 "$LOG_DIR/backend-service-tests.log"
    fi
    
    # Security tests
    log_info "Running security validation tests..."
    timeout $TEST_TIMEOUT npm test -- --testPathPattern="websocket.security.test.ts" --verbose > "$LOG_DIR/backend-security-tests.log" 2>&1
    if [ $? -eq 0 ]; then
        log_success "Security tests passed"
    else
        log_error "Security tests failed"
        tail -n 20 "$LOG_DIR/backend-security-tests.log"
    fi
    
    # Generate backend coverage report
    log_info "Generating backend test coverage..."
    npm run test:coverage > "$LOG_DIR/backend-coverage.log" 2>&1
    
    cd ..
}

# Performance benchmarking
run_performance_benchmarks() {
    log_section "Running Performance Benchmarks"
    
    # Connection latency benchmark
    log_info "Running connection latency benchmark..."
    cd "$BACKEND_DIR"
    npm run test:websocket > "$LOG_DIR/performance-benchmark.log" 2>&1 &
    BENCHMARK_PID=$!
    
    # Wait for benchmark completion or timeout
    sleep 60
    if kill -0 "$BENCHMARK_PID" 2>/dev/null; then
        log_warning "Performance benchmark taking longer than expected"
        kill $BENCHMARK_PID 2>/dev/null || true
    fi
    
    cd ..
}

# Quality metrics validation
validate_quality_metrics() {
    log_section "Validating Quality Metrics"
    
    # Check if quality metrics service is working
    log_info "Testing quality metrics collection..."
    
    cd "$BACKEND_DIR"
    
    # Run a simple test to verify metrics collection
    node -e "
        const { initializeQualityMetrics } = require('./dist/src/services/qualityMetricsService.js');
        try {
            const metrics = initializeQualityMetrics();
            console.log('Quality metrics service initialized successfully');
            
            // Test basic functionality
            metrics.recordConnectionAttempt(true, 50);
            metrics.recordMessageSent();
            metrics.recordMessageReceived(25);
            
            const score = metrics.getQualityScore();
            const health = metrics.getHealthStatus();
            
            console.log('Quality Score:', score);
            console.log('Health Status:', health);
            
            if (score >= 0 && score <= 100) {
                console.log('Quality metrics validation: PASSED');
                process.exit(0);
            } else {
                console.log('Quality metrics validation: FAILED - Invalid score');
                process.exit(1);
            }
        } catch (error) {
            console.error('Quality metrics validation: FAILED -', error.message);
            process.exit(1);
        }
    " > "$LOG_DIR/quality-metrics-validation.log" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "Quality metrics validation passed"
    else
        log_error "Quality metrics validation failed"
        cat "$LOG_DIR/quality-metrics-validation.log"
    fi
    
    cd ..
}

# Generate comprehensive test report
generate_report() {
    log_section "Generating Comprehensive QA Report"
    
    local report_file="$REPORT_DIR/websocket-qa-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# WebSocket Transcription Progress QA Report

**Generated:** $(date)
**Environment:** $TEST_ENV
**Test Duration:** $(date -d @$(($(date +%s) - $START_TIME)) -u +%H:%M:%S)

## Test Summary

### Frontend Tests
- **Connection Reliability:** $(test -f "$LOG_DIR/frontend-connection-tests.log" && grep -q "PASS" "$LOG_DIR/frontend-connection-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")
- **Integration Tests:** $(test -f "$LOG_DIR/frontend-integration-tests.log" && grep -q "PASS" "$LOG_DIR/frontend-integration-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")
- **Error Handling:** $(test -f "$LOG_DIR/frontend-error-tests.log" && grep -q "PASS" "$LOG_DIR/frontend-error-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")
- **Performance:** $(test -f "$LOG_DIR/frontend-performance-tests.log" && grep -q "PASS" "$LOG_DIR/frontend-performance-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")

### Backend Tests
- **WebSocket Service:** $(test -f "$LOG_DIR/backend-service-tests.log" && grep -q "PASS" "$LOG_DIR/backend-service-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")
- **Security Validation:** $(test -f "$LOG_DIR/backend-security-tests.log" && grep -q "PASS" "$LOG_DIR/backend-security-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")

### Quality Metrics
- **Metrics Collection:** $(test -f "$LOG_DIR/quality-metrics-validation.log" && grep -q "PASSED" "$LOG_DIR/quality-metrics-validation.log" && echo "✅ PASSED" || echo "❌ FAILED")

## Test Coverage

### Frontend Coverage
\`\`\`
$(test -f "$LOG_DIR/frontend-coverage.log" && tail -n 10 "$LOG_DIR/frontend-coverage.log" || echo "Coverage report not available")
\`\`\`

### Backend Coverage
\`\`\`
$(test -f "$LOG_DIR/backend-coverage.log" && tail -n 10 "$LOG_DIR/backend-coverage.log" || echo "Coverage report not available")
\`\`\`

## Performance Metrics

$(test -f "$LOG_DIR/performance-benchmark.log" && cat "$LOG_DIR/performance-benchmark.log" || echo "Performance benchmarks not available")

## Error Summary

$(find "$LOG_DIR" -name "*.log" -exec grep -l "ERROR\|FAIL" {} \; | while read file; do
    echo "### $(basename "$file")"
    echo "\`\`\`"
    grep "ERROR\|FAIL" "$file" | head -n 5
    echo "\`\`\`"
    echo
done)

## Recommendations

$(if find "$LOG_DIR" -name "*.log" -exec grep -l "FAIL\|ERROR" {} \; | grep -q .; then
    echo "- ❌ Some tests failed. Review the error logs above and fix the issues."
    echo "- 🔍 Run individual test suites to get more detailed error information."
    echo "- 📊 Monitor quality metrics after fixes are applied."
else
    echo "- ✅ All tests passed successfully!"
    echo "- 📈 Consider running performance benchmarks regularly."
    echo "- 🔄 Set up continuous integration for automated testing."
fi)

## Next Steps

1. **Address any failing tests** identified in this report
2. **Review performance metrics** and optimize if necessary
3. **Implement continuous monitoring** using the quality metrics service
4. **Schedule regular QA runs** to ensure ongoing quality
5. **Update test coverage** for any new features

---
*Report generated by WebSocket QA automation script*
EOF

    log_success "QA report generated: $report_file"
    
    # Display summary
    echo -e "\n${CYAN}==================== QA SUMMARY ====================${NC}"
    cat "$report_file" | grep -A 20 "## Test Summary"
    echo -e "${CYAN}====================================================${NC}\n"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    
    # Kill any remaining background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Clean up temporary files if needed
    # (Add any specific cleanup here)
    
    log_info "Cleanup completed"
}

# Main execution
main() {
    START_TIME=$(date +%s)
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    log_section "WebSocket Transcription Progress QA Test Suite"
    log_info "Starting comprehensive quality assurance testing..."
    
    # Initialize environment
    init_test_env
    
    # Install dependencies if --install flag is provided
    if [[ " $@ " =~ " --install " ]]; then
        install_dependencies
    fi
    
    # Run test suites
    if [[ " $@ " =~ " --frontend " ]] || [[ $# -eq 0 ]]; then
        run_frontend_tests
    fi
    
    if [[ " $@ " =~ " --backend " ]] || [[ $# -eq 0 ]]; then
        run_backend_tests
    fi
    
    if [[ " $@ " =~ " --performance " ]] || [[ $# -eq 0 ]]; then
        run_performance_benchmarks
    fi
    
    if [[ " $@ " =~ " --metrics " ]] || [[ $# -eq 0 ]]; then
        validate_quality_metrics
    fi
    
    # Generate final report
    generate_report
    
    log_success "WebSocket QA testing completed successfully!"
}

# Help function
show_help() {
    cat << EOF
WebSocket QA Test Runner

Usage: $0 [OPTIONS]

OPTIONS:
    --help          Show this help message
    --install       Install dependencies before running tests
    --frontend      Run only frontend tests
    --backend       Run only backend tests
    --performance   Run only performance benchmarks
    --metrics       Run only quality metrics validation

EXAMPLES:
    $0                          # Run all tests
    $0 --install               # Install deps and run all tests
    $0 --frontend --backend    # Run frontend and backend tests only
    $0 --performance           # Run performance benchmarks only

ENVIRONMENT VARIABLES:
    TEST_TIMEOUT    Timeout for individual test suites (default: 300s)
    FRONTEND_DIR    Frontend directory path (default: frontend)
    BACKEND_DIR     Backend directory path (default: backend)

EOF
}

# Parse command line arguments
if [[ " $@ " =~ " --help " ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"