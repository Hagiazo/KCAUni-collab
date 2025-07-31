const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration for development and production
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:8080", 
      "http://localhost:3000", 
      "http://localhost:5173",
      "https://localhost:8080",
      // Add any production URLs here
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: [
    "http://localhost:8080", 
    "http://localhost:3000", 
    "http://localhost:5173",
    "https://localhost:8080"
  ],
  credentials: true
}));
app.use(express.json());

// Data structures for real-time collaboration
const activeDocuments = new Map(); // documentId -> DocumentState
const userSessions = new Map(); // socketId -> UserSession
const groupRooms = new Map(); // groupId -> Set<socketId>
const operationHistory = new Map(); // documentId -> Operation[]

// Document state management
class DocumentState {
  constructor(documentId) {
    this.id = documentId;
    this.content = '';
    this.version = 0;
    this.operations = [];
    this.collaborators = new Map();
    this.lastModified = new Date();
    this.autoSaveTimer = null;
  }

  addOperation(operation) {
    this.operations.push(operation);
    this.version = Math.max(this.version, operation.version || this.version + 1);
    this.lastModified = new Date();
    
    // Keep only last 500 operations for memory efficiency
    if (this.operations.length > 500) {
      this.operations = this.operations.slice(-500);
    }

    // Schedule auto-save
    this.scheduleAutoSave();
  }

  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setTimeout(() => {
      this.saveToStorage();
    }, 2000);
  }

  saveToStorage() {
    try {
      // In production, this would save to a database
      // For now, we'll just log the save operation
      console.log(`Auto-saved document ${this.id} with version ${this.version}`);
    } catch (error) {
      console.error('Failed to save document:', error);
    }
  }

  addCollaborator(socketId, userInfo) {
    this.collaborators.set(socketId, {
      ...userInfo,
      joinedAt: new Date(),
      lastSeen: new Date(),
      isActive: true,
      cursorPosition: 0
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

// User session management
class UserSession {
  constructor(socketId, userId, userName, groupId) {
    this.socketId = socketId;
    this.userId = userId;
    this.userName = userName;
    this.groupId = groupId;
    this.connectedAt = new Date();
    this.lastActivity = new Date();
    this.isActive = true;
  }

  updateActivity() {
    this.lastActivity = new Date();
    this.isActive = true;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeDocuments: activeDocuments.size,
    connectedUsers: userSessions.size,
    activeGroups: groupRooms.size,
    totalOperations: Array.from(activeDocuments.values())
      .reduce((sum, doc) => sum + doc.operations.length, 0),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.1.0'
  };
  
  res.json(stats);
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  const metrics = {
    documents: Array.from(activeDocuments.entries()).map(([id, doc]) => ({
      id,
      version: doc.version,
      operationCount: doc.operations.length,
      collaboratorCount: doc.collaborators.size,
      lastModified: doc.lastModified
    })),
    sessions: Array.from(userSessions.values()).map(session => ({
      userId: session.userId,
      userName: session.userName,
      groupId: session.groupId,
      connectedAt: session.connectedAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive
    })),
    performance: {
      totalMemoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      activeConnections: userSessions.size
    }
  };
  
  res.json(metrics);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('New WebSocket connection:', socket.id);

  // Handle collaborative messages
  socket.on('collaborative-message', (message) => {
    try {
      handleCollaborativeMessage(socket, message);
    } catch (error) {
      console.error('Error handling collaborative message:', error);
      socket.emit('error', { 
        message: 'Failed to process collaborative message', 
        error: error.message 
      });
    }
  });

  // Handle ping for latency measurement
  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    try {
      handleChatMessage(socket, data);
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });

  // Handle file uploads
  socket.on('file-upload', (data) => {
    try {
      handleFileUpload(socket, data);
    } catch (error) {
      console.error('Error handling file upload:', error);
    }
  });

  // Handle task updates
  socket.on('task-update', (data) => {
    try {
      handleTaskUpdate(socket, data);
    } catch (error) {
      console.error('Error handling task update:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    handleDisconnection(socket, reason);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error for', socket.id, ':', error);
  });
});

// Handle collaborative messages (document editing)
function handleCollaborativeMessage(socket, message) {
  const { type, documentId, userId, userName, payload, groupId } = message;
  
  switch (type) {
    case 'document-request':
    case 'user_joined':
      handleUserJoinDocument(socket, message);
      break;
    case 'document_change':
      handleDocumentChange(socket, message);
      break;
    case 'operation':
      handleOperation(socket, message);
      break;
    case 'cursor_position':
      handleCursorUpdate(socket, message);
      break;
    case 'user_left':
      handleUserLeaveDocument(socket, message);
      break;
    default:
      console.log('Unknown collaborative message type:', type);
  }
}

// Handle user joining a document
function handleUserJoinDocument(socket, message) {
  const { documentId, userId, userName, groupId } = message;
  
  // Create user session
  const session = new UserSession(socket.id, userId, userName, groupId);
  userSessions.set(socket.id, session);

  // Join socket rooms
  socket.join(documentId);
  if (groupId) {
    socket.join(groupId);
    
    // Track group room
    if (!groupRooms.has(groupId)) {
      groupRooms.set(groupId, new Set());
    }
    groupRooms.get(groupId).add(socket.id);
  }

  // Initialize document if not exists
  if (!activeDocuments.has(documentId)) {
    activeDocuments.set(documentId, new DocumentState(documentId));
  }

  const document = activeDocuments.get(documentId);
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
      collaborators: document.getActiveCollaborators()
    }
  });

  // Notify other users in the document
  socket.to(documentId).emit('collaborative-message', {
    type: 'user_joined',
    documentId,
    userId,
    userName,
    groupId,
    timestamp: Date.now(),
    payload: { action: 'joined' }
  });

  console.log(`User ${userName} (${userId}) joined document ${documentId}`);
}

