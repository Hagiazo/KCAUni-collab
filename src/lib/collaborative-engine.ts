// Enterprise-grade collaborative editing engine with operational transformation
import { v4 as uuidv4 } from 'uuid';

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
  version: number;
}

export interface DocumentState {
  id: string;
  content: string;
  version: number;
  operations: Operation[];
  lastModified: Date;
  collaborators: Map<string, CollaboratorState>;
}

export interface CollaboratorState {
  userId: string;
  userName: string;
  cursorPosition: number;
  selectionStart: number;
  selectionEnd: number;
  color: string;
  lastSeen: Date;
  isActive: boolean;
}

export interface DocumentChange {
  operation: Operation;
  resultingContent: string;
  version: number;
}

// Operational Transformation Engine
export class OperationalTransform {
  // Transform operation against another operation
  static transform(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.type === 'retain' || op2.type === 'retain') {
      return [op1, op2]; // Retain operations don't need transformation
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
        // Overlapping deletes - complex case
        const start1 = op1.position;
        const end1 = op1.position + (op1.length || 0);
        const start2 = op2.position;
        const end2 = op2.position + (op2.length || 0);

        const newStart = Math.min(start1, start2);
        const newEnd = Math.max(end1, end2);
        const newLength = newEnd - newStart;

        return [
          { ...op1, position: newStart, length: newLength },
          { ...op2, type: 'retain', position: 0, length: 0 } // Nullify second operation
        ];
      }
    }

    return [op1, op2];
  }

  // Apply operation to document content
  static applyOperation(content: string, operation: Operation): string {
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

  // Transform operation against a series of operations
  static transformAgainstOperations(operation: Operation, operations: Operation[]): Operation {
    let transformedOp = { ...operation };
    
    for (const op of operations) {
      if (op.timestamp < operation.timestamp || 
          (op.timestamp === operation.timestamp && op.userId < operation.userId)) {
        const [, transformed] = this.transform(op, transformedOp);
        transformedOp = transformed;
      }
    }
    
    return transformedOp;
  }
}

// Document Collaboration Manager
export class CollaborativeDocument {
  private state: DocumentState;
  private pendingOperations: Operation[] = [];
  private acknowledgedVersion: number = 0;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(documentId: string, initialContent: string = '') {
    this.state = {
      id: documentId,
      content: initialContent,
      version: 0,
      operations: [],
      lastModified: new Date(),
      collaborators: new Map()
    };
  }

  // Add event listener
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // Remove event listener
  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit event
  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // Get current document state
  getState(): DocumentState {
    return { ...this.state };
  }

  // Get document content
  getContent(): string {
    return this.state.content;
  }

  // Get document version
  getVersion(): number {
    return this.state.version;
  }

  // Add collaborator
  addCollaborator(collaborator: CollaboratorState) {
    this.state.collaborators.set(collaborator.userId, collaborator);
    this.emit('collaborator-joined', collaborator);
  }

  // Remove collaborator
  removeCollaborator(userId: string) {
    const collaborator = this.state.collaborators.get(userId);
    this.state.collaborators.delete(userId);
    if (collaborator) {
      this.emit('collaborator-left', collaborator);
    }
  }

  // Update collaborator cursor position
  updateCollaboratorCursor(userId: string, position: number, selectionStart?: number, selectionEnd?: number) {
    const collaborator = this.state.collaborators.get(userId);
    if (collaborator) {
      collaborator.cursorPosition = position;
      collaborator.selectionStart = selectionStart || position;
      collaborator.selectionEnd = selectionEnd || position;
      collaborator.lastSeen = new Date();
      this.emit('cursor-updated', { userId, position, selectionStart, selectionEnd });
    }
  }

  // Create operation from text change
  createOperation(
    userId: string,
    type: 'insert' | 'delete',
    position: number,
    content?: string,
    length?: number
  ): Operation {
    return {
      id: uuidv4(),
      type,
      position,
      content,
      length,
      userId,
      timestamp: Date.now(),
      version: this.state.version + 1
    };
  }

  // Apply local operation
  applyLocalOperation(operation: Operation): DocumentChange {
    // Add to pending operations
    this.pendingOperations.push(operation);
    
    // Apply operation to content
    const newContent = OperationalTransform.applyOperation(this.state.content, operation);
    
    // Update state
    this.state.content = newContent;
    this.state.version = operation.version;
    this.state.operations.push(operation);
    this.state.lastModified = new Date();

    const change: DocumentChange = {
      operation,
      resultingContent: newContent,
      version: this.state.version
    };

    this.emit('local-operation', change);
    return change;
  }

