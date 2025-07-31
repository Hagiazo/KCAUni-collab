import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Save, Users, History, Download, Upload, Wifi, WifiOff, Clock } from 'lucide-react';
import { wsManager } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';

interface CollaborativeEditorProps {
  documentId: string;
  initialContent: string;
  groupId: string;
  userId: string;
  userName: string;
  onContentChange?: (content: string) => void;
}

interface ActiveUser {
  userId: string;
  userName: string;
  cursorPosition: number;
  color: string;
  lastSeen: Date;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
const AUTOSAVE_INTERVAL = 10000; // 10 seconds
const SYNC_DEBOUNCE_DELAY = 2000; // 2 seconds after user stops typing

export const CollaborativeEditor = ({
  documentId,
  initialContent = "",
  groupId,
  userId,
  userName,
  onContentChange
}: CollaborativeEditorProps) => {
  // Core state
  const [content, setContent] = useState(initialContent || "");
  const [savedContent, setSavedContent] = useState(initialContent || ""); // Track last saved version
  const [version, setVersion] = useState(1);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // Refs for managing timers and preventing race conditions
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReceivingRemoteChange = useRef(false);
  const lastCursorPosition = useRef(0);
  
  const { toast } = useToast();

  // Initialize WebSocket connection with proper error handling
  useEffect(() => {
    if (!documentId || !userId || !userName) return;

    try {
      wsManager.connect(documentId, userId, userName);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsConnected(false);
    }

    // Connection status handler
    const handleConnectionStatus = (status: any) => {
      setIsConnected(status.connected);
      if (status.connected) {
        console.log('WebSocket connected successfully');
      } else {
        console.log('WebSocket disconnected, working offline');
      }
    };

    // Remote document change handler - only for saved changes from other users
    const handleRemoteDocumentChange = (message: any) => {
      if (message.payload?.documentId === documentId && message.userId !== userId) {
        console.log('Received remote document change from:', message.userName);
        
        // Prevent local updates while applying remote changes
        isReceivingRemoteChange.current = true;
        
        setContent(message.payload.content);
        setSavedContent(message.payload.content);
        setVersion(message.payload.version);
        onContentChange?.(message.payload.content);
        
        // Reset flag after a brief delay
        setTimeout(() => {
          isReceivingRemoteChange.current = false;
        }, 100);

        toast({
          title: "Document Updated",
          description: `${message.userName} saved changes to the document`,
        });
      }
    };

    // Cursor position handler
    const handleCursorPosition = (message: any) => {
      if (message.payload?.documentId === documentId && message.userId !== userId) {
        setActiveUsers(prev => {
          const existing = prev.find(user => user.userId === message.userId);
          const color = COLORS[Math.abs(message.userId.charCodeAt(0)) % COLORS.length];
          
          if (existing) {
            return prev.map(user => 
              user.userId === message.userId 
                ? { ...user, cursorPosition: message.payload.position, lastSeen: new Date() }
                : user
            );
          } else {
            return [...prev, {
              userId: message.userId,
              userName: message.userName,
              cursorPosition: message.payload.position,
              color,
              lastSeen: new Date()
            }];
          }
        });
      }
    };

    // User presence handlers
    const handleUserJoined = (message: any) => {
      if (message.payload?.documentId === documentId && message.userId !== userId) {
        const color = COLORS[Math.abs(message.userId.charCodeAt(0)) % COLORS.length];
        setActiveUsers(prev => {
          if (!prev.find(user => user.userId === message.userId)) {
            return [...prev, {
              userId: message.userId,
              userName: message.userName,
              cursorPosition: 0,
              color,
              lastSeen: new Date()
            }];
          }
          return prev;
        });
      }
    };

    const handleUserLeft = (message: any) => {
      if (message.payload?.documentId === documentId) {
        setActiveUsers(prev => prev.filter(user => user.userId !== message.userId));
      }
    };

    // Register event listeners
    wsManager.on('connection_status', handleConnectionStatus);
    wsManager.on('document_change', handleRemoteDocumentChange);
    wsManager.on('cursor_position', handleCursorPosition);
    wsManager.on('user_joined', handleUserJoined);
    wsManager.on('user_left', handleUserLeft);

    // Cleanup
    return () => {
      wsManager.off('connection_status', handleConnectionStatus);
      wsManager.off('document_change', handleRemoteDocumentChange);
      wsManager.off('cursor_position', handleCursorPosition);
      wsManager.off('user_joined', handleUserJoined);
      wsManager.off('user_left', handleUserLeft);
      
      // Clear timers
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [documentId, userId, userName, onContentChange, toast]);

  // Handle local content changes - NO real-time sync, just local updates
  const handleContentChange = useCallback((newContent: string) => {
    // Prevent updates while receiving remote changes
    if (isReceivingRemoteChange.current) return;

    setContent(newContent);
    setHasUnsavedChanges(newContent !== savedContent);
    onContentChange?.(newContent);

    // Clear existing autosave timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new autosave timer
    autosaveTimerRef.current = setTimeout(() => {
      performSave(newContent, false); // Autosave
    }, AUTOSAVE_INTERVAL);

  }, [savedContent, onContentChange]);

  // Handle cursor position changes - send immediately for real-time cursor tracking
  const handleCursorChange = useCallback(() => {
    if (!textareaRef.current || isReceivingRemoteChange.current) return;

    const position = textareaRef.current.selectionStart;
    if (position !== lastCursorPosition.current) {
      lastCursorPosition.current = position;
      
      // Send cursor position immediately (this is lightweight)
      if (isConnected) {
        try {
          wsManager.sendCursorPosition(documentId, position);
        } catch (error) {
          console.error('Failed to send cursor position:', error);
        }
      }
    }
  }, [documentId, isConnected]);

  // Perform save operation (manual or auto)
  const performSave = useCallback(async (contentToSave: string, isManual: boolean = true) => {
    if (isSaving) return; // Prevent concurrent saves
    
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const newVersion = version + 1;
      
      // Save to local database
      const saveSuccess = await db.saveDocument(documentId, contentToSave, newVersion);
      
      if (saveSuccess) {
        // Update local state
        setSavedContent(contentToSave);
        setVersion(newVersion);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setSaveStatus('saved');

        // Send to other users via WebSocket ONLY after successful save
        if (isConnected) {
          try {
            wsManager.sendDocumentChange(documentId, contentToSave, lastCursorPosition.current, newVersion);
          } catch (error) {
            console.error('Failed to sync with other users:', error);
            // Don't fail the save if WebSocket fails
          }
        }

        if (isManual) {
          toast({
            title: "Document Saved",
            description: "Your changes have been saved and synced with collaborators.",
          });
        }
      } else {
        throw new Error('Failed to save to database');
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      toast({
        title: "Save Failed",
        description: "Failed to save document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [documentId, version, isConnected, toast]);

  // Manual save handler
  const handleManualSave = useCallback(() => {
    if (hasUnsavedChanges) {
      performSave(content, true);
    }
  }, [content, hasUnsavedChanges, performSave]);

  // Export document
  const handleExport = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${documentId}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Document Exported",
      description: "Document has been downloaded to your device.",
    });
  }, [content, documentId, toast]);

  // Import document
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const importedContent = e.target?.result as string;
      setContent(importedContent);
      setHasUnsavedChanges(true);
      onContentChange?.(importedContent);

      toast({
        title: "File Imported",
        description: `Successfully imported ${file.name}`,
      });
    };
    reader.readAsText(file);
  }, [onContentChange, toast]);

  // Clean up inactive users periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      setActiveUsers(prev => prev.filter(user => user.lastSeen > fiveMinutesAgo));
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // Save status indicator
  const SaveStatusIndicator = () => (
    <div className="flex items-center space-x-2">
      {saveStatus === 'saving' && (
        <>
          <Clock className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-600">Saving...</span>
        </>
      )}
      {saveStatus === 'saved' && (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-600">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        </>
      )}
      {saveStatus === 'error' && (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-sm text-red-600">Save failed</span>
        </>
      )}
    </div>
  );

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2">
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Offline</span>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Editor Header */}
      <div className="flex justify-between items-center p-4 bg-card/80 backdrop-blur-sm border border-primary/10 rounded-lg">
        <div className="flex items-center space-x-4">
          <ConnectionStatus />
          <SaveStatusIndicator />
          
