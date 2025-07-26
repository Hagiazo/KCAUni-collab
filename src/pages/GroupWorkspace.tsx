import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoCall } from "@/components/ui/video-call";
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
  User,
  Paperclip,
  Smile,
  GitBranch,
  Save,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { wsManager } from "@/lib/websocket";

const GroupWorkspace = () => {
  const { unitId, groupId } = useParams();
  const { toast } = useToast();
  const [userName] = useState(localStorage.getItem("userName") || "John Doe");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const userId = localStorage.getItem("userId") || "1";
  // State for different components
  const [document, setDocument] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [newTask, setNewTask] = useState({ title: "", description: "", assignee: "" });
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [documentSaved, setDocumentSaved] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  // Initialize WebSocket connection
  useEffect(() => {
    if (groupId && userId && userName) {
      wsManager.connect(groupId, userId, userName);
    }
  }, [groupId, userId, userName]);

  // Mock data
  const mockGroup = {
    id: groupId,
    name: "Team Alpha",
    unit: "CS301 - Database Systems",
    members: [
      { id: 1, name: "John Doe", email: "john@university.edu", role: "Leader", online: true },
      { id: 2, name: "Jane Smith", email: "jane@university.edu", role: "Member", online: true },
      { id: 3, name: "Mike Johnson", email: "mike@university.edu", role: "Member", online: false }
    ]
  };

  // Mock shared files
  const mockFiles = [
    {
      id: '1',
      name: 'Requirements_Document.pdf',
      type: 'application/pdf',
      size: 2400000,
      uploadedBy: 'John Doe',
      uploadedAt: new Date('2024-02-05T14:30:00'),
      description: 'Project requirements and specifications',
      version: 1,
      isShared: true
    }
  ];

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "Jane Smith",
      message: "Hey everyone! I've updated the ER diagram section. Please review when you get a chance.",
      timestamp: "10:30 AM",
      type: "text"
    },
    {
      id: 2,
      sender: "Mike Johnson",
      message: "Great work Jane! I'll add the normalization examples this afternoon.",
      timestamp: "10:45 AM",
      type: "text"
    },
    {
      id: 3,
      sender: "John Doe",
      message: "I've uploaded the requirements document. Check the Files tab.",
      timestamp: "11:15 AM",
      type: "text"
    },
    {
      id: 4,
      sender: "Jane Smith",
      message: "Perfect! Should we schedule a call to discuss the SQL section?",
      timestamp: "11:20 AM",
      type: "text"
    }
  ]);

  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Create ER Diagram",
      description: "Design the entity-relationship diagram for the university database",
      assignee: "Jane Smith",
      status: "In Progress",
      priority: "High",
      dueDate: "2024-02-10"
    },
    {
      id: 2,
      title: "Write SQL Queries",
      description: "Implement the required queries for data retrieval",
      assignee: "Mike Johnson",
      status: "To Do",
      priority: "Medium",
      dueDate: "2024-02-12"
    },
    {
      id: 3,
      title: "Database Normalization",
      description: "Apply normalization rules and document the process",
      assignee: "John Doe",
      status: "Done",
      priority: "Medium",
      dueDate: "2024-02-08"
    }
  ]);

  const [files] = useState([
    {
      id: 1,
      name: "Requirements_Document.pdf",
      type: "PDF",
      size: "2.4 MB",
      uploadedBy: "John Doe",
      uploadedAt: "2024-02-05 14:30"
    },
    {
      id: 2,
      name: "ER_Diagram_v2.png",
      type: "Image",
      size: "856 KB",
      uploadedBy: "Jane Smith",
      uploadedAt: "2024-02-06 09:15"
    },
    {
      id: 3,
      name: "SQL_Queries.sql",
      type: "SQL",
      size: "12 KB",
      uploadedBy: "Mike Johnson",
      uploadedAt: "2024-02-06 16:45"
    }
  ]);

  // Handle document content changes
  const handleDocumentChange = useCallback((content: string) => {
    setDocument(content);
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

  useEffect(() => {
    // Initialize with sample document content
    setDocument(`# Database Systems Project - Team Alpha

## Project Overview
This project focuses on designing and implementing a comprehensive database system for a university management system.

## Team Members
- John Doe (Leader)
- Jane Smith
- Mike Johnson

## Current Progress

### 1. Requirements Analysis ✅
- Gathered functional requirements
- Identified key entities and relationships
- Documented business rules

### 2. ER Diagram Design 🔄
- Initial ER diagram completed
- Currently refining relationships
- Adding cardinality constraints

### 3. Database Normalization
- First Normal Form (1NF) ✅
- Second Normal Form (2NF) ✅ 
- Third Normal Form (3NF) 🔄

### 4. SQL Implementation
- DDL statements planned
- DML queries in progress
- Test data preparation

## Next Steps
1. Finalize ER diagram
2. Implement database schema
3. Create sample data
4. Test queries and constraints

---
*Last updated by: Jane Smith at 2024-02-06 11:30*`);
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link to={`/unit/${unitId}`} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Unit
          </Link>
          
          <div className="bg-card/80 backdrop-blur-sm border-primary/10 rounded-lg p-6 shadow-card">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">{mockGroup.name}</h1>
                <p className="text-muted-foreground">{mockGroup.unit}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{mockGroup.members.length} members</span>
                </div>
                <div className="flex -space-x-2">
                  <VideoCall 
                    groupId={groupId!}
                    participants={mockGroup.members.map(member => ({
                      id: member.id.toString(),
                      name: member.name,
                      isOnline: member.online
                    }))}
                  />
                  <Button variant="outline" size="sm" className="ml-2">
                    <GitBranch className="w-4 h-4 mr-2" />
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  </Button>
                </div>
                <div className="flex -space-x-2">
                  {mockGroup.members.map((member) => (
                    <div
                      key={member.id}
                      className={`w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground border-2 border-card ${
                        member.online ? 'ring-2 ring-green-500' : ''
                      }`}
                      title={`${member.name} - ${member.online ? 'Online' : 'Offline'}`}
                    >
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  ))}
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
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-foreground">Collaborative Document</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Real-time collaborative editing for your group project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CollaborativeEditor
                  documentId={`group-${groupId}-main-doc`}
                  initialContent={document}
                  groupId={groupId!}
                  userId={userId}
                  userName={userName}
                  onContentChange={handleDocumentChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-0 h-[600px]">
                <RealtimeChat
                  groupId={groupId!}
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
                            {mockGroup.members.map((member) => (
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
              groupId={groupId!}
              userId={userId}
              userName={userName}
              initialFiles={mockFiles}
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
                  <h4 className="font-medium text-foreground mb-2">Assignment: ER Diagram Design</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create an ER diagram for the university system including entities, relationships, and constraints.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    Due: February 15, 2024 at 11:59 PM
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