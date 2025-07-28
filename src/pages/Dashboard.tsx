import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, MessageSquare, Clock, Plus, Settings, LogOut, Bell, TrendingUp, Calendar, FileText, AlertCircle, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/ui/notification-bell";
import { CreateGroupDialog } from "@/components/ui/create-group-dialog";
import { CreateUnitDialog } from "@/components/ui/create-unit-dialog";
import { db, type Unit, type Group, type User } from "@/lib/database";

const Dashboard = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCourse, setUserCourse] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchUnitsOpen, setIsSearchUnitsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    maxMembers: "4"
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");
    const id = localStorage.getItem("userId");
    const course = localStorage.getItem("userCourse");
    
    if (!role || !name || !id) {
      navigate("/login");
      return;
    }
    
    setUserRole(role);
    setUserName(name);
    setUserId(id);
    setUserCourse(course);
    loadDashboardData(role, id, course);
  }, [navigate]);

  const loadDashboardData = async (role: string, userId: string, courseId?: string | null) => {
    setIsLoading(true);
    try {
      if (role === 'student') {
        const studentUnits = await db.getUnitsByStudent(userId);
        setUnits(studentUnits);
        
        const userGroups = await db.getGroupsByStudent(userId);
        setGroups(userGroups);
        
        // Load available units for enrollment
        const availableUnitsData = await db.getAvailableUnitsForStudent(userId);
        setAvailableUnits(availableUnitsData);
      } else if (role === 'lecturer') {
        const lecturerUnits = await db.getUnitsByLecturer(userId);
        setUnits(lecturerUnits);
        
        const lecturerGroups = await db.getGroupsByLecturer(userId);
        setGroups(lecturerGroups);

        // Load all students for lecturer overview
        const allStudents = await db.getAllUsers();
        setStudents(allStudents.filter(u => u.role === 'student'));
      }
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollInUnit = async (unitId: string) => {
    try {
      const result = await db.requestEnrollment(unitId, userId, "Request to enroll in this unit");
      if (result.success) {
        toast({
          title: "Enrollment Request Sent",
          description: "Your enrollment request has been sent to the lecturer for approval."
        });
        // Refresh available units
        const availableUnitsData = await db.getAvailableUnitsForStudent(userId);
        setAvailableUnits(availableUnitsData);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send enrollment request",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send enrollment request",
        variant: "destructive"
      });
    }
  };

  const handleCreateGeneralGroup = async () => {
    if (!newGroup.name.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a general group without a specific unit
      await db.createGroup({
        name: newGroup.name,
        description: newGroup.description || "General collaboration group",
        unitId: "", // No specific unit
        courseId: userCourse || "",
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
        createdBy: 'student',
        createdById: userId
      });

      toast({
        title: "Group created successfully!",
        description: `"${newGroup.name}" has been created.`
      });

      setNewGroup({ name: "", description: "", maxMembers: "4" });
      setIsCreateGroupOpen(false);
      
      // Refresh groups
      if (userId && userRole) {
        loadDashboardData(userRole, userId, userCourse);
      }
    } catch (error) {
      toast({
        title: "Error creating group",
        description: "Failed to create group. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userCourse");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out."
    });
    navigate("/");
  };

  const handleUnitCreated = () => {
    if (userId && userRole) {
      loadDashboardData(userRole, userId, userCourse);
    }
  };

  const handleGroupCreated = () => {
    if (userId && userRole) {
      loadDashboardData(userRole, userId, userCourse);
    }
  };

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    try {
      const result = await db.joinGroup(groupId, userId);
      if (result.success) {
        toast({
          title: "Joined Group!",
          description: `You've successfully joined "${groupName}". Welcome to the team!`
        });
        loadDashboardData(userRole, userId, userCourse); // Refresh data
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

  if (!userRole || !userName || !userId) {
    return <div>Loading...</div>;
  }

  const getQuickStats = () => {
    if (userRole === 'student') {
      return [
        { label: 'Enrolled Units', value: units.length, icon: BookOpen, color: 'text-primary' },
        { label: 'Active Groups', value: groups.length, icon: Users, color: 'text-accent' },
        { label: 'Pending Tasks', value: groups.reduce((sum, group) => sum + group.workspace.tasks.filter(t => t.status !== 'done').length, 0), icon: Clock, color: 'text-destructive' },
        { label: 'Messages', value: groups.reduce((sum, group) => sum + group.workspace.chatMessages.length, 0), icon: MessageSquare, color: 'text-secondary' }
      ];
    } else {
      const totalStudents = units.reduce((sum, unit) => sum + unit.enrolledStudents.length, 0);
      const totalGroups = groups.length;
      const pendingSubmissions = groups.reduce((sum, group) => sum + group.workspace.submissions.filter(s => s.status === 'submitted').length, 0);
      
      return [
        { label: 'Teaching Units', value: units.length, icon: BookOpen, color: 'text-primary' },
        { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-accent' },
        { label: 'Active Groups', value: totalGroups, icon: Users, color: 'text-secondary' },
        { label: 'Pending Reviews', value: pendingSubmissions, icon: AlertCircle, color: 'text-destructive' }
      ];
    }
  };

  const quickStats = getQuickStats();

  const filteredAvailableUnits = availableUnits.filter(unit =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-header shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold text-header-foreground">KCAU UniCollab</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-header-foreground">
                <NotificationBell userId={userId} />
              </div>
              <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-white/10">
                <Settings className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-header-foreground">{userName}</p>
                  <p className="text-xs text-white/70 capitalize">{userRole}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-header-foreground hover:bg-white/10">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'student' 
              ? "Continue working on your group projects and assignments." 
              : "Manage your courses and monitor student progress."
            }
          </p>
          
          {/* Student Quick Actions */}
          {userRole === 'student' && (
            <div className="flex space-x-4 mt-4">
              <Dialog open={isSearchUnitsOpen} onOpenChange={setIsSearchUnitsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    Find Units
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10 max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Available Units</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Search and enroll in available units for your course.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="unitSearch" className="text-foreground">Search Units</Label>
                      <Input
                        id="unitSearch"
                        placeholder="Search by unit name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-card/50 border-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredAvailableUnits.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          {searchTerm ? 'No units match your search' : 'No available units found'}
                        </p>
                                      {unit.semester}
                        filteredAvailableUnits.map((unit) => (
                          <div key={unit.id} className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-foreground">{unit.code} - {unit.name}</h4>
                                <p className="text-sm text-muted-foreground">{unit.description}</p>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {unit.semester} • {unit.credits} credits
                                {unit.semester}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEnrollInUnit(unit.id)}
                              >
                                Request Enrollment
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                <DialogTrigger asChild>
                  <Button variant="accent" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Create New Group</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Create a general collaboration group.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="groupName" className="text-foreground">Group Name *</Label>
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
                      <Input
                        id="groupDescription"
                        placeholder="Describe your group's purpose"
                        value={newGroup.description}
                        onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-card/50 border-primary/20 focus:border-primary"
                      />
                    </div>
                    <Button 
                      onClick={handleCreateGeneralGroup} 
                      variant="hero"
                      disabled={!newGroup.name.trim()}
                      className="w-full"
                    >
                      Create Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index} className="bg-gradient-card border-primary/10 hover:shadow-card transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity Overview for Lecturers */}
        {userRole === 'lecturer' && (
          <Card className="bg-gradient-card border-primary/10 hover:shadow-card transition-all duration-300 mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {groups.slice(0, 3).map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.workspace.submissions.filter(s => s.status === 'submitted').length} pending submissions
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {group.members.length} members
                    </Badge>
                  </div>
                ))}
                {groups.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No groups created yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Units Section */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {userRole === 'student' ? 'My Units' : 'Teaching Units'}
              </h2>
              {userRole === 'lecturer' && (
                <CreateUnitDialog 
                  lecturerId={userId} 
                  onUnitCreated={handleUnitCreated}
                />
              )}
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-card/80 backdrop-blur-sm border-primary/10 animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {units.length === 0 ? (
                  <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                    <CardContent className="p-6 text-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {userRole === 'student' ? 'No units enrolled yet' : 'No units created yet'}
                      </p>
                      {userRole === 'student' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Contact your lecturer to be enrolled in units
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  units.map((unit) => (
                    <Card key={unit.id} className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300 hover:scale-[1.02]">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg text-foreground">{unit.code} - {unit.name}</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              {userRole === 'student' ? `Semester: ${unit.semester}` : `${unit.enrolledStudents.length} students enrolled`}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {unit.assignments.length} assignments
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex space-x-4 text-sm text-muted-foreground mb-4">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {unit.enrolledStudents.length} students
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {unit.semester}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Link to={`/unit/${unit.id}`}>
                            <Button variant="outline" size="sm">
                              View Unit
                            </Button>
                          </Link>
                          {userRole === 'student' && (
                            <CreateGroupDialog 
                              unitId={unit.id}
                              currentUserId={userId}
                              onGroupCreated={handleGroupCreated}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Groups/Activity Section */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {userRole === 'student' ? 'My Groups' : 'Recent Activity'}
            </h2>

            {userRole === 'student' ? (
              <div className="space-y-4">
                {groups.map((group) => (
                  <Card key={group.id} className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-foreground">{group.name}</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {units.find(u => u.id === group.unitId)?.code} • {group.members.length} members
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {group.workspace.chatMessages.length > 0 
                          ? `"${group.workspace.chatMessages[group.workspace.chatMessages.length - 1].message.substring(0, 50)}..."`
                          : "No recent messages"
                        }
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Last activity: {new Date(group.lastActivity).toLocaleDateString()}
                        </span>
                        <div className="flex space-x-2">
                          <Link to={`/group/${group.id}`}>
                            <Button variant="outline" size="sm">
                              Open Workspace
                            </Button>
                          </Link>
                          {!group.members.find(m => m.userId === userId) && group.members.length < group.maxMembers && (
                            <Button 
                              size="sm" 
                              variant="hero"
                              onClick={() => handleJoinGroup(group.id, group.name)}
                            >
                              Join
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {groups.length === 0 && (
                  <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                    <CardContent className="p-6 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No groups joined yet</p>
                      <p className="text-xs text-muted-foreground mt-2">Create or join a group to start collaborating</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total registered students</p>
                    <p className="font-medium text-foreground">{students.length}</p>
                    <p className="text-xs text-muted-foreground">Across all courses</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Active groups</p>
                    <p className="font-medium text-foreground">{groups.length}</p>
                    <p className="text-xs text-muted-foreground">In your units</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;