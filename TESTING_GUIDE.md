# Comprehensive Testing Guide
**Real-Time Collaborative Document System**

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Integration Testing](#integration-testing)
5. [Performance Testing](#performance-testing)
6. [Multi-User Testing](#multi-user-testing)
7. [Edge Case Testing](#edge-case-testing)
8. [Automated Testing](#automated-testing)

## Environment Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Multiple browser instances or devices for multi-user testing

### 1. Backend Server Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the enhanced WebSocket server
npm start

# Server will run on http://localhost:3001
# Health check: http://localhost:3001/health
# Metrics: http://localhost:3001/metrics
```

**Expected Output:**
```
Enhanced WebSocket server running on port 3001
Health check: http://localhost:3001/health
Metrics: http://localhost:3001/metrics
Features enabled:
- Operational Transformation
- Real-time presence tracking
- Automatic conflict resolution
- Performance monitoring
- Auto-save and persistence
```

### 2. Frontend Development Server

```bash
# In project root directory
npm install

# Start development server
npm run dev

# Application will run on http://localhost:8080
```

### 3. Database Setup (Local Development)

The application currently uses localStorage for development. For production testing:

```bash
# Install PostgreSQL locally
# Create database
createdb unicollab_test

# Set environment variables
export DB_HOST=localhost
export DB_NAME=unicollab_test
export DB_USER=your_username
export DB_PASSWORD=your_password
export DB_PORT=5432
```

## Backend Testing

### 1. WebSocket Server Health Check

```bash
# Test server health
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "activeDocuments": 0,
  "connectedUsers": 0,
  "totalOperations": 0,
  "uptime": 123.456,
  "memory": {...},
  "version": "2.0.0"
}
```

### 2. WebSocket Connection Test

```javascript
// Test WebSocket connection in browser console
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

// Test collaborative message
socket.emit('collaborative-message', {
  type: 'document-request',
  documentId: 'test-doc-1',
  userId: 'test-user-1',
  userName: 'Test User',
  timestamp: Date.now(),
  payload: { action: 'join' }
});
```

### 3. Performance Metrics

```bash
# Monitor server metrics
curl http://localhost:3001/metrics

# Expected response includes:
{
  "documents": [...],
  "connections": [...],
  "performance": {...}
}
```

## Frontend Testing

### 1. User Registration and Login

#### Test Case 1: Student Registration
1. Navigate to `/register`
2. Fill form with student email: `2507564@students.kcau.ac.ke`
3. Select course: "Bachelor of Science in Software Development"
4. Select semester: "JAN-APRIL"
5. Complete registration
6. Verify redirect to dashboard

#### Test Case 2: Lecturer Registration
1. Navigate to `/register`
2. Fill form with lecturer email: `0001@lecturer.kcau.ac.ke`
3. Complete registration
4. Verify redirect to dashboard

#### Test Case 3: Login Flow
1. Navigate to `/login`
2. Enter valid credentials
3. Verify successful login and dashboard redirect
4. Check localStorage for user data persistence

### 2. Unit and Group Management

#### Test Case 4: Unit Creation (Lecturer)
1. Login as lecturer
2. Click "Create Unit" button
3. Fill form with unit code: `BSD2301`
4. Complete unit creation
5. Verify unit appears in dashboard

#### Test Case 5: Student Enrollment
1. Login as student
2. Navigate to available units
3. Request enrollment in unit
4. Verify enrollment request sent

#### Test Case 6: Group Creation
1. Login as student enrolled in unit
2. Navigate to unit page
3. Click "Create Group"
4. Fill group details and invite members
5. Verify group creation and member invitations

## Integration Testing

### 1. Real-Time Document Collaboration

#### Test Case 7: Basic Collaborative Editing
1. Open two browser windows/tabs
2. Login as different users in each
3. Navigate to same group workspace
4. Open document tab
5. Type simultaneously in both windows
6. Verify real-time synchronization

**Expected Behavior:**
- Changes appear in real-time (<200ms latency)
- No conflicts or data loss
- Cursor positions visible for both users
- Auto-save indicators working

#### Test Case 8: Operational Transformation
1. Setup two users editing same document
2. User A types "Hello" at position 0
3. User B types "World" at position 0 simultaneously
4. Verify proper conflict resolution
5. Final text should be "HelloWorld" or "WorldHello" consistently

### 2. Presence and Cursor Tracking

#### Test Case 9: User Presence
1. Open document with multiple users
2. Verify user avatars appear in header
3. Move cursor in one window
4. Verify cursor position updates in other windows
5. Close one browser tab
6. Verify user disappears from presence list

### 3. Auto-Save Functionality

#### Test Case 10: Auto-Save Testing
1. Open document and start typing
2. Observe save status indicator
3. Verify "Saving..." appears during save
4. Verify "Saved" with timestamp after completion
5. Refresh browser and verify content persistence

## Performance Testing

### 1. Load Testing Setup

#### Using Artillery.js
```bash
# Install Artillery
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
  socketio:
    transports: ['websocket']

scenarios:
  - name: "Collaborative editing"
    weight: 100
    engine: socketio
    flow:
      - emit:
          channel: "collaborative-message"
          data:
            type: "document-request"
            documentId: "load-test-doc"
            userId: "user-{{ $uuid }}"
            userName: "Load Test User"
            timestamp: "{{ $timestamp }}"
            payload:
              action: "join"
      - think: 1
      - loop:
        - emit:
            channel: "collaborative-message"
            data:
              type: "operation"
              documentId: "load-test-doc"
              userId: "user-{{ $uuid }}"
              userName: "Load Test User"
              timestamp: "{{ $timestamp }}"
              payload:
                id: "op-{{ $uuid }}"
                type: "insert"
                position: 0
                content: "Test content {{ $randomInt(1, 1000) }}"
                userId: "user-{{ $uuid }}"
                timestamp: "{{ $timestamp }}"
                version: 1
        - think: 2
        count: 30
EOF

# Run load test
artillery run load-test.yml
```

### 2. Browser Performance Testing

#### Test Case 11: Large Document Performance
1. Create document with 10,000+ characters
2. Add 10+ concurrent users
3. Perform rapid editing operations
4. Monitor browser performance:
   - Memory usage should stay <100MB
   - CPU usage should stay <30%
   - No memory leaks over 30 minutes

#### Test Case 12: Network Latency Simulation
```javascript
// Simulate network latency in Chrome DevTools
// 1. Open DevTools (F12)
// 2. Go to Network tab
// 3. Set throttling to "Slow 3G"
// 4. Test collaborative editing
// 5. Verify graceful degradation
```

## Multi-User Testing

### 1. Concurrent User Simulation

#### Test Case 13: 10+ User Collaboration
1. Open 10+ browser tabs/windows
2. Login as different users in each
3. Join same document
4. Perform simultaneous operations:
   - Typing at different positions
   - Copy/paste large text blocks
   - Rapid character insertion/deletion
5. Verify no data corruption or conflicts

#### Test Case 14: User Join/Leave Scenarios
1. Start with 2 users in document
2. Add 5 more users gradually
3. Remove users randomly
4. Verify presence updates correctly
5. Verify document state remains consistent

### 2. Cross-Browser Testing

#### Test Case 15: Browser Compatibility
Test on each browser:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test Steps:**
1. Open collaborative document
2. Perform basic editing operations
3. Verify real-time synchronization
4. Test cursor tracking
5. Verify auto-save functionality

## Edge Case Testing

### 1. Network Failure Scenarios

#### Test Case 16: Complete Network Disconnection
1. Start collaborative editing session
2. Disconnect network (disable WiFi/ethernet)
3. Continue typing for 30 seconds
4. Reconnect network
5. Verify all changes sync correctly

#### Test Case 17: WebSocket Server Restart
1. Start collaborative session with multiple users
2. Restart WebSocket server
3. Verify automatic reconnection
4. Verify document state consistency
5. Verify no data loss

### 2. Rapid Operation Testing

#### Test Case 18: Stress Testing Operations
```javascript
// Rapid operation generation script
function stressTest() {
  const operations = [];
  for (let i = 0; i < 1000; i++) {
    setTimeout(() => {
      // Simulate rapid typing
      const event = new Event('input');
      const textarea = document.querySelector('textarea');
      textarea.value += `${i} `;
      textarea.dispatchEvent(event);
    }, i * 10); // 10ms intervals
  }
}

// Run in browser console
stressTest();
```

### 3. Large Document Testing

#### Test Case 19: Document Size Limits
1. Create document with 50,000+ characters
2. Add multiple users
3. Perform editing operations
4. Monitor performance metrics
5. Verify no degradation in responsiveness

## Automated Testing

### 1. Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Expected coverage targets:
# - Statements: >90%
# - Branches: >85%
# - Functions: >90%
# - Lines: >90%
```

### 2. Integration Tests

```javascript
// Example integration test
describe('Collaborative Document', () => {
  test('should handle concurrent operations', async () => {
    const doc1 = new CollaborativeDocument('test-doc');
    const doc2 = new CollaborativeDocument('test-doc');
    
    // Simulate concurrent operations
    const op1 = doc1.createOperation('user1', 'insert', 0, 'Hello');
    const op2 = doc2.createOperation('user2', 'insert', 0, 'World');
    
    // Apply operations
    doc1.applyLocalOperation(op1);
    doc2.applyRemoteOperation(op1);
    doc1.applyRemoteOperation(op2);
    doc2.applyLocalOperation(op2);
    
    // Verify consistency
    expect(doc1.getContent()).toBe(doc2.getContent());
  });
});
```

### 3. End-to-End Tests

```javascript
// Using Playwright for E2E testing
const { test, expect } = require('@playwright/test');

test('collaborative editing workflow', async ({ browser }) => {
  // Create two browser contexts (different users)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Login as different users
  await page1.goto('/login');
  await page1.fill('[data-testid="email"]', 'user1@students.kcau.ac.ke');
  await page1.fill('[data-testid="password"]', 'password');
  await page1.click('[data-testid="login-button"]');
  
  await page2.goto('/login');
  await page2.fill('[data-testid="email"]', 'user2@students.kcau.ac.ke');
  await page2.fill('[data-testid="password"]', 'password');
  await page2.click('[data-testid="login-button"]');
  
  // Navigate to same document
  await page1.goto('/group/test-group');
  await page2.goto('/group/test-group');
  
  // Test collaborative editing
  await page1.fill('[data-testid="document-editor"]', 'Hello from User 1');
  await page2.fill('[data-testid="document-editor"]', 'Hello from User 2');
  
  // Verify synchronization
  const content1 = await page1.textContent('[data-testid="document-editor"]');
  const content2 = await page2.textContent('[data-testid="document-editor"]');
  
  expect(content1).toBe(content2);
});
```

## Performance Benchmarks

### 1. Acceptable Performance Thresholds

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Operation Latency | <50ms | <200ms | >500ms |
| Auto-save Time | <100ms | <500ms | >2000ms |
| UI Response Time | <16ms | <100ms | >300ms |
| Memory Usage | <50MB | <200MB | >500MB |
| CPU Usage | <10% | <30% | >70% |

### 2. Load Testing Targets

| Scenario | Users | Duration | Success Rate |
|----------|-------|----------|--------------|
| Basic Editing | 10 | 5 minutes | >99% |
| Heavy Load | 50 | 10 minutes | >95% |
| Stress Test | 100 | 15 minutes | >90% |

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: WebSocket Connection Fails
**Symptoms:** "Connection failed" toast message
**Solutions:**
1. Verify server is running on port 3001
2. Check firewall settings
3. Verify CORS configuration
4. Check browser console for errors

#### Issue 2: Operations Not Syncing
**Symptoms:** Changes not appearing in other windows
**Solutions:**
1. Check WebSocket connection status
2. Verify user is properly authenticated
3. Check browser console for JavaScript errors
4. Restart WebSocket server

#### Issue 3: Performance Degradation
**Symptoms:** Slow response times, high CPU usage
**Solutions:**
1. Check document size (>100KB may cause issues)
2. Reduce number of concurrent users
3. Clear browser cache and localStorage
4. Monitor server memory usage

#### Issue 4: Auto-save Failures
**Symptoms:** "Save failed" error messages
**Solutions:**
1. Check localStorage quota
2. Verify network connectivity
3. Check browser permissions
4. Clear localStorage and refresh

## Test Data Generation

### 1. Sample Users

```javascript
// Create test users
const testUsers = [
  { email: '2507564@students.kcau.ac.ke', password: 'test123', role: 'student', name: 'John Doe' },
  { email: '2507565@students.kcau.ac.ke', password: 'test123', role: 'student', name: 'Jane Smith' },
  { email: '0001@lecturer.kcau.ac.ke', password: 'test123', role: 'lecturer', name: 'Dr. Johnson' }
];
```

### 2. Sample Documents

```javascript
// Large document content for testing
const largeDocument = `
# Large Test Document

${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(1000)}

## Section 2
${'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(500)}

## Section 3
${'Ut enim ad minim veniam, quis nostrud exercitation ullamco. '.repeat(750)}
`;
```

## Continuous Integration Testing

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Collaborative System Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        npm install
        cd server && npm install
        
    - name: Start WebSocket server
      run: |
        cd server && npm start &
        sleep 5
        
    - name: Run unit tests
      run: npm test
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Run E2E tests
      run: npm run test:e2e
      
    - name: Performance tests
      run: npm run test:performance
```

## Monitoring and Alerting

### 1. Performance Monitoring

```javascript
// Add to application for production monitoring
class ProductionMonitor {
  static trackOperation(operationType, duration) {
    // Send to monitoring service (e.g., DataDog, New Relic)
    if (duration > 200) {
      console.warn(`Slow operation detected: ${operationType} took ${duration}ms`);
    }
  }
  
  static trackError(error, context) {
    // Send to error tracking service (e.g., Sentry)
    console.error('Application error:', error, context);
  }
}
```

### 2. Health Check Monitoring

```bash
# Setup health check monitoring
#!/bin/bash
while true; do
  response=$(curl -s http://localhost:3001/health)
  status=$(echo $response | jq -r '.status')
  
  if [ "$status" != "ok" ]; then
    echo "ALERT: Server health check failed"
    # Send alert notification
  fi
  
  sleep 30
done
```

## Test Reporting

### 1. Test Results Format

```json
{
  "testSuite": "Collaborative Document System",
  "timestamp": "2024-12-23T10:00:00Z",
  "results": {
    "total": 50,
    "passed": 48,
    "failed": 2,
    "skipped": 0
  },
  "performance": {
    "averageLatency": "45ms",
    "maxConcurrentUsers": 25,
    "documentSizeLimit": "100KB",
    "memoryUsage": "85MB"
  },
  "coverage": {
    "statements": 92,
    "branches": 88,
    "functions": 95,
    "lines": 91
  }
}
```

### 2. Performance Report

```markdown
## Performance Test Results

### Latency Measurements
- P50: 45ms
- P95: 120ms
- P99: 250ms

### Throughput
- Operations per second: 150
- Concurrent users supported: 50+
- Document size limit: 1MB

### Resource Usage
- Memory per user: ~2MB
- CPU usage: <5% per user
- Network bandwidth: ~1KB/s per user
```

## Security Testing

### 1. Authentication Testing

```bash
# Test authentication endpoints
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@students.kcau.ac.ke","password":"wrongpassword"}'

# Expected: 401 Unauthorized
```

### 2. Input Validation Testing

```javascript
// Test malicious input handling
const maliciousInputs = [
  '<script>alert("xss")</script>',
  '"; DROP TABLE users; --',
  '../../../etc/passwd',
  'A'.repeat(100000) // Very long string
];

// Test each input in document editor
maliciousInputs.forEach(input => {
  // Verify proper sanitization and handling
});
```

## Deployment Testing

### 1. Production Environment Setup

```bash
# Build for production
npm run build

# Start production server
npm run start:prod

# Verify production build
curl http://localhost:8080/health
```

### 2. Docker Testing

```dockerfile
# Dockerfile for testing
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8080 3001
CMD ["npm", "run", "start:prod"]
```

```bash
# Build and test Docker image
docker build -t unicollab:test .
docker run -p 8080:8080 -p 3001:3001 unicollab:test

# Test containerized application
curl http://localhost:8080/health
```

---

## Test Execution Checklist

### Pre-Testing
- [ ] Backend server running on port 3001
- [ ] Frontend server running on port 8080
- [ ] Test users created and verified
- [ ] Browser developer tools open for monitoring
- [ ] Network conditions documented

### During Testing
- [ ] Monitor browser console for errors
- [ ] Check WebSocket connection status
- [ ] Monitor server health endpoint
- [ ] Document any anomalies or issues
- [ ] Take screenshots/videos of critical tests

### Post-Testing
- [ ] Generate test report
- [ ] Document performance metrics
- [ ] Report any bugs found
- [ ] Update test cases based on findings
- [ ] Archive test results for future reference

**Note:** Always test in a clean environment with cleared browser cache and localStorage to ensure accurate results.