  // Apply remote operation
  applyRemoteOperation(operation: Operation): DocumentChange {
    // Transform against pending operations
    const transformedOp = OperationalTransform.transformAgainstOperations(
      operation,
      this.pendingOperations
    );

    // Apply transformed operation
    const newContent = OperationalTransform.applyOperation(this.state.content, transformedOp);
    
    // Update state
    this.state.content = newContent;
    this.state.version = Math.max(this.state.version, operation.version);
    this.state.operations.push(transformedOp);
    this.state.lastModified = new Date();

    const change: DocumentChange = {
      operation: transformedOp,
      resultingContent: newContent,
      version: this.state.version
    };

    this.emit('remote-operation', change);
    return change;
  }

  // Acknowledge operation (remove from pending)
  acknowledgeOperation(operationId: string, version: number) {
    this.pendingOperations = this.pendingOperations.filter(op => op.id !== operationId);
    this.acknowledgedVersion = Math.max(this.acknowledgedVersion, version);
    this.emit('operation-acknowledged', { operationId, version });
  }

  // Get pending operations
  getPendingOperations(): Operation[] {
    return [...this.pendingOperations];
  }

  // Get collaborators
  getCollaborators(): CollaboratorState[] {
    return Array.from(this.state.collaborators.values());
  }

  // Get active collaborators (seen in last 30 seconds)
  getActiveCollaborators(): CollaboratorState[] {
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    return this.getCollaborators().filter(c => c.lastSeen > thirtySecondsAgo);
  }

  // Create document snapshot for persistence
  createSnapshot(): DocumentState {
    return {
      ...this.state,
      collaborators: new Map(this.state.collaborators)
    };
  }

  // Restore from snapshot
  restoreFromSnapshot(snapshot: DocumentState) {
    this.state = {
      ...snapshot,
      collaborators: new Map(snapshot.collaborators)
    };
    this.emit('document-restored', this.state);
  }

  // Get revision history
  getRevisionHistory(limit: number = 50): Operation[] {
    return this.state.operations.slice(-limit);
  }

  // Rollback to specific version
  rollbackToVersion(targetVersion: number): boolean {
    const targetOperations = this.state.operations.filter(op => op.version <= targetVersion);
    
    if (targetOperations.length === 0) {
      return false;
    }

    // Rebuild content from operations
    let content = '';
    for (const op of targetOperations) {
      content = OperationalTransform.applyOperation(content, op);
    }

    this.state.content = content;
    this.state.version = targetVersion;
    this.state.operations = targetOperations;
    this.state.lastModified = new Date();

    this.emit('document-rollback', { version: targetVersion, content });
    return true;
  }
}

// Auto-save manager
export class AutoSaveManager {
  private document: CollaborativeDocument;
  private saveInterval: number;
  private lastSaveTime: number = 0;
  private saveTimer: NodeJS.Timeout | null = null;
  private isSaving: boolean = false;

  constructor(document: CollaborativeDocument, intervalMs: number = 2000) {
    this.document = document;
    this.saveInterval = intervalMs;
    this.setupAutoSave();
  }

  private setupAutoSave() {
    this.document.on('local-operation', () => {
      this.scheduleAutoSave();
    });

    this.document.on('remote-operation', () => {
      this.scheduleAutoSave();
    });
  }

  private scheduleAutoSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.performAutoSave();
    }, this.saveInterval);
  }

  private async performAutoSave() {
    if (this.isSaving) return;

    const now = Date.now();
    if (now - this.lastSaveTime < this.saveInterval) {
      return;
    }

    this.isSaving = true;
    this.lastSaveTime = now;

    try {
      const snapshot = this.document.createSnapshot();
      
      // Emit save event for UI feedback
      this.document.emit('auto-save-start', { timestamp: now });
      
      // In a real implementation, this would save to backend
      await this.saveToBackend(snapshot);
      
      this.document.emit('auto-save-success', { timestamp: now });
    } catch (error) {
      this.document.emit('auto-save-error', { error, timestamp: now });
    } finally {
      this.isSaving = false;
    }
  }

  private async saveToBackend(snapshot: DocumentState): Promise<void> {
    // Simulate backend save
    return new Promise((resolve) => {
      setTimeout(() => {
        // Store in localStorage for demo purposes
        localStorage.setItem(`document_${snapshot.id}`, JSON.stringify({
          id: snapshot.id,
          content: snapshot.content,
          version: snapshot.version,
          lastModified: snapshot.lastModified,
          operations: snapshot.operations.slice(-100) // Keep last 100 operations
        }));
        resolve();
      }, 100);
    });
  }

  // Manual save
  async save(): Promise<void> {
    await this.performAutoSave();
  }

  // Stop auto-save
  stop() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}

