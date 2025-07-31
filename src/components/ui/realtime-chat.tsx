import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Smile, Paperclip, MoreVertical } from 'lucide-react';
import { wsManager } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

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

export const RealtimeChat = ({ groupId, userId, userName, initialMessages = [] }: RealtimeChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket message handling
  useEffect(() => {
    const handleChatMessage = (message: any) => {
      // Only process chat messages for this specific group from other users
      if (message.type === 'chat_message' && message.userId !== userId && message.groupId === groupId) {
        const chatMessage: ChatMessage = {
          id: `${message.userId}-${message.timestamp || Date.now()}`,
          senderId: message.userId,
          senderName: message.userName,
          message: message.payload.message,
          timestamp: new Date(message.payload.timestamp || message.timestamp),
          type: 'text'
        };
        
        setMessages(prev => [...prev, chatMessage]);
      }
    };

    const handleUserJoined = (message: any) => {
      if (message.type === 'user_joined' && message.groupId === groupId && message.userId !== userId) {
      
      setOnlineUsers(prev => {
        if (!prev.includes(message.userId)) {
          return [...prev, message.userId];
        }
        return prev;
      });

      // Add system message
      const systemMessage: ChatMessage = {
        id: `system-joined-${message.userId}-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        message: `${message.userName} joined the chat`,
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    const handleUserLeft = (message: any) => {
      if (message.type === 'user_left' && message.groupId === groupId && message.userId !== userId) {
      
      setOnlineUsers(prev => prev.filter(id => id !== message.userId));
      
      // Add system message
      const systemMessage: ChatMessage = {
        id: `system-left-${message.userId}-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        message: `${message.userName} left the chat`,
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    // Listen to all collaborative messages and filter appropriately
    wsManager.on('collaborative-message', handleChatMessage);
    wsManager.on('collaborative-message', handleUserJoined);
    wsManager.on('collaborative-message', handleUserLeft);

    return () => {
      wsManager.off('collaborative-message', handleChatMessage);
      wsManager.off('collaborative-message', handleUserJoined);
      wsManager.off('collaborative-message', handleUserLeft);
    };
  }, [userId, groupId]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: `chat-${userId}-${Date.now()}`,
        senderId: userId,
        senderName: userName,
        message: newMessage,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, message]);
      
      // Send chat message with proper group context
      wsManager.sendChatMessage(newMessage, groupId);
      
      setNewMessage('');
    }
  };
        message: newMessage,
        timestamp: new Date()
      });
      
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageTime = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const getUserColor = (userId: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500'];
    return colors[Math.abs(userId.charCodeAt(0)) % colors.length];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-primary/10">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-foreground">Group Chat</h3>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              {onlineUsers.length + 1} online
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}>
              {message.type === 'system' ? (
                <div className="text-center w-full">
                  <Badge variant="secondary" className="text-xs">
                    {message.message}
                  </Badge>
                </div>
              ) : (
                <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${message.senderId === userId ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={`text-white text-xs ${getUserColor(message.senderId)}`}>
                      {message.senderName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`rounded-lg p-3 ${
                    message.senderId === userId 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary/20 text-foreground'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium">
                        {message.senderId === userId ? 'You' : message.senderName}
                      </span>
                      <span className="text-xs opacity-70 ml-2">
                        {getMessageTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    {message.edited && (
                      <span className="text-xs opacity-50">(edited)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Typing Indicator */}
      {isTyping.length > 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground">
          {isTyping.join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-primary/10">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Smile className="w-4 h-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="bg-card/50 border-primary/20 focus:border-primary"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};