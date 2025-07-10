# WebSocket Transcription Progress QA Guide

This guide provides comprehensive instructions for quality assurance testing of the WebSocket transcription progress feature implemented by Iris and Hermes.

## Overview

The WebSocket transcription progress system consists of:
- **Frontend Component**: `TranscriptionProgressIndicator.tsx` (React component)
- **Backend Service**: `WebSocketService.ts` (Node.js/Socket.IO service)
- **Quality Metrics**: `QualityMetricsService.ts` (Monitoring and metrics collection)

## Quick Start

### Run All QA Tests
```bash
# Install dependencies and run all tests
npm run qa:websocket:install

# Run all tests (without installing dependencies)
npm run qa:websocket
```

### Run Specific Test Suites
```bash
# Frontend tests only
npm run qa:frontend

# Backend tests only  
npm run qa:backend

# Performance benchmarks only
npm run qa:performance

# Quality metrics validation only
npm run qa:metrics
```

## Test Categories

### 1. Connection Reliability Tests
**Location**: `frontend/components/__tests__/TranscriptionProgress.test.tsx`

Tests WebSocket connection establishment, reconnection, and stability:
- ✅ Connection establishment with correct URL
- ✅ Subscription message handling
- ✅ Connection failure recovery
- ✅ Automatic reconnection logic
- ✅ Graceful disconnection handling
- ✅ Multiple client support

**Key Metrics**:
- Connection success rate > 95%
- Average connection time < 200ms
- Reconnection time < 5 seconds

### 2. Progress Data Accuracy Tests
**Location**: `frontend/components/__tests__/WebSocketIntegration.test.tsx`

Validates data accuracy and message integrity:
- ✅ Progress sequence validation
- ✅ Data consistency across updates
- ✅ Queue position tracking
- ✅ Time estimation accuracy
- ✅ Message filtering by transcription ID
- ✅ Malformed message handling

**Key Metrics**:
- Message accuracy: 100%
- Data consistency: No regressions
- Processing latency < 50ms

### 3. Error Handling Tests  
**Location**: `frontend/components/__tests__/WebSocketErrorHandling.test.tsx`

Comprehensive error scenario testing:
- ✅ Connection failure scenarios
- ✅ Intermittent connectivity issues
- ✅ Message corruption handling
- ✅ Network timeout recovery
- ✅ Server error responses
- ✅ User interaction during errors

**Key Metrics**:
- Error recovery rate > 90%
- Error handling latency < 1 second
- No data loss during errors

### 4. Performance Benchmarks
**Location**: `frontend/components/__tests__/WebSocketPerformance.test.tsx`

Performance and scalability validation:
- ✅ Message processing speed
- ✅ Memory usage monitoring
- ✅ High-frequency update handling
- ✅ Connection scalability
- ✅ Render performance optimization
- ✅ Resource cleanup efficiency

**Key Metrics**:
- Message throughput > 50 msg/sec
- Memory growth < 1MB per session
- Render time < 50ms per update

### 5. Security Validation Tests
**Location**: `backend/tests/websocket.security.test.ts`

Security and access control testing:
- ✅ Input validation and sanitization
- ✅ Access control isolation
- ✅ Rate limiting protection
- ✅ Data leakage prevention
- ✅ Protocol security validation
- ✅ Resource exhaustion protection

**Key Metrics**:
- Security score: 100%
- No data leakage incidents
- DoS protection effectiveness

### 6. Backend Service Tests
**Location**: `backend/tests/websocket.service.test.ts`

Comprehensive backend functionality testing:
- ✅ Service initialization
- ✅ Client connection management
- ✅ Message broadcasting
- ✅ Progress tracking accuracy
- ✅ Error reporting mechanisms
- ✅ Memory management

**Key Metrics**:
- Service uptime > 99.9%
- Message delivery rate > 99%
- Memory leak prevention

## Quality Metrics Dashboard

### Real-time Monitoring
The `QualityMetricsService` provides continuous monitoring:

```typescript
// Get current metrics
const metrics = websocketService.getQualityMetrics();
console.log('Connection Success Rate:', metrics.connection.successRate);
console.log('Message Drop Rate:', metrics.message.dropRate);
console.log('Average Latency:', metrics.message.averageLatency);

// Get overall quality score (0-100)
const qualityScore = websocketService.getQualityScore();
console.log('Quality Score:', qualityScore);

// Get health status
const health = websocketService.getHealthStatus(); // 'healthy' | 'warning' | 'critical'
```

### Key Performance Indicators (KPIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Connection Success Rate | > 95% | < 95% | < 90% |
| Message Drop Rate | < 1% | > 1% | > 5% |
| Average Latency | < 100ms | > 100ms | > 500ms |
| Error Rate | < 2% | > 2% | > 10% |
| Quality Score | > 80 | < 80 | < 50 |

