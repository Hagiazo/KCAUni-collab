// Enhanced WebSocket manager for real-time collaboration
import { io, Socket } from 'socket.io-client';
import { Operation, DocumentChange, CollaboratorState } from './collaborative-engine';

export interface CollaborativeMessage {
  type: 'operation' | 'cursor' | 'presence' | 'document-request' | 'document-response' | 'acknowledgment';
  documentId: string;
  userId: string;
  userName: string;
  timestamp: number;
  payload: any;
}

export interface ConnectionState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnected: Date | null;
  latency: number;
}

export class EnhancedWebSocketManager {
  private socket: Socket | null = null;
  private documentId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private connectionState: ConnectionState = {
    isConnected: false,
    reconnectAttempts: 0,
    lastConnected: null,
    latency: 0
  };
  private messageQueue: CollaborativeMessage[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private latencyCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupHeartbeat();
    this.setupLatencyCheck();
  }

  // Connect to WebSocket server
  connect(documentId: string, userId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Disconnect existing connection
        if (this.socket) {
          this.disconnect();
        }

        this.documentId = documentId;
        this.userId = userId;
        this.userName = userName;

        // Connect to WebSocket server with enhanced options
        this.socket = io('http://localhost:3001', {
          transports: ['websocket'],
          forceNew: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 10,
          timeout: 20000,
          query: {
            documentId,
            userId,
            userName
          }
        });

        this.setupSocketListeners();

        this.socket.on('connect', () => {
          console.log('Enhanced WebSocket connected');
          this.connectionState.isConnected = true;
          this.connectionState.reconnectAttempts = 0;
          this.connectionState.lastConnected = new Date();
          
          this.joinDocument();
          this.processMessageQueue();
          this.emit('connection-state-changed', this.connectionState);
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.connectionState.isConnected = false;
          this.connectionState.reconnectAttempts++;
          this.emit('connection-state-changed', this.connectionState);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Setup socket event listeners
  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connectionState.isConnected = false;
      this.emit('connection-state-changed', this.connectionState);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.connectionState.isConnected = true;
      this.connectionState.reconnectAttempts = 0;
      this.connectionState.lastConnected = new Date();
      
      if (this.documentId) {
        this.joinDocument();
      }
      this.processMessageQueue();
      this.emit('connection-state-changed', this.connectionState);
    });

    this.socket.on('collaborative-message', (message: CollaborativeMessage) => {
      this.handleCollaborativeMessage(message);
    });

    this.socket.on('pong', (timestamp: number) => {
      this.connectionState.latency = Date.now() - timestamp;
      this.emit('latency-updated', this.connectionState.latency);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  // Join document collaboration session
  private joinDocument() {
    if (!this.socket || !this.documentId || !this.userId || !this.userName) return;

    const message: CollaborativeMessage = {
      type: 'document-request',
      documentId: this.documentId,
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now(),
      payload: { action: 'join' }
    };

    this.sendMessage(message);
  }

  // Handle incoming collaborative messages
  private handleCollaborativeMessage(message: CollaborativeMessage) {
    // Ignore messages from self
    if (message.userId === this.userId) return;

    switch (message.type) {
      case 'operation':
        this.emit('remote-operation', message.payload);
        break;
      case 'cursor':
        this.emit('cursor-update', message.payload);
        break;
      case 'presence':
        this.emit('presence-update', message.payload);
        break;
      case 'document-response':
        this.emit('document-sync', message.payload);
        break;
      case 'acknowledgment':
        this.emit('operation-acknowledged', message.payload);
        break;
    }
  }

  // Send collaborative message
  sendMessage(message: CollaborativeMessage) {
    if (this.connectionState.isConnected && this.socket) {
      this.socket.emit('collaborative-message', message);
    } else {
      // Queue message for later delivery
      this.messageQueue.push(message);
    }
  }

  // Send operation
  sendOperation(operation: Operation) {
    const message: CollaborativeMessage = {
      type: 'operation',
      documentId: this.documentId!,
      userId: this.userId!,
      userName: this.userName!,
      timestamp: Date.now(),
      payload: operation
    };

    this.sendMessage(message);
  }

  // Send cursor position
  sendCursorPosition(position: number, selectionStart?: number, selectionEnd?: number) {
    const message: CollaborativeMessage = {
      type: 'cursor',
      documentId: this.documentId!,
      userId: this.userId!,
      userName: this.userName!,
      timestamp: Date.now(),
      payload: { position, selectionStart, selectionEnd }
    };

    this.sendMessage(message);
  }

  // Send presence update
  sendPresenceUpdate(presence: Partial<CollaboratorState>) {
    const message: CollaborativeMessage = {
      type: 'presence',
      documentId: this.documentId!,
      userId: this.userId!,
      userName: this.userName!,
      timestamp: Date.now(),
      payload: presence
    };

    this.sendMessage(message);
  }

  // Send acknowledgment
  sendAcknowledgment(operationId: string, version: number) {
    const message: CollaborativeMessage = {
      type: 'acknowledgment',
      documentId: this.documentId!,
      userId: this.userId!,
      userName: this.userName!,
      timestamp: Date.now(),
      payload: { operationId, version }
    };

    this.sendMessage(message);
  }

  // Process queued messages
  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.connectionState.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  // Setup heartbeat
  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connectionState.isConnected) {
        this.socket.emit('ping', Date.now());
      }
    }, 30000); // Every 30 seconds
  }

  // Setup latency checking
  private setupLatencyCheck() {
    this.latencyCheckInterval = setInterval(() => {
      if (this.socket && this.connectionState.isConnected) {
        const start = Date.now();
        this.socket.emit('ping', start);
      }
    }, 10000); // Every 10 seconds
  }

  // Add event listener
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Remove event listener
  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit event
  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // Get connection state
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Get message queue length
  getQueueLength(): number {
    return this.messageQueue.length;
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval);
      this.latencyCheckInterval = null;
    }

    this.connectionState.isConnected = false;
    this.emit('connection-state-changed', this.connectionState);
  }

  // Force reconnection
  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Get network statistics
  getNetworkStats() {
    return {
      connectionState: this.connectionState,
      queueLength: this.messageQueue.length,
      isOnline: navigator.onLine
    };
  }
}