// Handle document content changes
function handleDocumentChange(socket, message) {
  const { documentId, payload } = message;
  const document = activeDocuments.get(documentId);
  
  if (!document) {
    socket.emit('error', { message: 'Document not found' });
    return;
  }

  // Update document content
  document.content = payload.content;
  document.version = payload.version;
  document.lastModified = new Date();

  // Update user activity
  const session = userSessions.get(socket.id);
  if (session) {
    session.updateActivity();
  }

  // Broadcast to other users in the document
  socket.to(documentId).emit('collaborative-message', {
    type: 'document_change',
    documentId,
    userId: message.userId,
    userName: message.userName,
    timestamp: Date.now(),
    payload: payload
  });

  console.log(`Document ${documentId} updated by ${message.userName}`);
}

// Handle operations (for operational transformation)
function handleOperation(socket, message) {
  const { documentId, payload: operation } = message;
  const document = activeDocuments.get(documentId);
  
  if (!document) {
    socket.emit('error', { message: 'Document not found' });
    return;
  }

  // Add operation to document
  document.addOperation(operation);

  // Update user activity
  const session = userSessions.get(socket.id);
  if (session) {
    session.updateActivity();
  }

  // Broadcast operation to other users
  socket.to(documentId).emit('collaborative-message', {
    type: 'operation',
    documentId,
    userId: message.userId,
    userName: message.userName,
    timestamp: Date.now(),
    payload: operation
  });

  // Send acknowledgment
  socket.emit('collaborative-message', {
    type: 'acknowledgment',
    documentId,
    userId: 'server',
    userName: 'Server',
    timestamp: Date.now(),
    payload: {
      operationId: operation.id,
      version: document.version,
      success: true
    }
  });
}

// Handle cursor position updates
function handleCursorUpdate(socket, message) {
  const { documentId, payload } = message;
  const document = activeDocuments.get(documentId);
  
  if (document) {
    document.updateCollaborator(socket.id, {
      cursorPosition: payload.position,
      selectionStart: payload.selectionStart,
      selectionEnd: payload.selectionEnd
    });

    // Broadcast cursor position to other users
    socket.to(documentId).emit('collaborative-message', {
      type: 'cursor_position',
      documentId,
      userId: message.userId,
      userName: message.userName,
      timestamp: Date.now(),
      payload: payload
    });
  }
}

// Handle user leaving document
function handleUserLeaveDocument(socket, message) {
  const { documentId, userId, userName, groupId } = message;
  
  // Remove from document
  const document = activeDocuments.get(documentId);
  if (document) {
    document.removeCollaborator(socket.id);
  }

  // Notify other users
  socket.to(documentId).emit('collaborative-message', {
    type: 'user_left',
    documentId,
    userId,
    userName,
    groupId,
    timestamp: Date.now(),
    payload: { action: 'left' }
  });
}