## Test Execution Guidelines

### Pre-test Setup
1. **Environment Validation**:
   ```bash
   # Check Node.js version (>= 18.0.0)
   node --version
   
   # Check npm version (>= 8.0.0)
   npm --version
   
   # Verify project structure
   ls -la frontend/ backend/
   ```

2. **Dependency Installation**:
   ```bash
   # Install all dependencies
   npm run install:all
   ```

### Running Tests

1. **Complete QA Suite**:
   ```bash
   # Full QA run with dependency installation
   npm run qa:websocket:install
   
   # View detailed logs
   tail -f logs/qa-tests/qa-test.log
   ```

2. **Individual Test Suites**:
   ```bash
   # Frontend only (connection, integration, error handling, performance)
   npm run qa:frontend
   
   # Backend only (service, security)
   npm run qa:backend
   
   # Performance benchmarks
   npm run qa:performance
   
   # Quality metrics validation
   npm run qa:metrics
   ```

3. **Development Testing**:
   ```bash
   # Watch mode for frontend tests
   cd frontend && npm run test:watch
   
   # Watch mode for backend tests  
   cd backend && npm run test:watch
   
   # Specific WebSocket tests only
   npm run test:websocket
   ```

### Test Results Analysis

1. **Automated Reports**: Check `reports/qa-tests/` directory for comprehensive reports
2. **Log Analysis**: Review `logs/qa-tests/` for detailed execution logs
3. **Coverage Reports**: Use `npm run coverage:combined` for test coverage analysis

## Troubleshooting

### Common Issues

1. **Connection Timeouts**:
   ```bash
   # Increase timeout in test configuration
   export TEST_TIMEOUT=600  # 10 minutes
   npm run qa:websocket
   ```

2. **Port Conflicts**:
   ```bash
   # Check for conflicting processes
   lsof -i :3000 -i :3001
   
   # Kill conflicting processes if needed
   pkill -f "node.*3000\|node.*3001"
   ```

3. **Memory Issues**:
   ```bash
   # Run with increased memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run qa:websocket
   ```

4. **Test Failures**:
   ```bash
   # Run individual failing test for detailed output
   cd frontend
   npm test -- --testPathPattern="TranscriptionProgress" --verbose
   
   cd backend  
   npm test -- --testPathPattern="websocket.service" --verbose
   ```

### Debug Mode

Enable detailed debugging:
```bash
# Enable debug mode
export DEBUG="socket.io*,websocket*"
export NODE_ENV="test"
npm run qa:websocket
```

## Continuous Integration

### GitHub Actions Integration
```yaml
name: WebSocket QA
on: [push, pull_request]
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm run qa:websocket:install
      - uses: actions/upload-artifact@v3
        with:
          name: qa-reports
          path: reports/
```

### Local Development Hooks
```bash
# Add to package.json scripts
"pre-commit": "npm run qa:websocket",
"pre-push": "npm run qa:websocket"
```

## Quality Standards

### Acceptance Criteria
All tests must pass with the following standards:
- ✅ **Functionality**: All features work as specified
- ✅ **Performance**: Meets or exceeds performance benchmarks
- ✅ **Reliability**: Handles error scenarios gracefully  
- ✅ **Security**: Passes all security validation tests
- ✅ **Scalability**: Supports concurrent users without degradation

### Commercial-Grade Requirements
- **Uptime**: 99.9% availability
- **Latency**: < 100ms average response time
- **Throughput**: > 1000 concurrent connections
- **Error Rate**: < 0.1% message failures
- **Security**: Zero critical vulnerabilities

## Monitoring in Production

### Real-time Alerts
Configure alerts for:
```javascript
// Quality score drops below 70
if (qualityScore < 70) {
  alert('WebSocket quality degradation detected');
}

// High error rate
if (errorRate > 0.05) {
  alert('WebSocket error rate exceeded threshold');
}

// Connection failures
if (connectionFailureRate > 0.1) {
  alert('WebSocket connection issues detected');
}
```

### Metrics Dashboard
Implement monitoring dashboard showing:
- Real-time connection count
- Message throughput graphs
- Error rate trends  
- Performance metrics
- Quality score history

## Support and Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Run full QA suite
2. **Monthly**: Review performance trends
3. **Quarterly**: Update test scenarios
4. **Annually**: Security audit

### Performance Optimization
Monitor and optimize:
- Connection pooling efficiency
- Message serialization performance
- Memory usage patterns
- Network latency optimization

---

## Team Contacts

- **Frontend (Iris)**: TranscriptionProgressIndicator.tsx implementation
- **Backend (Hermes)**: WebSocketService.ts implementation  
- **QA Committee (Minerva)**: Quality assurance oversight

For technical support or questions about this QA guide, please contact the development team.