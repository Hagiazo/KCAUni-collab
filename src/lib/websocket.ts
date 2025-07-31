import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  type: 'document_change' | 'cursor_position' | 'user_joined' | 'user_left' | 'file_uploaded' | 'chat_message' | 'task_updated' | 'operation' | 'acknowledgment';
  payload: any;
  userId: string;
  userName: string;
  groupId: string;
  timestamp: Date;
}

export interface DocumentChange {
  documentId: string;
  content: string;
  cursorPosition: number;
  version: number;
  operation?: {
    type: 'insert' | 'delete' | 'retain';
    position: number;
    content?: string;
    length?: number;
  };
}

export interface FileUpload {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  content?: string; // For text files
  url?: string; // For binary files
}

class WebSocketManager {
  private socket: Socket | null = null;
  private groupId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private connectionAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isReconnecting: boolean = false;

  connect(groupId: string, userId: string, userName: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io('http://localhost:3001', {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: Math.min(1000 * Math.pow(2, this.connectionAttempts), 10000),
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000
    });

    this.groupId = groupId;
    this.userId = userId;
    this.userName = userName;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connectionAttempts = 0;
      this.isReconnecting = false;
      this.joinGroup(groupId);
      this.emit('connection_status', { connected: true, attempts: this.connectionAttempts });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.emit('connection_status', { connected: false, attempts: this.connectionAttempts });
    });

    this.socket.on('collaborative-message', (message: WebSocketMessage) => {
      this.handleMessage(message);
    });

    this.socket.on('connect_error', (error) => {
      this.connectionAttempts++;
      console.warn(`WebSocket connection failed (attempt ${this.connectionAttempts}):`, error);
      
      if (this.connectionAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached, falling back to local mode');
        this.handleLocalFallback();
      }
      
      this.emit('connection_status', { 
        connected: false, 
        attempts: this.connectionAttempts,
        error: error.message 
      });
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to WebSocket server after', attemptNumber, 'attempts');
      this.connectionAttempts = 0;
      this.isReconnecting = false;
      this.joinGroup(groupId);
      this.emit('connection_status', { connected: true, attempts: 0 });
    });
  }

  private handleLocalFallback() {
    // Implement local storage fallback for offline collaboration
    console.log('Using local storage fallback mode');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  joinGroup(groupId: string) {
    if (this.socket) {
      this.socket.emit('collaborative-message', {
        type: 'user_joined',
        groupId,
        userId: this.userId,
        userName: this.userName,
        timestamp: new Date(),
        payload: { action: 'join' }
      });
    }
  }

  sendMessage(type: WebSocketMessage['type'], payload: any) {
    const message: WebSocketMessage = {
      type,
      payload,
      userId: this.userId!,
      userName: this.userName!,
      groupId: this.groupId!,
      groupId: this.groupId!,
      timestamp: new Date()
    };

    if (this.socket?.connected) {
      this.socket.emit('collaborative-message', message);
    } else {
      // Fallback to local storage for offline mode
      this.handleLocalMessage(message);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type) || [];
    listeners.forEach(listener => listener(message));
  }

  private handleLocalMessage(message: WebSocketMessage) {
    // Store in localStorage for offline collaboration
    const key = `workspace_${this.groupId}_${message.type}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(message);
    localStorage.setItem(key, JSON.stringify(existing.slice(-100))); // Keep last 100 messages
    
    // Trigger listeners for local changes
    this.handleMessage(message);
  }

  on(eventType: WebSocketMessage['type'], callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  off(eventType: WebSocketMessage['type'], callback: Function) {
    const listeners = this.listeners.get(eventType) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // Document collaboration methods
  sendDocumentChange(documentId: string, content: string, cursorPosition: number, version: number) {
    this.sendMessage('document_change', {
      documentId,
      content,
      cursorPosition,
      version,
      timestamp: Date.now()
    });
  }

  // Send operation for operational transformation
  sendOperation(operation: any) {
    this.sendMessage('operation', operation);
  }

  // Send acknowledgment
  sendAcknowledgment(operationId: string, version: number) {
    this.sendMessage('acknowledgment', { operationId, version });
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Force reconnection
  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Add event listener helper
  emit(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in WebSocket event listener:', error);
      }
    });
  }
  sendCursorPosition(documentId: string, position: number) {
    this.sendMessage('cursor_position', {
      documentId,
      position
    });
  }

  // File sharing methods
  sendFileUpload(file: FileUpload) {
    this.sendMessage('file_uploaded', file);
  }

  // Chat methods
  sendChatMessage(message: string, groupId?: string) {
    this.sendMessage('chat_message', {
      groupId: groupId || this.groupId,
      message,
      timestamp: new Date()
    });
  }

  // Task management methods
  sendTaskUpdate(taskId: string, updates: any) {
    this.sendMessage('task_updated', {
      taskId,
      updates
    });
  }
}

export const wsManager = new WebSocketManager();