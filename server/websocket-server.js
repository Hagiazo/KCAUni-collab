const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');


const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Store active groups and users
const activeGroups = new Map();
const userSockets = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeGroups: activeGroups.size,
    connectedUsers: userSockets.size,
    timestamp: new Date().toISOString()
  });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle collaborative messages
  socket.on('collaborative-message', (message) => {
    const userInfo = userSockets.get(socket.id);
    
    // Handle different message types
    switch (message.type) {
      case 'user_joined':
        handleUserJoined(socket, message);
        break;
      case 'document_change':
        handleDocumentChange(socket, message);
        break;
      case 'cursor_position':
        handleCursorPosition(socket, message);
        break;
      case 'chat_message':
        handleChatMessage(socket, message);
        break;
      case 'operation':
        handleOperation(socket, message);
        break;
      case 'acknowledgment':
        handleAcknowledgment(socket, message);
        break;
      default:
        // Broadcast generic messages
        if (userInfo) {
          socket.to(userInfo.groupId).emit('collaborative-message', message);
        }
    }
  });

  // Handle user joining a group
  function handleUserJoined(socket, message) {
    const { groupId, userId, userName } = message;
    
    // Leave previous groups
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join new group
    socket.join(groupId);
    
    // Store user info
    userSockets.set(socket.id, { userId, userName, groupId });
    
    // Add to active group
    if (!activeGroups.has(groupId)) {
      activeGroups.set(groupId, new Set());
    }
    activeGroups.get(groupId).add(socket.id);

    console.log(`${userName} joined group ${groupId}`);

    // Notify other users in the group
    socket.to(groupId).emit('collaborative-message', {
      type: 'user_joined',
      payload: { groupId },
      userId,
      userName,
      groupId,
      timestamp: new Date()
    });

    // Send current group members to the new user
    const groupMembers = Array.from(activeGroups.get(groupId) || [])
      .map(socketId => userSockets.get(socketId))
      .filter(user => user && user.userId !== userId);
    
    socket.emit('group_members', groupMembers);
  }

  // Handle document changes
  function handleDocumentChange(socket, message) {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      // Broadcast to other users in the group
      socket.to(userInfo.groupId).emit('collaborative-message', {
        ...message,
        timestamp: new Date()
      });
      console.log(`Document change in group ${userInfo.groupId} by ${userInfo.userName}`);
    }
  }

  // Handle cursor position updates
  function handleCursorPosition(socket, message) {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      socket.to(userInfo.groupId).emit('collaborative-message', {
        ...message,
        timestamp: new Date()
      });
    }
  }

  // Handle chat messages
  function handleChatMessage(socket, message) {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      socket.to(userInfo.groupId).emit('collaborative-message', {
        ...message,
        timestamp: new Date()
      });
      console.log(`Chat message in group ${userInfo.groupId}: ${message.payload.message}`);
    }
  }

  // Handle operations for operational transformation
  function handleOperation(socket, message) {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      // In a full implementation, this would include operational transformation
      socket.to(userInfo.groupId).emit('collaborative-message', {
        ...message,
        timestamp: new Date()
      });
      
      // Send acknowledgment back to sender
      socket.emit('collaborative-message', {
        type: 'acknowledgment',
        payload: { operationId: message.payload.id, version: message.payload.version },
        userId: 'server',
        userName: 'Server',
        groupId: userInfo.groupId,
        timestamp: new Date()
      });
    }
  }

  // Handle acknowledgments
  function handleAcknowledgment(socket, message) {
    console.log(`Operation acknowledged: ${message.payload.operationId}`);
  }

  // Handle document changes
  socket.on('document_change', (data) => {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      const { groupId } = userInfo;
      socket.to(groupId).emit('collaborative-message', {
        type: 'document_change',
        payload: data,
        userId: userInfo.userId,
        userName: userInfo.userName,
        groupId,
        timestamp: new Date()
      });
    }
  });

  // Handle cursor position updates (legacy support)
  socket.on('cursor_position', (data) => {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      const { groupId } = userInfo;
      socket.to(groupId).emit('collaborative-message', {
        type: 'cursor_position',
        payload: data,
        userId: userInfo.userId,
        userName: userInfo.userName,
        groupId,
        timestamp: new Date()
      });
    }
  });

  // Handle ping for latency measurement
  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });

  // Handle health check
  socket.on('health_check', () => {
    socket.emit('health_response', {
      status: 'ok',
      timestamp: Date.now(),
      activeGroups: activeGroups.size,
      connectedUsers: userSockets.size
    });
  });
        ...data,
        userId: userInfo.userId,
        userName: userInfo.userName
      });
    }
  });

  // Handle cursor position updates
  socket.on('cursor_position', (data) => {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      const { groupId } = userInfo;
      socket.to(groupId).emit('cursor_position', {
        ...data,
        userId: userInfo.userId,
        userName: userInfo.userName
      });
    }
  });

  // Handle file uploads
  socket.on('file_upload', (data) => {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      const { groupId } = userInfo;
      socket.to(groupId).emit('file_upload', {
        ...data,
        userId: userInfo.userId,
        userName: userInfo.userName
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      const { groupId, userId, userName } = userInfo;
      
      // Remove from active group
      if (activeGroups.has(groupId)) {
        activeGroups.get(groupId).delete(socket.id);
        if (activeGroups.get(groupId).size === 0) {
          activeGroups.delete(groupId);
        }
      }
      
      // Notify other users
      socket.to(groupId).emit('message', {
        type: 'user_left',
        payload: { groupId },
        userId,
        userName,
        timestamp: new Date()
      });
      
      console.log(`${userName} left group ${groupId}`);
    }
    
    userSockets.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log('CORS enabled for:', ["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"]);
});

module.exports = { app, server, io };