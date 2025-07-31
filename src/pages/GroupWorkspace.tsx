import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollaborativeEditor } from "@/components/ui/collaborative-editor";
import { FileSharing } from "@/components/ui/file-sharing";
import { RealtimeChat } from "@/components/ui/realtime-chat";
import { EnhancedCollaborativeEditor } from "@/components/ui/enhanced-collaborative-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  FileText, 
  CheckSquare, 
  Upload, 
  Send, 
  Plus,
  MoreVertical,
  Download,
  Clock,
  User as UserIcon,
  Paperclip,
  Smile,
  GitBranch,
  Save,
  History,
  Video
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { wsManager } from "@/lib/websocket";
import { db, type Group, type Unit, type User } from "@/lib/database";

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  timestamp: string;
  type: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  status: string;
  priority: string;
  dueDate: string;
}

const GroupWorkspace = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName] = useState(localStorage.getItem("userName") || "");
  const [userId] = useState(localStorage.getItem("userId") || "");
  const [userRole] = useState(localStorage.getItem("userRole") || "student");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Group and unit data
  const [group, setGroup] = useState<Group | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for different components
  const [document, setDocument] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ title: "", description: "", assignee: "" });
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [documentSaved, setDocumentSaved] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  // Load group data
  useEffect(() => {
    const loadGroupData = async () => {
      if (!groupId) {
        navigate('/dashboard');
        return;
      }

      setIsLoading(true);
      try {
        const groupData = await db.getGroupById(groupId);
        if (!groupData) {
          toast({
            title: "Group not found",
            description: "The requested group could not be found.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }

        setGroup(groupData);

        // Load unit data if group has a unit
        let unitData = null;
        if (groupData.unitId) {
          unitData = await db.getUnitById(groupData.unitId);
          setUnit(unitData);
        }

        // Load member details
        const memberDetails = await Promise.all(
          groupData.members.map(async (member) => {
            const user = await db.getUser(member.userId);
            return user ? { ...user, role: member.role, joinedAt: member.joinedAt } : null;
          })
        );
        setMembers(memberDetails.filter(Boolean) as UserIcon[]);

        // Initialize document with group-specific content
        const groupDocument = `# ${groupData.name} - Collaborative Document

## Group Information
- **Group Name**: ${groupData.name}
- **Description**: ${groupData.description}
- **Unit**: ${unitData?.code ? `${unitData.code} - ${unitData.name}` : 'General Group'}
- **Created**: ${new Date(groupData.createdAt).toLocaleDateString()}
- **Members**: ${groupData.members.length}/${groupData.maxMembers}

## Team Members
${memberDetails.filter(Boolean).map((member: any) => 
  `- ${member.name} (${member.role === 'leader' ? 'Leader' : 'Member'})`
).join('\n')}

## Project Progress

### Current Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Meeting Notes

### Resources and Links

---
*This document is shared among all group members. Everyone can edit and contribute.*`;

        setDocument(groupDocument);

      } catch (error) {
        console.error('Error loading group data:', error);
        toast({
          title: "Error loading group",
          description: "Failed to load group data. Please try again.",
          variant: "destructive"
        });
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroupData();
  }, [groupId, navigate, toast]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (groupId && userId && userName && group) {
      wsManager.connect(groupId, userId, userName);
    }
  }, [groupId, userId, userName, group]);

  // Initialize chat messages with group-specific data
  useEffect(() => {
    if (group && group.workspace.chatMessages.length > 0) {
      setChatMessages(group.workspace.chatMessages.map(msg => ({
        id: msg.id,
        sender: members.find(m => m.id === msg.senderId)?.name || 'Unknown',
        message: msg.message,
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: msg.type
      })));
    } else {
      // Initialize with welcome message
      setChatMessages([
        {
          id: 1,
          sender: "System",
          message: `Welcome to ${group?.name || 'the group'}! Start collaborating with your team members.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: "text"
        }
      ]);
    }
  }, [group, members]);

  // Initialize tasks with group-specific data
  useEffect(() => {
    if (group && group.workspace.tasks.length > 0) {
      setTasks(group.workspace.tasks.map(task => ({
        id: parseInt(task.id),
        title: task.title,
        description: task.description,
        assignee: members.find(m => m.id === task.assigneeId)?.name || 'Unassigned',
        status: task.status === 'todo' ? 'To Do' : task.status === 'in-progress' ? 'In Progress' : 'Done',
        priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })));
    }
  }, [group, members]);

  // Handle Google Meet integration
  const handleVideoCall = () => {
    const meetUrl = `https://meet.google.com`;
    window.open(meetUrl, '_blank');
    
    toast({
      title: "Video Call Started",
      description: "Google Meet has been opened in a new tab.",
    });
  };

  // Handle GitHub integration
  const handleGitHub = () => {
    const githubUrl = `https://github.com`;
    window.open(githubUrl, '_blank');
    
    toast({
      title: "GitHub Repository",
      description: "GitHub has been opened in a new tab.",
    });
  };

  // Handle document content changes
  const handleDocumentChange = useCallback((content: string) => {
    setDocument(content);
    setDocumentSaved(false);
  }, []);

  // Auto-save document
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!documentSaved) {
        setDocumentSaved(true);
        setLastSaved(new Date());
        // In real implementation, save to backend
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [document, documentSaved]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        sender: userName,
        message: chatMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: "text"
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage("");
      
      // Send to WebSocket for real-time chat
      wsManager.sendChatMessage(chatMessage);
    }
  };

  const handleCreateTask = () => {
    if (newTask.title) {
      const task = {
        id: tasks.length + 1,
        title: newTask.title,
        description: newTask.description,
        assignee: newTask.assignee || "Unassigned",
        status: "To Do",
        priority: "Medium",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      setTasks([...tasks, task]);
      setNewTask({ title: "", description: "", assignee: "" });
      setIsNewTaskOpen(false);
      toast({
        title: "Task Created",
        description: "New task has been added to the board."
      });
    }
  };

  const moveTask = (taskId: number, newStatus: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
    toast({
      title: "Task Updated",
      description: `Task moved to ${newStatus}.`
    });
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-card flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-card flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Group Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested group could not be found.</p>
          <Link to="/dashboard">
            <Button variant="hero">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link to={unit ? `/unit/${unit.id}` : "/dashboard"} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {unit ? 'Back to Unit' : 'Back to Dashboard'}
          </Link>
          
          <div className="bg-card/80 backdrop-blur-sm border-primary/10 rounded-lg p-6 shadow-card">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">{group.name}</h1>
                <p className="text-muted-foreground">
                  {unit ? `${unit.code} - ${unit.name}` : 'General Group'}
                </p>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{group.members.length}/{group.maxMembers} members</span>
                </div>
                <div className="flex -space-x-2">
                  <Button variant="outline" size="sm" onClick={handleVideoCall}>
                    <Video className="w-4 h-4 mr-2" />
                    Google Meet
                  </Button>
                  <Button variant="outline" size="sm" className="ml-2">
                    <GitBranch className="w-4 h-4 mr-2" />
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  </Button>
                </div>
                <div className="flex -space-x-2">
                  {members.slice(0, 4).map((member) => (
                    <div
                      key={member.id}
                      className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground border-2 border-card"
                      title={`${member.name} - ${(member as any).role === 'leader' ? 'Leader' : 'Member'}`}
                    >
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  ))}
                  {members.length > 4 && (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium border-2 border-card">
                      +{members.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Tabs */}
        <Tabs defaultValue="document" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card/50 backdrop-blur-sm border border-primary/10">
            <TabsTrigger value="document" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Document</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4" />
              <span>Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Files</span>
            </TabsTrigger>
            <TabsTrigger value="submit" className="flex items-center space-x-2">
              <Send className="w-4 h-4" />
              <span>Submit</span>
            </TabsTrigger>
          </TabsList>

          {/* Document Editor */}
          <TabsContent value="document">
            <EnhancedCollaborativeEditor
              documentId={`group-${group.id}-main-doc`}
              initialContent={document}
              groupId={group.id}
              userId={userId}
              userName={userName}
              onContentChange={handleDocumentChange}
              permissions={{
                canEdit: true,
                canComment: true,
                canShare: true
              }}
            />
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-0 h-[600px]">
                <RealtimeChat
                  groupId={group.id}
                  userId={userId}
                  userName={userName}
                  initialMessages={chatMessages.map(msg => ({
                    id: msg.id.toString(),
                    senderId: msg.sender === userName ? userId : 'other',
                    senderName: msg.sender,
                    message: msg.message,
                    timestamp: new Date(),
                    type: 'text' as const
                  }))}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Board */}
          <TabsContent value="tasks">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-foreground">Task Board</h3>
                <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                  <DialogTrigger asChild>
                    <Button variant="accent" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Create New Task</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Add a new task to the project board.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="taskTitle" className="text-foreground">Title</Label>
                        <Input
                          id="taskTitle"
                          value={newTask.title}
                          onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                          className="bg-card/50 border-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taskDescription" className="text-foreground">Description</Label>
                        <Textarea
                          id="taskDescription"
                          value={newTask.description}
                          onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-card/50 border-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taskAssignee" className="text-foreground">Assignee</Label>
                        <Select value={newTask.assignee} onValueChange={(value) => setNewTask(prev => ({ ...prev, assignee: value }))}>
                          <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={member.name}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateTask} className="w-full" variant="hero">
                        Create Task
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* To Do */}
                <div>
                  <h4 className="font-medium text-foreground mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    To Do ({getTasksByStatus('To Do').length})
                  </h4>
                  <div className="space-y-3">
                    {getTasksByStatus('To Do').map((task) => (
                      <Card key={task.id} className="bg-card/60 border-primary/10 hover:shadow-card transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-foreground text-sm">{task.title}</h5>
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <User className="w-3 h-3 mr-1" />
                              {task.assignee}
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => moveTask(task.id, 'In Progress')}
                              className="text-xs"
                            >
                              Start
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* In Progress */}
                <div>
                  <h4 className="font-medium text-foreground mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    In Progress ({getTasksByStatus('In Progress').length})
                  </h4>
                  <div className="space-y-3">
                    {getTasksByStatus('In Progress').map((task) => (
                      <Card key={task.id} className="bg-card/60 border-blue-500/20 hover:shadow-card transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-foreground text-sm">{task.title}</h5>
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <User className="w-3 h-3 mr-1" />
                              {task.assignee}
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => moveTask(task.id, 'Done')}
                              className="text-xs"
                            >
                              Complete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Done */}
                <div>
                  <h4 className="font-medium text-foreground mb-4 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-2 text-green-500" />
                    Done ({getTasksByStatus('Done').length})
                  </h4>
                  <div className="space-y-3">
                    {getTasksByStatus('Done').map((task) => (
                      <Card key={task.id} className="bg-card/60 border-green-500/20 hover:shadow-card transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-foreground text-sm">{task.title}</h5>
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                              Completed
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <User className="w-3 h-3 mr-1" />
                              {task.assignee}
                            </div>
                            <div className="text-xs text-green-600">✓ Complete</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Files */}
          <TabsContent value="files">
            <FileSharing
              groupId={group.id}
              userId={userId}
              userName={userName}
              initialFiles={group.workspace.files || []}
            />
          </TabsContent>

          {/* Submit */}
          <TabsContent value="submit">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-foreground">Submit Assignment</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Submit your completed group assignment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-medium text-foreground mb-2">
                    {unit ? `Assignment for ${unit.code}` : 'Group Assignment'}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {unit ? `Complete the assignment for ${unit.name}` : 'Submit your group work here'}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    Due: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} at 11:59 PM
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Submission Files</Label>
                    <div className="mt-2 border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop files here, or click to browse
                      </p>
                      <Button variant="outline" size="sm">Browse Files</Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="submissionComments" className="text-foreground">Comments (Optional)</Label>
                    <Textarea
                      id="submissionComments"
                      placeholder="Add any comments about your submission..."
                      className="bg-card/50 border-primary/20 focus:border-primary"
                    />
                  </div>

                  <Button className="w-full" variant="hero" size="lg">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Assignment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroupWorkspace;