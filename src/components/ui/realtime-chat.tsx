import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Users, MessageCircle, Smile, Paperclip, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { wsManager } from '@/lib/websocket';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  edited?: boolean;
  replyTo?: string;
}

interface RealtimeChatProps {
  groupId: string;
  userId: string;
  userName: string;
  initialMessages?: ChatMessage[];
}

export const RealtimeChat = ({ 
  groupId, 
  userId, 
  userName, 
  initialMessages = [] 
}: RealtimeChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing messages from localStorage
  useEffect(() => {
    const loadMessages = () => {
      try {
        const savedMessages = localStorage.getItem(`chat_messages_${groupId}`);
        if (savedMessages) {
          const parsed = JSON.parse(savedMessages);
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        }
      } catch (error) {
        console.error('Error loading chat messages:', error);
      }
    };

    loadMessages();
  }, [groupId]);

  // Save messages to localStorage
  const saveMessages = (updatedMessages: ChatMessage[]) => {
    try {
      localStorage.setItem(`chat_messages_${groupId}`, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (groupId && userId && userName) {
      try {
        wsManager.connect(groupId, userId, userName);
        
        // Listen for connection status
        wsManager.on('connection_status', (status: any) => {
          setIsConnected(status.connected);
        });

        // Listen for chat messages
        wsManager.on('chat_message', (message: any) => {
          if (message.groupId === groupId && message.userId !== userId) {
            const newChatMessage: ChatMessage = {
              id: uuidv4(),
              senderId: message.userId,
              senderName: message.userName,
              message: message.payload.message,
              timestamp: new Date(message.payload.timestamp),
              type: 'text'
            };
            
            setMessages(prev => {
              const updated = [...prev, newChatMessage];
              saveMessages(updated);
              return updated;
            });
          }
        });

        // Listen for user presence
        wsManager.on('user_joined', (message: any) => {
          if (message.groupId === groupId) {
            setOnlineUsers(prev => [...prev.filter(id => id !== message.userId), message.userId]);
            
            // Add system message
            const systemMessage: ChatMessage = {
              id: uuidv4(),
              senderId: 'system',
              senderName: 'System',
              message: `${message.userName} joined the chat`,
              timestamp: new Date(),
              type: 'system'
            };
            
            setMessages(prev => {
              const updated = [...prev, systemMessage];
              saveMessages(updated);
              return updated;
            });
          }
        });

        wsManager.on('user_left', (message: any) => {
          if (message.groupId === groupId) {
            setOnlineUsers(prev => prev.filter(id => id !== message.userId));
            
            // Add system message
            const systemMessage: ChatMessage = {
              id: uuidv4(),
              senderId: 'system',
              senderName: 'System',
              message: `${message.userName} left the chat`,
              timestamp: new Date(),
              type: 'system'
            };
            
            setMessages(prev => {
              const updated = [...prev, systemMessage];
              saveMessages(updated);
              return updated;
            });
          }
        });

      } catch (error) {
        console.error('Failed to connect to chat:', error);
        toast({
          title: "Chat Connection Failed",
          description: "Working in offline mode. Messages will sync when connection is restored.",
          variant: "destructive"
        });
      }
    }

    return () => {
      // Cleanup listeners
      wsManager.off('connection_status', () => {});
      wsManager.off('chat_message', () => {});
      wsManager.off('user_joined', () => {});
      wsManager.off('user_left', () => {});
    };
  }, [groupId, userId, userName, toast]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageId = uuidv4();
    const chatMessage: ChatMessage = {
      id: messageId,
      senderId: userId,
      senderName: userName,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    // Add to local messages immediately
    const updatedMessages = [...messages, chatMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);

    // Send via WebSocket if connected
    if (isConnected) {
      wsManager.sendChatMessage(newMessage.trim(), groupId);
    }

    setNewMessage('');
    
    toast({
      title: "Message Sent",
      description: isConnected ? "Message delivered to group" : "Message saved locally"
    });
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: Date) => {
    const today = new Date();
    const messageDate = new Date(timestamp);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return messageDate.toLocaleDateString();
  };

  const getUserColor = (userId: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const index = Math.abs(userId.charCodeAt(0)) % colors.length;
    return colors[index];
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: ChatMessage[] }, message) => {
    const dateKey = formatDate(message.timestamp);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-primary/10 bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Group Chat</h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isConnected ? 'Connected' : 'Offline'}</span>
                {onlineUsers.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{onlineUsers.length + 1} online</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {messages.length} messages
            </Badge>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {Object.keys(groupedMessages).length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                    {date}
                  </div>
                </div>
                
                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((message, index) => {
                    const isOwnMessage = message.senderId === userId;
                    const isSystemMessage = message.type === 'system';
                    const showAvatar = !isOwnMessage && !isSystemMessage && 
                      (index === 0 || dateMessages[index - 1].senderId !== message.senderId);
                    
                    if (isSystemMessage) {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="bg-muted/50 px-3 py-1 rounded-full text-xs text-muted-foreground">
                            {message.message}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwnMessage && showAvatar && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback 
                              className="text-xs text-white"
                              style={{ backgroundColor: getUserColor(message.senderId) }}
                            >
                              {message.senderName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        {!isOwnMessage && !showAvatar && (
                          <div className="w-8" /> // Spacer for alignment
                        )}
                        
                        <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-1' : ''}`}>
                          {!isOwnMessage && showAvatar && (
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              {message.senderName}
                            </div>
                          )}
                          
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              isOwnMessage
                                ? 'bg-gradient-primary text-primary-foreground'
                                : 'bg-card border border-primary/10'
                            }`}
                          >
                            <div className="text-sm break-words">{message.message}</div>
                            <div
                              className={`text-xs mt-1 ${
                                isOwnMessage
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {formatTime(message.timestamp)}
                            </div>
                          </div>
                        </div>
                        
                        {isOwnMessage && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback 
                              className="text-xs text-white"
                              style={{ backgroundColor: getUserColor(message.senderId) }}
                            >
                              {message.senderName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Typing Indicator */}
      {isTyping.length > 0 && (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          {isTyping.join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-primary/10 bg-card/50">
        <form onSubmit={sendMessage} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="bg-card/50 border-primary/20 focus:border-primary pr-20"
              maxLength={1000}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Paperclip className="w-3 h-3" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Smile className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
            variant="default"
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        
        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
          <span>
            {isConnected ? 'Messages sync in real-time' : 'Working offline - messages will sync when connected'}
          </span>
          <span>{newMessage.length}/1000</span>
        </div>
      </div>
    </div>
  );
};