// Presence manager for real-time user tracking
export class PresenceManager {
  private collaborators: Map<string, CollaboratorState> = new Map();
  private presenceTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.startPresenceTracking();
  }

  // Add event listener
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // Emit event
  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // Add collaborator
  addCollaborator(collaborator: CollaboratorState) {
    this.collaborators.set(collaborator.userId, {
      ...collaborator,
      isActive: true,
      lastSeen: new Date()
    });
    this.emit('presence-updated', this.getActiveCollaborators());
  }

  // Update collaborator activity
  updateCollaborator(userId: string, updates: Partial<CollaboratorState>) {
    const collaborator = this.collaborators.get(userId);
    if (collaborator) {
      Object.assign(collaborator, updates, { 
        lastSeen: new Date(),
        isActive: true 
      });
      this.emit('presence-updated', this.getActiveCollaborators());
    }
  }

  // Remove collaborator
  removeCollaborator(userId: string) {
    this.collaborators.delete(userId);
    this.emit('presence-updated', this.getActiveCollaborators());
  }

  // Get active collaborators
  getActiveCollaborators(): CollaboratorState[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Array.from(this.collaborators.values())
      .filter(c => c.lastSeen > fiveMinutesAgo)
      .map(c => ({ ...c, isActive: c.lastSeen > new Date(Date.now() - 30000) }));
  }

  // Start presence tracking
  private startPresenceTracking() {
    this.presenceTimer = setInterval(() => {
      const activeCollaborators = this.getActiveCollaborators();
      this.emit('presence-updated', activeCollaborators);
      
      // Clean up inactive collaborators
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      for (const [userId, collaborator] of this.collaborators.entries()) {
        if (collaborator.lastSeen < fiveMinutesAgo) {
          this.collaborators.delete(userId);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  // Stop presence tracking
  stop() {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
  }
}

// Conflict resolution strategies
export class ConflictResolver {
  // Resolve conflicts using last-writer-wins strategy
  static resolveLastWriterWins(operations: Operation[]): Operation[] {
    const sortedOps = operations.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.userId.localeCompare(b.userId);
    });

    return sortedOps;
  }

  // Resolve conflicts using operational transformation
  static resolveWithOT(operations: Operation[]): Operation[] {
    if (operations.length <= 1) {
      return operations;
    }

    const resolved: Operation[] = [];
    let currentOps = [...operations];

    while (currentOps.length > 0) {
      // Find the earliest operation
      const earliest = currentOps.reduce((min, op) => 
        op.timestamp < min.timestamp ? op : min
      );

      resolved.push(earliest);
      currentOps = currentOps.filter(op => op.id !== earliest.id);

      // Transform remaining operations against the earliest
      currentOps = currentOps.map(op => {
        const [, transformed] = OperationalTransform.transform(earliest, op);
        return transformed;
      });
    }

    return resolved;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  // Start timing an operation
  startTiming(operation: string) {
    this.startTimes.set(operation, performance.now());
  }

  // End timing and record metric
  endTiming(operation: string) {
    const startTime = this.startTimes.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      const operationMetrics = this.metrics.get(operation)!;
      operationMetrics.push(duration);
      
      // Keep only last 100 measurements
      if (operationMetrics.length > 100) {
        operationMetrics.shift();
      }
      
      this.startTimes.delete(operation);
      return duration;
    }
    return 0;
  }

  // Get average timing for operation
  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  // Get performance report
  getReport(): Record<string, { average: number; min: number; max: number; count: number }> {
    const report: Record<string, any> = {};
    
    for (const [operation, times] of this.metrics.entries()) {
      if (times.length > 0) {
        report[operation] = {
          average: this.getAverageTime(operation),
          min: Math.min(...times),
          max: Math.max(...times),
          count: times.length
        };
      }
    }
    
    return report;
  }

  // Clear metrics
  clear() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}