// Handle chat messages
function handleChatMessage(socket, data) {
  const { groupId, message, userId, userName } = data;
  
  if (!groupId) return;

  // Update user activity
  const session = userSessions.get(socket.id);
  if (session) {
    session.updateActivity();
  }

  // Broadcast chat message to group
  socket.to(groupId).emit('collaborative-message', {
    type: 'chat_message',
    groupId,
    userId,
    userName,
    timestamp: Date.now(),
    payload: {
      message,
      timestamp: new Date()
    }
  });

  console.log(`Chat message in group ${groupId} from ${userName}: ${message}`);
}

// Handle file uploads
function handleFileUpload(socket, data) {
  const { groupId, fileData, userId, userName } = data;
  
  if (!groupId) return;

  // Update user activity
  const session = userSessions.get(socket.id);
  if (session) {
    session.updateActivity();
  }

  // Broadcast file upload to group
  socket.to(groupId).emit('collaborative-message', {
    type: 'file_uploaded',
    groupId,
    userId,
    userName,
    timestamp: Date.now(),
    payload: fileData
  });

  console.log(`File uploaded in group ${groupId} by ${userName}: ${fileData.fileName}`);
}

// Handle task updates
function handleTaskUpdate(socket, data) {
  const { groupId, taskData, userId, userName } = data;
  
  if (!groupId) return;

  // Update user activity
  const session = userSessions.get(socket.id);
  if (session) {
    session.updateActivity();
  }

  // Broadcast task update to group
  socket.to(groupId).emit('collaborative-message', {
    type: 'task_updated',
    groupId,
    userId,
    userName,
    timestamp: Date.now(),
    payload: taskData
  });

  console.log(`Task updated in group ${groupId} by ${userName}`);
}

// Handle disconnection
function handleDisconnection(socket, reason) {
  const session = userSessions.get(socket.id);
  
  if (session) {
    const { userId, userName, groupId } = session;
    
    // Remove from all documents
    for (const [documentId, document] of activeDocuments.entries()) {
      if (document.collaborators.has(socket.id)) {
        document.removeCollaborator(socket.id);
        
        // Notify other users in the document
        socket.to(documentId).emit('collaborative-message', {
          type: 'user_left',
          documentId,
          userId,
          userName,
          groupId,
          timestamp: Date.now(),
          payload: { action: 'disconnected', reason }
        });
      }
    }
    
    // Remove from group rooms
    if (groupId && groupRooms.has(groupId)) {
      groupRooms.get(groupId).delete(socket.id);
      
      // Clean up empty group rooms
      if (groupRooms.get(groupId).size === 0) {
        groupRooms.delete(groupId);
      }
    }
    
    // Clean up session
    userSessions.delete(socket.id);
    
    console.log(`User ${userName} (${userId}) disconnected: ${reason}`);
  }

  // Clean up empty documents after delay
  setTimeout(() => {
    for (const [documentId, document] of activeDocuments.entries()) {
      if (document.collaborators.size === 0) {
        activeDocuments.delete(documentId);
        operationHistory.delete(documentId);
        console.log(`Cleaned up empty document: ${documentId}`);
      }
    }
  }, 30000); // 30 seconds delay
}

// Periodic cleanup and maintenance
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Clean up inactive sessions
  for (const [socketId, session] of userSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      userSessions.delete(socketId);
    }
  }
  
  // Clean up inactive documents
  for (const [documentId, document] of activeDocuments.entries()) {
    if (document.lastModified < oneHourAgo && document.collaborators.size === 0) {
      activeDocuments.delete(documentId);
      operationHistory.delete(documentId);
      console.log(`Cleaned up inactive document: ${documentId}`);
    }
  }
  
  console.log(`Cleanup completed. Active: ${activeDocuments.size} docs, ${userSessions.size} sessions`);
}, 30 * 60 * 1000); // Every 30 minutes

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');
  
  // Notify all connected clients
  io.emit('server-shutdown', { 
    message: 'Server is shutting down for maintenance',
    timestamp: Date.now()
  });
  
  // Close server
  server.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forcing server shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log('✅ Features enabled:');
  console.log('   - Real-time document collaboration');
  console.log('   - Group chat messaging');
  console.log('   - File sharing');
  console.log('   - Task management');
  console.log('   - Presence tracking');
  console.log('   - Auto-save functionality');
  console.log('   - Performance monitoring');
});

// Export for testing
module.exports = { app, server, io };