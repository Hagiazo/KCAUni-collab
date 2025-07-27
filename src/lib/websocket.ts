import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  type: 'document_change' | 'cursor_position' | 'user_joined' | 'user_left' | 'file_uploaded' | 'chat_message' | 'task_updated';
  payload: any;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface DocumentChange {
  documentId: string;
  content: string;
  cursorPosition: number;
  version: number;
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

  connect(groupId: string, userId: string, userName: string) {
    // In production, replace with your WebSocket server URL
    this.socket = io('http://localhost:3001', {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    this.groupId = groupId;
    this.userId = userId;
    this.userName = userName;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.joinGroup(groupId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('message', (message: WebSocketMessage) => {
      this.handleMessage(message);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('WebSocket connection failed, falling back to local mode:', error);
      // Fallback to local storage for offline mode
      this.handleLocalFallback();
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to WebSocket server after', attemptNumber, 'attempts');
      this.joinGroup(groupId);
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
      this.socket.emit('join_group', {
        groupId,
        userId: this.userId,
        userName: this.userName
      });
    }
  }

  sendMessage(type: WebSocketMessage['type'], payload: any) {
    const message: WebSocketMessage = {
      type,
      payload,
      userId: this.userId!,
      userName: this.userName!,
      timestamp: new Date()
    };

    if (this.socket?.connected) {
      this.socket.emit('message', message);
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
      version
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
  sendChatMessage(message: string) {
    this.sendMessage('chat_message', {
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