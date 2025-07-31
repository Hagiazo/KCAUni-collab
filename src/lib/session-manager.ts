// Session Manager for handling multi-tab synchronization and session isolation
import { v4 as uuidv4 } from 'uuid';

export interface SessionData {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: string;
  userEmail: string;
  userCourse?: string;
  userSemester?: string;
  userYear?: string;
  timestamp: number;
  tabId: string;
}

export interface TabSyncMessage {
  type: 'session_update' | 'session_clear' | 'data_sync' | 'logout';
  sessionData?: SessionData;
  tabId: string;
  timestamp: number;
}

class SessionManager {
  private currentSession: SessionData | null = null;
  private tabId: string;
  private listeners: Map<string, Function[]> = new Map();
  private storageKey = 'kcau_session_data';
  private syncChannel: BroadcastChannel;

  constructor() {
    this.tabId = uuidv4();
    this.syncChannel = new BroadcastChannel('kcau_tab_sync');
    this.initializeSession();
    this.setupEventListeners();
  }

  private initializeSession() {
    // Check for existing session
    const existingSession = this.getStoredSession();
    if (existingSession && this.isValidSession(existingSession)) {
      this.currentSession = existingSession;
      this.broadcastSessionUpdate();
    }
  }

  private setupEventListeners() {
    // Listen for tab sync messages
    this.syncChannel.addEventListener('message', (event) => {
      this.handleTabSyncMessage(event.data);
    });

    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        this.handleStorageChange();
      }
    });

    // Handle tab close/refresh
    window.addEventListener('beforeunload', () => {
      this.cleanupSession();
    });

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.currentSession) {
        this.validateAndRefreshSession();
      }
    });
  }

  private handleTabSyncMessage(message: TabSyncMessage) {
    if (message.tabId === this.tabId) return; // Ignore own messages

    switch (message.type) {
      case 'session_update':
        if (message.sessionData) {
          this.handleRemoteSessionUpdate(message.sessionData);
        }
        break;
      case 'session_clear':
        this.handleRemoteLogout();
        break;
      case 'logout':
        this.handleRemoteLogout();
        break;
    }
  }

  private handleRemoteSessionUpdate(sessionData: SessionData) {
    // If different user logged in from another tab, clear current session
    if (this.currentSession && this.currentSession.userId !== sessionData.userId) {
      this.clearSession();
      this.emit('session_conflict', { 
        message: 'Another user logged in from a different tab',
        newUser: sessionData.userName 
      });
    }
  }

  private handleRemoteLogout() {
    this.clearSession();
    this.emit('remote_logout', { message: 'Logged out from another tab' });
  }

  private handleStorageChange() {
    const storedSession = this.getStoredSession();
    
    if (!storedSession) {
      // Session was cleared from another tab
      this.currentSession = null;
      this.emit('session_cleared', {});
    } else if (this.currentSession && storedSession.userId !== this.currentSession.userId) {
      // Different user session detected
      this.currentSession = storedSession;
      this.emit('session_changed', storedSession);
    }
  }

  // Create new session
  createSession(userData: Omit<SessionData, 'sessionId' | 'timestamp' | 'tabId'>): SessionData {
    const sessionData: SessionData = {
      ...userData,
      sessionId: uuidv4(),
      timestamp: Date.now(),
      tabId: this.tabId
    };

    this.currentSession = sessionData;
    this.storeSession(sessionData);
    this.broadcastSessionUpdate();
    
    return sessionData;
  }

  // Update current session
  updateSession(updates: Partial<SessionData>) {
    if (!this.currentSession) return null;

    this.currentSession = {
      ...this.currentSession,
      ...updates,
      timestamp: Date.now()
    };

    this.storeSession(this.currentSession);
    this.broadcastSessionUpdate();
    
    return this.currentSession;
  }

  // Clear session (logout)
  clearSession() {
    this.currentSession = null;
    localStorage.removeItem(this.storageKey);
    
    // Clear all user-related data
    const keysToRemove = [
      'userRole', 'userName', 'userId', 'userEmail', 
      'userCourse', 'userSemester', 'userYear', 'userYearOfAdmission'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    this.broadcastLogout();
  }

  // Get current session
  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentSession !== null && this.isValidSession(this.currentSession);
  }

  // Validate session
  private isValidSession(session: SessionData): boolean {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - session.timestamp < maxAge;
  }

  // Store session in localStorage
  private storeSession(session: SessionData) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session));
      
      // Also store individual items for backward compatibility
      localStorage.setItem('userRole', session.userRole);
      localStorage.setItem('userName', session.userName);
      localStorage.setItem('userId', session.userId);
      localStorage.setItem('userEmail', session.userEmail);
      
      if (session.userCourse) localStorage.setItem('userCourse', session.userCourse);
      if (session.userSemester) localStorage.setItem('userSemester', session.userSemester);
      if (session.userYear) localStorage.setItem('userYear', session.userYear);
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  // Get stored session
  private getStoredSession(): SessionData | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse stored session:', error);
      return null;
    }
  }

  // Broadcast session update to other tabs
  private broadcastSessionUpdate() {
    if (!this.currentSession) return;

    const message: TabSyncMessage = {
      type: 'session_update',
      sessionData: this.currentSession,
      tabId: this.tabId,
      timestamp: Date.now()
    };

    this.syncChannel.postMessage(message);
  }

  // Broadcast logout to other tabs
  private broadcastLogout() {
    const message: TabSyncMessage = {
      type: 'logout',
      tabId: this.tabId,
      timestamp: Date.now()
    };

    this.syncChannel.postMessage(message);
  }

  // Validate and refresh session
  private validateAndRefreshSession() {
    if (this.currentSession && !this.isValidSession(this.currentSession)) {
      this.clearSession();
      this.emit('session_expired', {});
    }
  }

  // Cleanup on tab close
  private cleanupSession() {
    // Don't clear session on tab close, just cleanup listeners
    this.syncChannel.close();
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in session manager event listener:', error);
      }
    });
  }

  // Get tab ID for debugging
  getTabId(): string {
    return this.tabId;
  }

  // Force session refresh (for debugging)
  forceRefresh() {
    this.validateAndRefreshSession();
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();

// Export types
export type { SessionData, TabSyncMessage };