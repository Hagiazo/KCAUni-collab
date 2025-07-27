import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db, type Unit, type Group, type User } from "@/lib/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  MessageSquare, 
  Calendar, 
  FileText, 
  ArrowLeft,
  Clock,
  User,
  BookOpen,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Unit = () => {
  const { unitId } = useParams();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "student");
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");
  const [unit, setUnit] = useState<Unit | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    maxMembers: "4"
  });

  useEffect(() => {
    loadUnitData();
  }, [unitId]);

  const loadUnitData = async () => {
    if (!unitId) return;
    
    setIsLoading(true);
    try {
      const unitData = await db.getUnitById(unitId);
      if (unitData) {
        setUnit(unitData);
        
        // Load groups for this unit
        const unitGroups = await db.getGroupsByUnit(unitId);
        setGroups(unitGroups);
        
        // Load enrolled students
        const enrolledStudents = await db.getStudentsInUnit(unitId);
        setStudents(enrolledStudents);
        
        // Load available students for lecturer
        if (userRole === 'lecturer') {
          const availableStudentsData = await db.getStudentsByCourseForUnit(unitData.courseId, unitId);
          setAvailableStudents(availableStudentsData);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load unit data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = () => {
    if (!unit || !userId) return;
    
    const createGroup = async () => {
      try {
        await db.createGroup({
          name: newGroup.name,
          description: newGroup.description,
          unitId: unit.id,
          courseId: unit.courseId,
          leaderId: userId,
          members: [{
            userId: userId,
            role: 'leader',
            joinedAt: new Date(),
            contributions: 0
          }],
          maxMembers: parseInt(newGroup.maxMembers),
          workspace: {
            documents: [],
            chatMessages: [],
            tasks: [],
            files: [],
            submissions: [],
            meetingHistory: []
          },
          createdBy: userRole as 'lecturer' | 'student',
          createdById: userId
        });
        
        toast({
          title: "Group Created!",
          description: `Successfully created "${newGroup.name}". You can now start collaborating.`
        });
        
        setIsCreateGroupOpen(false);
        setNewGroup({ name: "", description: "", maxMembers: "4" });
        loadUnitData(); // Refresh data
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create group",
          variant: "destructive"
        });
      }
    };
    
    createGroup();
  };

  const handleJoinGroup = (groupId: number, groupName: string) => {
    const joinGroup = async () => {
      try {
        const result = await db.joinGroup(groupId.toString(), userId);
        if (result.success) {
          toast({
            title: "Joined Group!",
            description: `You've successfully joined "${groupName}". Welcome to the team!`
          });
          loadUnitData(); // Refresh data
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to join group",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to join group",
          variant: "destructive"
        });
      }
    };
    
    joinGroup();
  };
  
  const handleAddStudent = async () => {
    if (!selectedStudent || !unitId) return;
    
    try {
      const success = await db.enrollStudentInUnit(unitId, selectedStudent, userId);
      if (success) {
        toast({
          title: "Student Added",
          description: "Student has been successfully enrolled in the unit."
        });
        setIsAddStudentOpen(false);
        setSelectedStudent("");
        loadUnitData(); // Refresh data
      } else {
        toast({
          title: "Error",
          description: "Failed to add student to unit",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add student to unit",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-card flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading unit data...</p>
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="min-h-screen bg-gradient-card flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Unit Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested unit could not be found.</p>
          <Link to="/dashboard">
            <Button variant="hero">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="bg-card/80 backdrop-blur-sm border-primary/10 rounded-lg p-6 shadow-card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {unit.code} - {unit.name}
                </h1>
                <p className="text-muted-foreground text-lg mb-4">{unit.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Lecturer: {userRole === 'lecturer' ? 'You' : 'Lecturer'}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {students.length} students enrolled
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {unit.semester}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {unit.credits} Credits
              </Badge>
            </div>
            
            {userRole === 'lecturer' && (
              <div className="flex space-x-2 mt-4">
                <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Add Student to Unit</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Select a student to enroll in this unit.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="studentSelect" className="text-foreground">Select Student</Label>
                        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                          <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                            <SelectValue placeholder="Choose a student" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStudents.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} ({student.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddStudent} className="w-full" variant="hero" disabled={!selectedStudent}>
                        Add Student
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Groups Section */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Groups</h2>
              {userRole === 'student' && (
                <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                  <DialogTrigger asChild>
                    <Button variant="accent" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Create New Group</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Start a new collaboration group for this unit.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="groupName" className="text-foreground">Group Name</Label>
                        <Input
                          id="groupName"
                          placeholder="Enter group name"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-card/50 border-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <Label htmlFor="groupDescription" className="text-foreground">Description</Label>
                        <Textarea
                          id="groupDescription"
                          placeholder="Describe your group's focus or goals"
                          value={newGroup.description}
                          onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-card/50 border-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxMembers" className="text-foreground">Maximum Members</Label>
                        <Select value={newGroup.maxMembers} onValueChange={(value) => setNewGroup(prev => ({ ...prev, maxMembers: value }))}>
                          <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 members</SelectItem>
                            <SelectItem value="3">3 members</SelectItem>
                            <SelectItem value="4">4 members</SelectItem>
                            <SelectItem value="5">5 members</SelectItem>
                            <SelectItem value="6">6 members</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateGroup} className="w-full" variant="hero">
                        Create Group
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="space-y-4">
              {groups.map((group) => (
                <Card key={group.id} className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300 hover:scale-[1.01]">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-foreground">{group.name}</CardTitle>
                        <CardDescription className="text-muted-foreground mt-1">
                          {group.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={`${group.members.length >= group.maxMembers ? 'bg-accent/10 text-accent border-accent/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                        {group.members.length}/{group.maxMembers} members
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Members */}
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Members</p>
                        <div className="flex flex-wrap gap-2">
                          {group.members.map((member) => (
                            <div key={member.userId} className="flex items-center bg-secondary/20 rounded-full px-3 py-1">
                              <User className="w-3 h-3 mr-1 text-muted-foreground" />
                              <span className="text-xs text-foreground">
                                {students.find(s => s.id === member.userId)?.name || 'Unknown'} {member.role === 'leader' && '👑'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Current Assignment & Progress */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current Assignment</p>
                          <p className="font-medium text-foreground">{group.currentAssignment || 'No assignment'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Progress</p>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-secondary/20 rounded-full h-2">
                              <div 
                                className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground">{Math.floor(Math.random() * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          Last activity: {new Date(group.lastActivity).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <Link to={`/group/${group.id}`}>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              View Workspace
                            </Button>
                          </Link>
                          {userRole === 'student' && group.members.length < group.maxMembers && (
                            <Button 
                              size="sm" 
                              variant="hero"
                              onClick={() => handleJoinGroup(parseInt(group.id), group.name)}
                            >
                              Join Group
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {groups.length === 0 && (
                <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                  <CardContent className="p-6 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No groups created yet</p>
                    <p className="text-xs text-muted-foreground mt-2">Create a group to start collaborating</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignments */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center">
                  <Target className="w-5 h-5 mr-2 text-primary" />
                  Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unit.assignments.map((assignment) => (
                    <div key={assignment.id} className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-foreground text-sm">{assignment.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            assignment.status === 'published' 
                              ? 'bg-primary/10 text-primary border-primary/20' 
                              : 'bg-muted/10 text-muted-foreground border-muted/20'
                          }`}
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{assignment.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        <span className={`font-medium ${assignment.type === 'Group' ? 'text-primary' : 'text-accent'}`}>
                          {assignment.type}
                        </span>
                      </div>
                    </div>
                  ))}
                  {unit.assignments.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No assignments yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Unit Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Groups</span>
                    <span className="font-medium text-foreground">{groups.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Assignments</span>
                    <span className="font-medium text-foreground">
                      {unit.assignments.filter(a => a.status === 'published').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enrolled Students</span>
                    <span className="font-medium text-foreground">{students.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unit;