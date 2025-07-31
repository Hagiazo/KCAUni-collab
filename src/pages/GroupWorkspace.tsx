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
import { VideoCall } from "@/components/ui/video-call";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Video,
  Crown,
  Calendar,
  BookOpen,
  Trash2,
  Settings,
  AlertTriangle
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { wsManager } from "@/lib/websocket";
import { db, type Group, type Unit, type User } from "@/lib/database";

interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId?: string;
  assigneeName?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  createdBy: string;
  createdAt: Date;
}

const GroupWorkspace = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName] = useState(localStorage.getItem("userName") || "");
  const [userId] = useState(localStorage.getItem("userId") || "");
  const [userRole] = useState(localStorage.getItem("userRole") || "student");
  
  // Group and unit data
  const [group, setGroup] = useState<Group | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [members, setMembers] = useState<(User & { role: string; joinedAt: Date })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // Document state
  const [documentContent, setDocumentContent] = useState("");
  const [documentVersion, setDocumentVersion] = useState(0);
  
  // Task management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ 
    title: "", 
    description: "", 
    assigneeId: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: ""
  });
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load group data and initialize workspace
  useEffect(() => {
    const loadGroupData = async () => {
      if (!groupId) {
        navigate('/dashboard');
        return;
      }

      setIsLoading(true);
      try {
        // Load group data
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

        // Load member details with their roles
        const memberDetails = await Promise.all(
          groupData.members.map(async (member) => {
            const user = await db.getUser(member.userId);
            return user ? { 
              ...user, 
              role: member.role, 
              joinedAt: member.joinedAt,
              contributions: member.contributions 
            } : null;
          })
        );
        setMembers(memberDetails.filter(Boolean) as (User & { role: string; joinedAt: Date })[]);

        // Load existing document content for this specific group
        const savedDocument = await db.loadDocument(`group-${groupData.id}-main-doc`);
        if (savedDocument) {
          setDocumentContent(savedDocument.content);
          setDocumentVersion(savedDocument.version);
        } else {
          // Create initial document template for new groups
          const initialContent = createInitialDocumentTemplate(groupData, unitData);
          setDocumentContent(initialContent);
          setDocumentVersion(1);
          // Save the initial template
          await db.saveDocument(`group-${groupData.id}-main-doc`, initialContent, 1);
        }

        // Load tasks for this group
        loadGroupTasks(groupData.id);

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

  // Create initial document template specific to the group
  const createInitialDocumentTemplate = (groupData: Group, unitData: Unit | null) => {
    const membersList = groupData.members || [];
    
    const template = `# ${groupData.name} - Collaborative Workspace

## Group Information
- **Group Name:** ${groupData.name}
- **Description:** ${groupData.description || 'No description provided'}
- **Unit:** ${unitData ? `${unitData.code} - ${unitData.name}` : 'General Group'}
- **Created:** ${new Date(groupData.createdAt).toLocaleDateString()}
- **Members:** ${membersList.length}/${groupData.maxMembers}

## Team Members
${membersList.map(member => {
  const memberData = members.find(m => m.id === member.userId);
  return `- **${memberData?.name || 'Unknown'}** (${member.role === 'leader' ? '👑 Leader' : 'Member'}) - Joined ${new Date(member.joinedAt).toLocaleDateString()}`;
}).join('\n')}

## Project Overview
*Use this section to outline your project goals, requirements, and deliverables.*

---

## Meeting Notes
*Record your team meetings and decisions here.*

### Meeting 1 - ${new Date().toLocaleDateString()}
- **Attendees:** 
- **Agenda:** 
- **Decisions:** 
- **Action Items:** 

---

## Resources and Links
- **GitHub Repository:** [Add your repo link here]
- **Google Drive:** [Add shared drive link here]
- **Reference Materials:** [Add any reference links here]

---

## Progress Tracking
*Track your project milestones and progress here.*

- [ ] Project planning completed
- [ ] Requirements gathering
- [ ] Design phase
- [ ] Implementation started
- [ ] Testing phase
- [ ] Final submission

---

*This document is collaboratively edited by all group members. Start typing below to add your content!*

`;
    return template;
  };

  // Load tasks for the group
  const loadGroupTasks = async (groupId: string) => {
    try {
      // Load tasks from localStorage for now (in production, load from database)
      const savedTasks = localStorage.getItem(`group_tasks_${groupId}`);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined
        })));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  // Save tasks to storage
  const saveGroupTasks = useCallback((updatedTasks: Task[]) => {
    if (group) {
      localStorage.setItem(`group_tasks_${group.id}`, JSON.stringify(updatedTasks));
    }
  }, [group]);

  // Initialize WebSocket connection for this specific group
  useEffect(() => {
    if (groupId && userId && userName && group) {
      try {
        setConnectionStatus('connecting');
        // Connect using a document ID specific to this group
        wsManager.connect(`group-${groupId}-main-doc`, userId, userName);
        
        // Listen for connection status
        wsManager.on('connection_status', (status: any) => {
          setConnectionStatus(status.connected ? 'connected' : 'disconnected');
        });

        // Listen for document changes from other group members
        wsManager.on('document_change', (message: any) => {
          if (message.payload.documentId === `group-${groupId}-main-doc` && message.userId !== userId) {
            setDocumentContent(message.payload.content);
            setDocumentVersion(message.payload.version);
          }
        });

        // Listen for task updates
        wsManager.on('task_updated', (message: any) => {
          if (message.payload?.groupId === groupId && message.userId !== userId) {
            loadGroupTasks(groupId);
          }
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        setConnectionStatus('disconnected');
        toast({
          title: "Connection Error",
          description: "Failed to connect to real-time collaboration. Working in offline mode.",
          variant: "destructive"
        });
      }
    }

    return () => {
      // Cleanup WebSocket listeners
      wsManager.off('connection_status', () => {});
      wsManager.off('document_change', () => {});
      wsManager.off('task_updated', () => {});
    };
  }, [groupId, userId, userName, group, toast]);

  // Handle document content changes
  const handleDocumentChange = useCallback(async (content: string) => {
    setDocumentContent(content);
    const newVersion = documentVersion + 1;
    setDocumentVersion(newVersion);

    // Save to database
    if (group) {
      await db.saveDocument(`group-${group.id}-main-doc`, content, newVersion);
      
      // Send to other group members via WebSocket
      wsManager.sendDocumentChange(
        `group-${group.id}-main-doc`,
        content,
        0, // cursor position
        newVersion
      );
    }
  }, [group, documentVersion]);

  // Handle Google Meet video call
  const handleVideoCall = () => {
    // Generate a fresh Google Meet meeting link
    const meetUrl = `https://meet.google.com/new`;
    
    window.open(meetUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: "Google Meet Opened",
      description: `New meeting created for ${group?.name}. Share the meeting link with your team members.`,
    });

    // Log meeting in group history (in production, save to database)
    if (group) {
      const meetingRecord = {
        id: `meeting-${Date.now()}`,
        title: `${group.name} Video Call`,
        scheduledAt: new Date(),
        duration: 0,
        participants: [userId],
        status: 'ongoing' as const
      };
      
      // In production, save to database
      console.log('Meeting started:', meetingRecord);
    }
  };

  // Handle GitHub integration
  const handleGitHub = () => {
    const githubUrl = `https://github.com/new`;
    window.open(githubUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: "GitHub Repository",
      description: "Create a new repository for your group project.",
    });
  };

  // Task management functions
  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !group) return;

    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newTask.title,
      description: newTask.description,
      assigneeId: newTask.assigneeId || undefined,
      assigneeName: newTask.assigneeId ? members.find(m => m.id === newTask.assigneeId)?.name : undefined,
      status: 'todo',
      priority: newTask.priority,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      createdBy: userId,
      createdAt: new Date()
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    saveGroupTasks(updatedTasks);

    // Send task update to other group members
    wsManager.sendTaskUpdate({ action: 'created', task }, group.id);

    setNewTask({ title: "", description: "", assigneeId: "", priority: "medium", dueDate: "" });
    setIsNewTaskOpen(false);
    
    toast({
      title: "Task Created",
      description: `"${task.title}" has been added to the task board.`
    });
  };

  const moveTask = async (taskId: string, newStatus: Task['status']) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);
    saveGroupTasks(updatedTasks);

    // Send task update to other group members
    wsManager.sendTaskUpdate({ action: 'moved', taskId, status: newStatus }, group.id);

    const task = tasks.find(t => t.id === taskId);
    toast({
      title: "Task Updated",
      description: `"${task?.title}" moved to ${newStatus.replace('-', ' ')}.`
    });
  };

  // Handle group deletion
  const handleDeleteGroup = async () => {
    if (!group) return;
    
    setIsDeleting(true);
    try {
      const result = await db.deleteGroup(group.id, userId);
      
      if (result.success) {
        toast({
          title: "Group Deleted",
          description: `"${group.name}" has been permanently deleted.`,
        });
        
        // Navigate back to dashboard or unit page
        if (unit) {
          navigate(`/unit/${unit.id}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        toast({
          title: "Cannot Delete Group",
          description: result.error || "Failed to delete group",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete group. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteGroupOpen(false);
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'in-progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'review': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'done': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  // Check if current user can delete the group
  const canDeleteGroup = () => {
    if (!group) return false;
    const isLeader = group.members.find(m => m.userId === userId && m.role === 'leader');
    const isCreator = group.createdById === userId;
    return isLeader || isCreator;
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-card flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading {group?.name || 'workspace'}...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-card flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Group Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested group workspace could not be found.</p>
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
        {/* Dynamic Header for This Specific Group */}
        <div className="mb-6">
          <Link 
            to={unit ? `/unit/${unit.id}` : "/dashboard"} 
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {unit ? `Back to ${unit.code}` : 'Back to Dashboard'}
          </Link>
          
          <div className="bg-card/80 backdrop-blur-sm border-primary/10 rounded-lg p-6 shadow-card">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {connectionStatus === 'connected' ? '🟢 Live' : connectionStatus === 'connecting' ? '🟡 Connecting' : '🔴 Offline'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {group.description && (
                    <p className="text-muted-foreground">{group.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    {unit && (
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {unit.code} - {unit.name}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {group.members.length}/{group.maxMembers} members
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Created {new Date(group.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Video Call Integration */}
                <Button variant="outline" size="sm" onClick={handleVideoCall}>
                  <Video className="w-4 h-4 mr-2" />
                  Google Meet
                </Button>
                
                <Button variant="outline" size="sm" onClick={handleGitHub}>
                  <GitBranch className="w-4 h-4 mr-2" />
                  GitHub
                </Button>
                
                {/* Group Management Dropdown */}
                {canDeleteGroup() && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-sm border-primary/10">
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Group Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog open={isDeleteGroupOpen} onOpenChange={setIsDeleteGroupOpen}>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Group
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card/95 backdrop-blur-sm border-primary/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground flex items-center">
                              <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
                              Delete Group
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Are you sure you want to permanently delete "{group.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          
                          <div className="space-y-4">
                            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                              <p className="text-sm text-destructive font-medium mb-2">This will permanently delete:</p>
                              <ul className="text-sm text-destructive space-y-1">
                                <li>• All group documents and collaborative content</li>
                                <li>• Complete chat history and messages</li>
                                <li>• All tasks and project files</li>
                                <li>• Access for all {group.members.length} group members</li>
                              </ul>
                            </div>
                          </div>
                          
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteGroup}
                              disabled={isDeleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeleting ? "Deleting..." : "Delete Group"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* Group Members Avatars */}
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    {members.slice(0, 4).map((member) => (
                      <Avatar
                        key={member.id}
                        className="w-8 h-8 border-2 border-card"
                        title={`${member.name} - ${member.role === 'leader' ? 'Leader' : 'Member'}`}
                      >
                        <AvatarFallback 
                          className="text-xs font-medium text-white"
                          style={{ backgroundColor: `hsl(${Math.abs(member.id.charCodeAt(0)) % 360}, 70%, 50%)` }}
                        >
                          {member.name.split(' ').map(n => n[0]).join('')}
                          {member.role === 'leader' && <Crown className="w-2 h-2 absolute top-0 right-0" />}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {members.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-card">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Tabs - Specific to This Group */}
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

          {/* Collaborative Document Editor - Group Specific */}
          <TabsContent value="document">
            <CollaborativeEditor
              documentId={`group-${group.id}-main-doc`}
              initialContent={documentContent}
              groupId={group.id}
              userId={userId}
              userName={userName}
              onContentChange={handleDocumentChange}
            />
          </TabsContent>

          {/* Real-time Chat - Group Specific */}
          <TabsContent value="chat">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-0 h-[600px]">
                <RealtimeChat
                  groupId={group.id}
                  userId={userId}
                  userName={userName}
                  initialMessages={[]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Board - Group Specific */}
          <TabsContent value="tasks">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-foreground">
                  Task Board for {group.name}
                </h3>
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
                        Add a new task for {group.name}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="taskTitle" className="text-foreground">Title *</Label>
                        <Input
                          id="taskTitle"
                          placeholder="Enter task title"
                          value={newTask.title}
                          onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                          className="bg-card/50 border-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taskDescription" className="text-foreground">Description</Label>
                        <Textarea
                          id="taskDescription"
                          placeholder="Describe the task"
                          value={newTask.description}
                          onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-card/50 border-primary/20 focus:border-primary"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="taskAssignee" className="text-foreground">Assignee</Label>
                          <Select value={newTask.assigneeId} onValueChange={(value) => setNewTask(prev => ({ ...prev, assigneeId: value }))}>
                            <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                              <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {members.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name} {member.role === 'leader' && '👑'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="taskPriority" className="text-foreground">Priority</Label>
                          <Select value={newTask.priority} onValueChange={(value: "low" | "medium" | "high") => setNewTask(prev => ({ ...prev, priority: value }))}>
                            <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="taskDueDate" className="text-foreground">Due Date</Label>
                        <Input
                          id="taskDueDate"
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="bg-card/50 border-primary/20 focus:border-primary"
                        />
                      </div>
                      <Button 
                        onClick={handleCreateTask} 
                        className="w-full" 
                        variant="hero"
                        disabled={!newTask.title.trim()}
                      >
                        Create Task
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Kanban Board */}
              <div className="grid md:grid-cols-4 gap-6">
                {/* To Do */}
                <div>
                  <h4 className="font-medium text-foreground mb-4 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
                    To Do ({getTasksByStatus('todo').length})
                  </h4>
                  <div className="space-y-3">
                    {getTasksByStatus('todo').map((task) => (
                      <Card key={task.id} className="bg-card/60 border-primary/10 hover:shadow-card transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-foreground text-sm">{task.title}</h5>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                          )}
                          <div className="space-y-2">
                            {task.assigneeName && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <UserIcon className="w-3 h-3 mr-1" />
                                {task.assigneeName}
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 mr-1" />
                                Due {task.dueDate.toLocaleDateString()}
                              </div>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => moveTask(task.id, 'in-progress')}
                              className="w-full text-xs"
                            >
                              Start Task
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
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                    In Progress ({getTasksByStatus('in-progress').length})
                  </h4>
                  <div className="space-y-3">
                    {getTasksByStatus('in-progress').map((task) => (
                      <Card key={task.id} className="bg-card/60 border-blue-500/20 hover:shadow-card transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-foreground text-sm">{task.title}</h5>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                          )}
                          <div className="space-y-2">
                            {task.assigneeName && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <UserIcon className="w-3 h-3 mr-1" />
                                {task.assigneeName}
                              </div>
                            )}
                            <div className="flex space-x-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => moveTask(task.id, 'review')}
                                className="flex-1 text-xs"
                              >
                                Review
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => moveTask(task.id, 'done')}
                                className="flex-1 text-xs"
                              >
                                Complete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Review */}
                <div>
                  <h4 className="font-medium text-foreground mb-4 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                    Review ({getTasksByStatus('review').length})
                  </h4>
                  <div className="space-y-3">
                    {getTasksByStatus('review').map((task) => (
                      <Card key={task.id} className="bg-card/60 border-purple-500/20 hover:shadow-card transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-foreground text-sm">{task.title}</h5>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                          )}
                          <div className="space-y-2">
                            {task.assigneeName && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <UserIcon className="w-3 h-3 mr-1" />
                                {task.assigneeName}
                              </div>
                            )}
                            <div className="flex space-x-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => moveTask(task.id, 'in-progress')}
                                className="flex-1 text-xs"
                              >
                                Back
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => moveTask(task.id, 'done')}
                                className="flex-1 text-xs"
                              >
                                Approve
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Done */}
                <div>
                  <h4 className="font-medium text-foreground mb-4 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    Done ({getTasksByStatus('done').length})
                  </h4>
                  <div className="space-y-3">
                    {getTasksByStatus('done').map((task) => (
                      <Card key={task.id} className="bg-card/60 border-green-500/20 hover:shadow-card transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-foreground text-sm">{task.title}</h5>
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                              ✓ Complete
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                          )}
                          {task.assigneeName && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <UserIcon className="w-3 h-3 mr-1" />
                              Completed by {task.assigneeName}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* File Sharing - Group Specific */}
          <TabsContent value="files">
            <FileSharing
              groupId={group.id}
              userId={userId}
              userName={userName}
              initialFiles={[]}
            />
          </TabsContent>

          {/* Assignment Submission - Group Specific */}
          <TabsContent value="submit">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-foreground">Submit Assignment - {group.name}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Submit your completed group assignment for {unit ? unit.name : 'this project'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {unit && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-medium text-foreground mb-2">
                      Assignment for {unit.code} - {unit.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Submit your group work for {unit.semester} {unit.year}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      Due: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} at 11:59 PM
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Group Members Contributing</Label>
                    <div className="mt-2 space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-secondary/10 rounded">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">{member.name}</span>
                            {member.role === 'leader' && <Crown className="w-3 h-3 text-yellow-500" />}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-foreground">Submission Files</Label>
                    <div className="mt-2 border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload your group's completed assignment files
                      </p>
                      <Button variant="outline" size="sm">Browse Files</Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="submissionComments" className="text-foreground">Group Comments</Label>
                    <Textarea
                      id="submissionComments"
                      placeholder={`Add comments about ${group.name}'s submission...`}
                      className="bg-card/50 border-primary/20 focus:border-primary"
                      rows={4}
                    />
                  </div>

                  <Button className="w-full" variant="hero" size="lg">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Assignment for {group.name}
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