          {activeUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map((user) => (
                  <Avatar key={user.userId} className="w-6 h-6 border-2 border-background">
                    <AvatarFallback 
                      className="text-xs"
                      style={{ backgroundColor: user.color, color: 'white' }}
                      title={user.userName}
                    >
                      {user.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activeUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                    +{activeUsers.length - 3}
                  </div>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {activeUsers.length} collaborator{activeUsers.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Import button */}
          <input
            type="file"
            accept=".txt,.md,.js,.ts,.jsx,.tsx,.css,.html"
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />
          <label htmlFor="import-file">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </span>
            </Button>
          </label>
          
          {/* Export button */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          {/* Version history button */}
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          
          {/* Manual save button */}
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleManualSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Collaborative Editor */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={handleCursorChange}
          onKeyUp={handleCursorChange}
          onMouseUp={handleCursorChange}
          className="min-h-[500px] bg-card/50 border-primary/20 focus:border-primary font-mono text-sm resize-none"
          placeholder={
            isConnected 
              ? "Start typing... Changes will be saved automatically and synced with collaborators." 
              : "Working offline... Changes will sync when connection is restored."
          }
          style={{ 
            lineHeight: '1.6',
            padding: '24px',
            fontSize: '14px'
          }}
        />
        
        {/* Active user cursors overlay - simplified positioning */}
        <div className="absolute inset-0 pointer-events-none">
          {activeUsers.map((user) => {
            if (!user || user.cursorPosition < 0) return null;
            
            // Simplified cursor positioning
            const lines = content.substring(0, user.cursorPosition).split('\n');
            const lineNumber = Math.max(0, lines.length - 1);
            const columnNumber = Math.max(0, lines[lines.length - 1]?.length || 0);
            
            return (
              <div
                key={user.userId}
                className="absolute z-10"
                style={{
                  top: `${24 + lineNumber * 22.4}px`,
                  left: `${24 + columnNumber * 8.4}px`,
                }}
              >
                <div 
                  className="w-0.5 h-5 animate-pulse"
                  style={{ backgroundColor: user.color }}
                />
                <div 
                  className="absolute top-0 left-1 px-2 py-1 rounded text-xs text-white whitespace-nowrap z-20"
                  style={{ backgroundColor: user.color }}
                >
                  {user.userName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex justify-between items-center text-xs text-muted-foreground bg-card/50 rounded-lg p-3">
        <div className="flex items-center space-x-4">
          <span>Version {version}</span>
          <span>{content.length} characters</span>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              Unsaved changes
            </Badge>
          )}
          {activeUsers.length > 0 && (
            <span>{activeUsers.length + 1} collaborators</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span>
            Last saved: {lastSaved.toLocaleTimeString()}
          </span>
          <span>
            Autosave: {AUTOSAVE_INTERVAL / 1000}s
          </span>
        </div>
      </div>
    </div>
  );
};