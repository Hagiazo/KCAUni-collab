const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// Enhanced data structures for collaboration
const activeDocuments = new Map(); // documentId -> DocumentState
const userSockets = new Map(); // socketId -> UserInfo
const documentUsers = new Map(); // documentId -> Set<socketId>
const operationQueues = new Map(); // documentId -> Operation[]

// Document state structure
class DocumentState {
  constructor(documentId) {
    this.id = documentId;
    this.content = '';
    this.version = 0;
    this.operations = [];
    this.collaborators = new Map();
    this.lastModified = new Date();
  }

  addOperation(operation) {
    this.operations.push(operation);
    this.version = Math.max(this.version, operation.version);
    this.lastModified = new Date();
    
    // Keep only last 1000 operations for memory management
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }
  }

  addCollaborator(socketId, userInfo) {
    this.collaborators.set(socketId, {
      ...userInfo,
      joinedAt: new Date(),
      lastSeen: new Date(),
      isActive: true
    });
  }

  removeCollaborator(socketId) {
    this.collaborators.delete(socketId);
  }

  updateCollaborator(socketId, updates) {
    const collaborator = this.collaborators.get(socketId);
    if (collaborator) {
      Object.assign(collaborator, updates, { lastSeen: new Date() });
    }
  }

  getActiveCollaborators() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Array.from(this.collaborators.values())
      .filter(c => c.lastSeen > fiveMinutesAgo);
  }
}

// Operational Transformation on server side
class ServerOperationalTransform {
  static transform(op1, op2) {
    if (op1.type === 'retain' || op2.type === 'retain') {
      return [op1, op2];
    }

    // Insert vs Insert
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return [
          op1,
          { ...op2, position: op2.position + (op1.content?.length || 0) }
        ];
      } else {
        return [
          { ...op1, position: op1.position + (op2.content?.length || 0) },
          op2
        ];
      }
    }

    // Insert vs Delete
    if (op1.type === 'insert' && op2.type === 'delete') {
      if (op1.position <= op2.position) {
        return [
          op1,
          { ...op2, position: op2.position + (op1.content?.length || 0) }
        ];
      } else if (op1.position <= op2.position + (op2.length || 0)) {
        return [
          { ...op1, position: op2.position },
          op2
        ];
      } else {
        return [
          { ...op1, position: op1.position - (op2.length || 0) },
          op2
        ];
      }
    }

    // Delete vs Insert
    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        return [
          { ...op1, position: op1.position + (op2.content?.length || 0) },
          op2
        ];
      } else if (op2.position <= op1.position + (op1.length || 0)) {
        return [
          op1,
          { ...op2, position: op1.position }
        ];
      } else {
        return [
          op1,
          { ...op2, position: op2.position - (op1.length || 0) }
        ];
      }
    }

    // Delete vs Delete
    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op1.position + (op1.length || 0) <= op2.position) {
        return [
          op1,
          { ...op2, position: op2.position - (op1.length || 0) }
        ];
      } else if (op2.position + (op2.length || 0) <= op1.position) {
        return [
          { ...op1, position: op1.position - (op2.length || 0) },
          op2
        ];
      } else {
        // Overlapping deletes
        const start1 = op1.position;
        const end1 = op1.position + (op1.length || 0);
        const start2 = op2.position;
        const end2 = op2.position + (op2.length || 0);

        const newStart = Math.min(start1, start2);
        const newEnd = Math.max(end1, end2);
        const newLength = newEnd - newStart;

        return [
          { ...op1, position: newStart, length: newLength },
          { ...op2, type: 'retain', position: 0, length: 0 }
        ];
      }
    }

    return [op1, op2];
  }

  static applyOperation(content, operation) {
    switch (operation.type) {
      case 'insert':
        return (
          content.slice(0, operation.position) +
          (operation.content || '') +
          content.slice(operation.position)
        );
      case 'delete':
        return (
          content.slice(0, operation.position) +
          content.slice(operation.position + (operation.length || 0))
        );
      case 'retain':
        return content;
      default:
        return content;
    }
  }
}

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const stats = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeDocuments: activeDocuments.size,
    connectedUsers: userSockets.size,
    totalOperations: Array.from(activeDocuments.values())
      .reduce((sum, doc) => sum + doc.operations.length, 0),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0'
  };
  
  res.json(stats);
});

// Performance metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = {
    documents: Array.from(activeDocuments.entries()).map(([id, doc]) => ({
      id,
      version: doc.version,
      operationCount: doc.operations.length,
      collaboratorCount: doc.collaborators.size,
      lastModified: doc.lastModified
    })),
    connections: Array.from(userSockets.values()).map(user => ({
      userId: user.userId,
      userName: user.userName,
      documentId: user.documentId,
      connectedAt: user.connectedAt,
      lastActivity: user.lastActivity
    }))
  };
  
  res.json(metrics);
});

