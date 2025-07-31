import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Save, 
  Users, 
  History, 
  Download, 
  Upload, 
  Wifi, 
  WifiOff,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  CollaborativeDocument, 
  AutoSaveManager, 
  PresenceManager,
  PerformanceMonitor,
  Operation,
  CollaboratorState,
  DocumentChange
} from '@/lib/collaborative-engine';
import { EnhancedWebSocketManager } from '@/lib/websocket-enhanced';

interface EnhancedCollaborativeEditorProps {
  documentId: string;
  initialContent: string;
  groupId: string;
  userId: string;
  userName: string;
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
  permissions?: {
    canEdit: boolean;
    canComment: boolean;
    canShare: boolean;
  };
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F39C12',
  '#E74C3C', '#9B59B6', '#3498DB', '#2ECC71'
];

export const EnhancedCollaborativeEditor: React.FC<EnhancedCollaborativeEditorProps> = ({
  documentId,
  initialContent,
  groupId,
  userId,
  userName,
  onContentChange,
  readOnly = false,
  permissions = { canEdit: true, canComment: true, canShare: true }
}) => {
  // Core state
  const [content, setContent] = useState(initialContent);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorState[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [documentVersion, setDocumentVersion] = useState(0);
  const [latency, setLatency] = useState(0);
  const [operationCount, setOperationCount] = useState(0);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const documentRef = useRef<CollaborativeDocument | null>(null);
  const wsManagerRef = useRef<EnhancedWebSocketManager | null>(null);
  const autoSaveRef = useRef<AutoSaveManager | null>(null);
  const presenceRef = useRef<PresenceManager | null>(null);
  const performanceRef = useRef<PerformanceMonitor | null>(null);
  const lastCursorPosition = useRef(0);
  const isApplyingRemoteChange = useRef(false);

  const { toast } = useToast();

  // Get user color
  const getUserColor = useCallback((userId: string) => {
    const index = Math.abs(userId.charCodeAt(0)) % COLORS.length;
    return COLORS[index];
  }, []);

  // Initialize collaborative systems
  useEffect(() => {
    if (!documentId || !userId || !userName) return;

    // Initialize collaborative document
    documentRef.current = new CollaborativeDocument(documentId, initialContent);
    
    // Initialize WebSocket manager
    wsManagerRef.current = new EnhancedWebSocketManager();
    
    // Initialize presence manager
    presenceRef.current = new PresenceManager();
    
    // Initialize performance monitor
    performanceRef.current = new PerformanceMonitor();

    // Initialize auto-save
    autoSaveRef.current = new AutoSaveManager(documentRef.current, 2000);

    // Setup event listeners
    setupEventListeners();

    // Connect to WebSocket
    connectToWebSocket();

    return () => {
      cleanup();
    };
  }, [documentId, userId, userName]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    if (!documentRef.current || !wsManagerRef.current || !presenceRef.current) return;

    const document = documentRef.current;
    const wsManager = wsManagerRef.current;
    const presence = presenceRef.current;

    // Document events
    document.on('local-operation', (change: DocumentChange) => {
      wsManager.sendOperation(change.operation);
      setDocumentVersion(change.version);
      setOperationCount(prev => prev + 1);
    });

    document.on('remote-operation', (change: DocumentChange) => {
      performanceRef.current?.startTiming('apply-remote-operation');
      
      isApplyingRemoteChange.current = true;
      setContent(change.resultingContent);
      setDocumentVersion(change.version);
      onContentChange?.(change.resultingContent);
      
      setTimeout(() => {
        isApplyingRemoteChange.current = false;
      }, 0);

      performanceRef.current?.endTiming('apply-remote-operation');
    });

    document.on('auto-save-start', () => {
      setSaveStatus('saving');
    });

    document.on('auto-save-success', () => {
      setSaveStatus('saved');
      setLastSaved(new Date());
    });

    document.on('auto-save-error', () => {
      setSaveStatus('error');
      toast({
        title: "Auto-save failed",
        description: "Your changes may not be saved. Please save manually.",
        variant: "destructive"
      });
    });

    // WebSocket events
    wsManager.on('connection-state-changed', (state) => {
      setIsConnected(state.isConnected);
      if (!state.isConnected) {
        toast({
          title: "Connection lost",
          description: "Attempting to reconnect...",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Connected",
          description: "Real-time collaboration is active"
        });
      }
    });

    wsManager.on('latency-updated', (newLatency: number) => {
      setLatency(newLatency);
    });

    wsManager.on('remote-operation', (operation: Operation) => {
      document.applyRemoteOperation(operation);
      wsManager.sendAcknowledgment(operation.id, operation.version);
    });

    wsManager.on('cursor-update', (data) => {
      document.updateCollaboratorCursor(
        data.userId, 
        data.position, 
        data.selectionStart, 
        data.selectionEnd
      );
    });

    wsManager.on('presence-update', (collaboratorData) => {
      if (collaboratorData.userId !== userId) {
        presence.updateCollaborator(collaboratorData.userId, collaboratorData);
      }
    });

    // Presence events
    presence.on('presence-updated', (activeCollaborators: CollaboratorState[]) => {
      setCollaborators(activeCollaborators.filter(c => c.userId !== userId));
    });

  }, [userId, userName, onContentChange, toast]);

  // Connect to WebSocket
  const connectToWebSocket = useCallback(async () => {
    if (!wsManagerRef.current) return;

    try {
      await wsManagerRef.current.connect(documentId, userId, userName);
      
      // Add self to presence
      if (presenceRef.current) {
        presenceRef.current.addCollaborator({
          userId,
          userName,
          cursorPosition: 0,
          selectionStart: 0,
          selectionEnd: 0,
          color: getUserColor(userId),
          lastSeen: new Date(),
          isActive: true
        });
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      toast({
        title: "Connection failed",
        description: "Working in offline mode. Changes will sync when connection is restored.",
        variant: "destructive"
      });
    }
  }, [documentId, userId, userName, getUserColor, toast]);

  // Handle text changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly || !permissions.canEdit || isApplyingRemoteChange.current) return;

    const newContent = e.target.value;
    const oldContent = content;
    
    if (newContent === oldContent) return;

    performanceRef.current?.startTiming('create-operation');

    // Calculate the difference and create operation
    const operation = calculateOperation(oldContent, newContent);
    
    if (operation && documentRef.current) {
      const change = documentRef.current.applyLocalOperation(operation);
      setContent(change.resultingContent);
      onContentChange?.(change.resultingContent);
    }

    performanceRef.current?.endTiming('create-operation');
  }, [content, readOnly, permissions.canEdit, onContentChange]);

  // Calculate operation from content difference
  const calculateOperation = useCallback((oldContent: string, newContent: string): Operation | null => {
    if (!documentRef.current) return null;

    // Find the first difference
    let start = 0;
    while (start < oldContent.length && start < newContent.length && 
           oldContent[start] === newContent[start]) {
      start++;
    }

    // Find the last difference
    let oldEnd = oldContent.length;
    let newEnd = newContent.length;
    while (oldEnd > start && newEnd > start && 
           oldContent[oldEnd - 1] === newContent[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }

    const deletedText = oldContent.slice(start, oldEnd);
    const insertedText = newContent.slice(start, newEnd);

    // Create appropriate operation
    if (deletedText.length > 0 && insertedText.length > 0) {
      // Replace operation (delete then insert)
      return documentRef.current.createOperation(userId, 'insert', start, insertedText);
    } else if (deletedText.length > 0) {
      // Delete operation
      return documentRef.current.createOperation(userId, 'delete', start, undefined, deletedText.length);
    } else if (insertedText.length > 0) {
      // Insert operation
      return documentRef.current.createOperation(userId, 'insert', start, insertedText);
    }

    return null;
  }, [userId]);

  // Handle cursor position changes
  const handleCursorChange = useCallback(() => {
    if (!textareaRef.current || !wsManagerRef.current) return;

    const position = textareaRef.current.selectionStart;
    const selectionEnd = textareaRef.current.selectionEnd;
    
    if (position !== lastCursorPosition.current) {
      lastCursorPosition.current = position;
      wsManagerRef.current.sendCursorPosition(position, position, selectionEnd);
      
      // Update presence
      if (presenceRef.current) {
        presenceRef.current.updateCollaborator(userId, {
          cursorPosition: position,
          selectionStart: position,
          selectionEnd: selectionEnd
        });
      }
    }
  }, [userId]);

  // Manual save
  const handleManualSave = useCallback(async () => {
    if (autoSaveRef.current) {
      setSaveStatus('saving');
      try {
        await autoSaveRef.current.save();
        setSaveStatus('saved');
        setLastSaved(new Date());
        toast({
          title: "Document saved",
          description: "All changes have been saved successfully."
        });
      } catch (error) {
        setSaveStatus('error');
        toast({
          title: "Save failed",
          description: "Failed to save document. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

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
      title: "Document exported",
      description: "Document has been downloaded to your device."
    });
  }, [content, documentId, toast]);

  // Import document
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !permissions.canEdit) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const importedContent = e.target?.result as string;
      if (documentRef.current) {
        // Create a replace operation
        const operation = documentRef.current.createOperation(
          userId, 
          'insert', 
          0, 
          importedContent
        );
        
        const change = documentRef.current.applyLocalOperation(operation);
        setContent(change.resultingContent);
        onContentChange?.(change.resultingContent);
      }

      toast({
        title: "Document imported",
        description: `Successfully imported ${file.name}`
      });
    };
    reader.readAsText(file);
  }, [userId, permissions.canEdit, onContentChange, toast]);

  // Get performance metrics
  const performanceMetrics = useMemo(() => {
    if (!performanceRef.current) return null;
    return performanceRef.current.getReport();
  }, [operationCount]);

  // Cleanup
  const cleanup = useCallback(() => {
    wsManagerRef.current?.disconnect();
    autoSaveRef.current?.stop();
    presenceRef.current?.stop();
    performanceRef.current?.clear();
  }, []);

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2">
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">Connected</span>
          {latency > 0 && (
            <Badge variant="outline" className="text-xs">
              {latency}ms
            </Badge>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Offline</span>
        </>
      )}
    </div>
  );

  // Save status indicator
  const SaveStatus = () => (
    <div className="flex items-center space-x-2">
      {saveStatus === 'saving' && (
        <>
          <Activity className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-600">Saving...</span>
        </>
      )}
      {saveStatus === 'saved' && (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        </>
      )}
      {saveStatus === 'error' && (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Save failed</span>
        </>
      )}
    </div>
  );

  // Collaborator avatars
  const CollaboratorAvatars = () => (
    <div className="flex items-center space-x-2">
      <Users className="w-4 h-4 text-muted-foreground" />
      <div className="flex -space-x-2">
        {collaborators.slice(0, 5).map((collaborator) => (
          <Avatar 
            key={collaborator.userId} 
            className="w-6 h-6 border-2 border-background"
            title={`${collaborator.userName} - ${collaborator.isActive ? 'Active' : 'Away'}`}
          >
            <AvatarFallback 
              className="text-xs text-white"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ))}
        {collaborators.length > 5 && (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
            +{collaborators.length - 5}
          </div>
        )}
      </div>
      {collaborators.length > 0 && (
        <span className="text-sm text-muted-foreground">
          {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Enhanced Header */}
      <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-foreground flex items-center space-x-2">
                <span>Collaborative Document</span>
                <Badge variant="outline" className="text-xs">
                  v{documentVersion}
                </Badge>
              </CardTitle>
              <div className="flex items-center space-x-4 mt-2">
                <ConnectionStatus />
                <SaveStatus />
                <CollaboratorAvatars />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Performance indicator */}
              {performanceMetrics && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(performanceMetrics['apply-remote-operation']?.average || 0)}ms avg
                </Badge>
              )}
              
              {/* Import button */}
              <input
                type="file"
                accept=".txt,.md,.js,.ts,.jsx,.tsx,.css,.html"
                onChange={handleImport}
                className="hidden"
                id="import-file"
                disabled={!permissions.canEdit}
              />
              <label htmlFor="import-file">
                <Button variant="outline" size="sm" asChild disabled={!permissions.canEdit}>
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
                disabled={saveStatus === 'saving' || !permissions.canEdit}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Editor */}
      <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
        <CardContent className="p-0">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              onSelect={handleCursorChange}
              onKeyUp={handleCursorChange}
              onMouseUp={handleCursorChange}
              className="min-h-[600px] bg-transparent border-0 focus:ring-0 font-mono text-sm resize-none"
              placeholder={readOnly ? "This document is read-only" : "Start typing to collaborate in real-time..."}
              disabled={readOnly || !permissions.canEdit}
              style={{ 
                lineHeight: '1.6',
                padding: '24px',
                fontSize: '14px'
              }}
            />
            
            {/* Collaborator cursors overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {collaborators.map((collaborator) => {
                if (!collaborator.isActive) return null;
                
                // Calculate cursor position (simplified - in production would need more sophisticated positioning)
                const lines = content.substring(0, collaborator.cursorPosition).split('\n');
                const lineNumber = lines.length - 1;
                const columnNumber = lines[lines.length - 1].length;
                
                return (
                  <div
                    key={collaborator.userId}
                    className="absolute"
                    style={{
                      top: `${24 + lineNumber * 22.4}px`, // 24px padding + line height
                      left: `${24 + columnNumber * 8.4}px`, // 24px padding + char width
                      zIndex: 10
                    }}
                  >
                    <div 
                      className="w-0.5 h-5 animate-pulse"
                      style={{ backgroundColor: collaborator.color }}
                    />
                    <div 
                      className="absolute top-0 left-1 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                      style={{ backgroundColor: collaborator.color }}
                    >
                      {collaborator.userName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar */}
      <div className="flex justify-between items-center text-xs text-muted-foreground bg-card/50 rounded-lg p-3">
        <div className="flex items-center space-x-4">
          <span>Version {documentVersion}</span>
          <span>{content.length} characters</span>
          <span>{operationCount} operations</span>
          {collaborators.length > 0 && (
            <span>{collaborators.length + 1} collaborators</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {latency > 0 && (
            <span>Latency: {latency}ms</span>
          )}
          {performanceMetrics && (
            <span>
              Avg operation: {Math.round(performanceMetrics['create-operation']?.average || 0)}ms
            </span>
          )}
          <span>
            Last saved: {lastSaved.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Performance Dashboard (Development only) */}
      {process.env.NODE_ENV === 'development' && performanceMetrics && (
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-sm">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {Object.entries(performanceMetrics).map(([operation, metrics]) => (
                <div key={operation} className="space-y-1">
                  <div className="font-medium">{operation}</div>
                  <div>Avg: {Math.round(metrics.average)}ms</div>
                  <div>Min: {Math.round(metrics.min)}ms</div>
                  <div>Max: {Math.round(metrics.max)}ms</div>
                  <div>Count: {metrics.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};