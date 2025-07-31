import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Save, Users, History, Download, Upload } from 'lucide-react';
import { wsManager, DocumentChange } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

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
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

export const CollaborativeEditor = ({
  documentId,
  initialContent = "",
  groupId,
  userId,
  userName,
  onContentChange
}: CollaborativeEditorProps) => {
  const [content, setContent] = useState(initialContent || "");
  const [version, setVersion] = useState(1);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Initialize WebSocket connection
  useEffect(() => {
    try {
      wsManager.connect(documentId, userId, userName);
      setConnectionStatus('Connecting...');
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionStatus('Connection failed');
    }

    // Listen for connection status changes
    const handleConnectionStatus = (status: any) => {
      setIsConnected(status.connected);
      if (status.connected) {
        setConnectionStatus('Connected');
      } else {
        setConnectionStatus(`Disconnected (${status.attempts} attempts)`);
      }
    };

    wsManager.on('connection_status', handleConnectionStatus);
    // Listen for document changes from other users
    const handleDocumentChange = (message: any) => {
      if (message.payload.documentId === documentId && message.userId !== userId) {
        setContent(message.payload.content);
        setVersion(message.payload.version);
        onContentChange?.(message.payload.content);
      }
    };

    // Listen for cursor position updates
    const handleCursorPosition = (message: any) => {
      if (message.documentId === documentId && message.userId !== userId) {
        setActiveUsers(prev => {
          const existing = prev.find(user => user.userId === message.userId);
          const color = COLORS[Math.abs(message.userId.charCodeAt(0)) % COLORS.length];
          
          if (existing) {
            return prev.map(user => 
              user.userId === message.userId 
                ? { ...user, cursorPosition: message.payload.position }
                : user
            );
          } else {
            return [...prev, {
              userId: message.userId,
              userName: message.userName,
              cursorPosition: message.payload.position,
              color
            }];
          }
        });
      }
    };

    // Listen for user join/leave events
    const handleUserJoined = (message: any) => {
      if (message.documentId !== documentId) return;
      const color = COLORS[Math.abs(message.userId.charCodeAt(0)) % COLORS.length];
      setActiveUsers(prev => {
        if (!prev.find(user => user.userId === message.userId)) {
          return [...prev, {
            userId: message.userId,
            userName: message.userName,
            cursorPosition: 0,
            color
          }];
        }
        return prev;
      });
    };

    const handleUserLeft = (message: any) => {
      if (message.documentId !== documentId) return;
      setActiveUsers(prev => prev.filter(user => user.userId !== message.userId));
    };

    wsManager.on('document_change', handleDocumentChange);
    wsManager.on('cursor_position', handleCursorPosition);
    wsManager.on('user_joined', handleUserJoined);
    wsManager.on('user_left', handleUserLeft);

    return () => {
      wsManager.off('connection_status', handleConnectionStatus);
      wsManager.off('document_change', handleDocumentChange);
      wsManager.off('cursor_position', handleCursorPosition);
      wsManager.off('user_joined', handleUserJoined);
      wsManager.off('user_left', handleUserLeft);
    };
  }, [documentId, groupId, userId, userName, onContentChange, toast]);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    onContentChange?.(newContent);

    // Send changes to other users
    const newVersion = version + 1;
      try {
        await db.saveDocument(`group-${group.id}-main-doc`, content, newVersion);
      } catch (error) {
        console.error('Failed to save document:', error);
      }
    
    if (wsManager.isConnected()) {
      if (wsManager.isConnected()) {
        wsManager.sendDocumentChange(
          `group-${group.id}-main-doc`,
          content,
          0, // cursor position
          newVersion
        );
      }
    }
  }, [documentId, version, onContentChange]);

  // Handle cursor position changes
  const handleCursorChange = useCallback(() => {
    if (textareaRef.current) {
      const position = textareaRef.current.selectionStart;
      wsManager.sendCursorPosition(documentId, position);
    }
  }, [documentId]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        // In a real implementation, save to database here
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [content, hasUnsavedChanges]);

  const handleSave = () => {
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    toast({
      title: "Document Saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${documentId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const importedContent = e.target?.result as string;
        handleContentChange(importedContent);
        toast({
          title: "File Imported",
          description: `Successfully imported ${file.name}`,
        });
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Editor Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          
          {activeUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map((user) => (
                  <Avatar key={user.userId} className="w-6 h-6 border-2 border-background">
                    <AvatarFallback 
                      className="text-xs"
                      style={{ backgroundColor: user.color, color: 'white' }}
                    >
                      {user.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activeUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                    +{activeUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-xs text-muted-foreground">
            {hasUnsavedChanges ? (
            {connectionStatus}
            ) : (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>
          
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
          
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
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
          className="min-h-[500px] bg-card/50 border-primary/20 focus:border-primary font-mono text-sm resize-none"
          placeholder={isConnected ? "Start typing to collaborate in real-time..." : "Connecting to collaboration server..."}
          disabled={!isConnected}
        />
        
        {/* Active user cursors */}
        {activeUsers.map((user) => (
          <div
            key={user.userId}
            className="absolute pointer-events-none"
            style={{
              top: `${Math.floor(user.cursorPosition / 80) * 1.5 + 0.5}rem`,
              left: `${(user.cursorPosition % 80) * 0.6 + 0.75}rem`,
            }}
          >
            <div 
              className="w-0.5 h-5 animate-pulse"
              style={{ backgroundColor: user.color }}
            />
            <Badge 
              variant="secondary" 
              className="text-xs mt-1"
              style={{ backgroundColor: user.color, color: 'white' }}
            >
              {user.userName}
            </Badge>
          </div>
        ))}
      </div>

      {/* Version Info */}
      <div className="text-xs text-muted-foreground">
        Version {version} • {content.length} characters • {activeUsers.length + 1} collaborators
      </div>
    </div>
  );
};