// Enhanced socket connection handling
io.on('connection', (socket) => {
  console.log('Enhanced WebSocket connection:', socket.id);

  // Handle collaborative messages
  socket.on('collaborative-message', (message) => {
    handleCollaborativeMessage(socket, message);
  });

  // Handle ping for latency measurement
  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    handleDisconnection(socket, reason);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Handle collaborative messages
function handleCollaborativeMessage(socket, message) {
  const { type, documentId, userId, userName, payload } = message;
  
  try {
    switch (type) {
      case 'document-request':
        handleDocumentRequest(socket, message);
        break;
      case 'operation':
        handleOperation(socket, message);
        break;
      case 'cursor':
        handleCursorUpdate(socket, message);
        break;
      case 'presence':
        handlePresenceUpdate(socket, message);
        break;
      case 'acknowledgment':
        handleAcknowledgment(socket, message);
        break;
    }
  } catch (error) {
    console.error('Error handling collaborative message:', error);
    socket.emit('error', { message: 'Failed to process message', error: error.message });
  }
}

// Handle document join request
function handleDocumentRequest(socket, message) {
  const { documentId, userId, userName } = message;
  
  // Store user info
  userSockets.set(socket.id, {
    userId,
    userName,
    documentId,
    socketId: socket.id,
    connectedAt: new Date(),
    lastActivity: new Date()
  });

  // Join document room
  socket.join(documentId);

  // Initialize document if not exists
  if (!activeDocuments.has(documentId)) {
    activeDocuments.set(documentId, new DocumentState(documentId));
  }

  const document = activeDocuments.get(documentId);
  
  // Add user to document users
  if (!documentUsers.has(documentId)) {
    documentUsers.set(documentId, new Set());
  }
  documentUsers.get(documentId).add(socket.id);

  // Add collaborator to document
  document.addCollaborator(socket.id, { userId, userName });

  // Send current document state to new user
  socket.emit('collaborative-message', {
    type: 'document-response',
    documentId,
    userId: 'server',
    userName: 'Server',
    timestamp: Date.now(),
    payload: {
      content: document.content,
      version: document.version,
      collaborators: document.getActiveCollaborators(),
      recentOperations: document.operations.slice(-50)
    }
  });

  // Notify other users of new collaborator
  socket.to(documentId).emit('collaborative-message', {
    type: 'presence',
    documentId,
    userId,
    userName,
    timestamp: Date.now(),
    payload: {
      action: 'joined',
      collaborator: { userId, userName, isActive: true }
    }
  });

  console.log(`User ${userName} joined document ${documentId}`);
}

// Handle operation
function handleOperation(socket, message) {
  const { documentId, payload: operation } = message;
  const document = activeDocuments.get(documentId);
  
  if (!document) {
    socket.emit('error', { message: 'Document not found' });
    return;
  }

  // Transform operation against concurrent operations
  const concurrentOps = getOperationQueue(documentId);
  let transformedOp = operation;

  for (const concurrentOp of concurrentOps) {
    if (concurrentOp.timestamp < operation.timestamp || 
        (concurrentOp.timestamp === operation.timestamp && concurrentOp.userId < operation.userId)) {
      const [, transformed] = ServerOperationalTransform.transform(concurrentOp, transformedOp);
      transformedOp = transformed;
    }
  }

  // Apply operation to document
  document.content = ServerOperationalTransform.applyOperation(document.content, transformedOp);
  document.addOperation(transformedOp);

  // Add to operation queue for conflict resolution
  addToOperationQueue(documentId, transformedOp);

  // Broadcast to other users in the document
  socket.to(documentId).emit('collaborative-message', {
    type: 'operation',
    documentId,
    userId: message.userId,
    userName: message.userName,
    timestamp: Date.now(),
    payload: transformedOp
  });

  // Send acknowledgment back to sender
  socket.emit('collaborative-message', {
    type: 'acknowledgment',
    documentId,
    userId: 'server',
    userName: 'Server',
    timestamp: Date.now(),
    payload: {
      operationId: operation.id,
      version: transformedOp.version,
      success: true
    }
  });

  // Update user activity
  const userInfo = userSockets.get(socket.id);
  if (userInfo) {
    userInfo.lastActivity = new Date();
  }

  console.log(`Operation applied to document ${documentId}: ${transformedOp.type} at ${transformedOp.position}`);
}

// Handle cursor update
function handleCursorUpdate(socket, message) {
  const { documentId } = message;
  const document = activeDocuments.get(documentId);
  
  if (document) {
    document.updateCollaborator(socket.id, {
      cursorPosition: message.payload.position,
      selectionStart: message.payload.selectionStart,
      selectionEnd: message.payload.selectionEnd
    });

    // Broadcast cursor position to other users
    socket.to(documentId).emit('collaborative-message', {
      type: 'cursor',
      documentId,
      userId: message.userId,
      userName: message.userName,
      timestamp: Date.now(),
      payload: message.payload
    });
  }
}

// Handle presence update
function handlePresenceUpdate(socket, message) {
  const { documentId } = message;
  const document = activeDocuments.get(documentId);
  
  if (document) {
    document.updateCollaborator(socket.id, message.payload);

    // Broadcast presence update to other users
    socket.to(documentId).emit('collaborative-message', {
      type: 'presence',
      documentId,
      userId: message.userId,
      userName: message.userName,
      timestamp: Date.now(),
      payload: message.payload
    });
  }
}

// Handle acknowledgment
function handleAcknowledgment(socket, message) {
  const { documentId, payload } = message;
  
  // Remove acknowledged operation from queue
  removeFromOperationQueue(documentId, payload.operationId);
  
  console.log(`Operation ${payload.operationId} acknowledged for document ${documentId}`);
}

// Handle disconnection
function handleDisconnection(socket, reason) {
  const userInfo = userSockets.get(socket.id);
  
  if (userInfo) {
    const { documentId, userId, userName } = userInfo;
    
    // Remove from document users
    if (documentUsers.has(documentId)) {
      documentUsers.get(documentId).delete(socket.id);
    }
    
    // Remove from document collaborators
    const document = activeDocuments.get(documentId);
    if (document) {
      document.removeCollaborator(socket.id);
      
      // Notify other users
      socket.to(documentId).emit('collaborative-message', {
        type: 'presence',
        documentId,
        userId,
        userName,
        timestamp: Date.now(),
        payload: {
          action: 'left',
          collaborator: { userId, userName, isActive: false }
        }
      });
    }
    
    // Clean up empty documents
    if (documentUsers.has(documentId) && documentUsers.get(documentId).size === 0) {
      // Keep document for 1 hour after last user leaves
      setTimeout(() => {
        if (documentUsers.has(documentId) && documentUsers.get(documentId).size === 0) {
          activeDocuments.delete(documentId);
          documentUsers.delete(documentId);
          operationQueues.delete(documentId);
          console.log(`Cleaned up empty document: ${documentId}`);
        }
      }, 60 * 60 * 1000); // 1 hour
    }
    
    userSockets.delete(socket.id);
    console.log(`User ${userName} disconnected from document ${documentId}: ${reason}`);
  }
}

// Operation queue management
function getOperationQueue(documentId) {
  if (!operationQueues.has(documentId)) {
    operationQueues.set(documentId, []);
  }
  return operationQueues.get(documentId);
}

function addToOperationQueue(documentId, operation) {
  const queue = getOperationQueue(documentId);
  queue.push(operation);
  
  // Keep only last 100 operations in queue
  if (queue.length > 100) {
    queue.shift();
  }
}

function removeFromOperationQueue(documentId, operationId) {
  const queue = getOperationQueue(documentId);
  const index = queue.findIndex(op => op.id === operationId);
  if (index > -1) {
    queue.splice(index, 1);
  }
}

// Periodic cleanup and maintenance
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Clean up inactive documents
  for (const [documentId, document] of activeDocuments.entries()) {
    if (document.lastModified < oneHourAgo && 
        (!documentUsers.has(documentId) || documentUsers.get(documentId).size === 0)) {
      activeDocuments.delete(documentId);
      documentUsers.delete(documentId);
      operationQueues.delete(documentId);
      console.log(`Cleaned up inactive document: ${documentId}`);
    }
  }
  
  // Clean up inactive user sockets
  for (const [socketId, userInfo] of userSockets.entries()) {
    if (userInfo.lastActivity < oneHourAgo) {
      userSockets.delete(socketId);
    }
  }
}, 30 * 60 * 1000); // Every 30 minutes

// Document persistence (in production, this would use a database)
setInterval(() => {
  for (const [documentId, document] of activeDocuments.entries()) {
    if (document.operations.length > 0) {
      // Simulate saving to database
      const snapshot = {
        id: documentId,
        content: document.content,
        version: document.version,
        operations: document.operations.slice(-100), // Keep last 100 operations
        lastModified: document.lastModified
      };
      
      // In production, save to database here
      console.log(`Auto-saved document ${documentId} with ${document.operations.length} operations`);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Enhanced WebSocket server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Metrics: http://localhost:${PORT}/metrics`);
  console.log('Features enabled:');
  console.log('- Operational Transformation');
  console.log('- Real-time presence tracking');
  console.log('- Automatic conflict resolution');
  console.log('- Performance monitoring');
  console.log('- Auto-save and persistence');
});

module.exports = { app, server, io };