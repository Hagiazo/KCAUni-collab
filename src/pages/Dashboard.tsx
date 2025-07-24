import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, MessageSquare, Clock, Plus, Settings, LogOut, Bell, TrendingUp, Calendar, FileText, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/ui/notification-bell";
import { CreateGroupDialog } from "@/components/ui/create-group-dialog";
import { CreateUnitDialog } from "@/components/ui/create-unit-dialog";
import { db, type Unit, type Group } from "@/lib/database";

const Dashboard = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");
    const id = localStorage.getItem("userId") || "1"; // Default for demo
    
    if (!role || !name) {
      navigate("/login");
      return;
    }
    
    setUserRole(role);
    setUserName(name);
    setUserId(id);
    loadDashboardData(role, id);
  }, [navigate]);

  const loadDashboardData = async (role: string, userId: string) => {
    setIsLoading(true);
    try {
      if (role === 'student') {
        const studentUnits = await db.getUnitsByStudent(userId);
        setUnits(studentUnits);
        
        // Load groups for all units
        const allGroups = await Promise.all(
          studentUnits.map(unit => db.getGroupsByUnit(unit.id))
        );
        const userGroups = allGroups.flat().filter(group => 
          group.members.some(member => member.userId === userId)
        );
        setGroups(userGroups);
      } else if (role === 'lecturer') {
        const lecturerUnits = await db.getUnitsByLecturer(userId);
        setUnits(lecturerUnits);
        
        // Load all groups for lecturer's units
        const allGroups = await Promise.all(
          lecturerUnits.map(unit => db.getGroupsByUnit(unit.id))
        );
        setGroups(allGroups.flat());
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

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out."
    });
    navigate("/");
  };

  const handleUnitCreated = () => {
    if (userId && userRole) {
      loadDashboardData(userRole, userId);
    }
  };

  const handleGroupCreated = () => {
    if (userId && userRole) {
      loadDashboardData(userRole, userId);
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
              <span className="text-xl font-bold text-header-foreground">UniCollab</span>
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
                          {userRole === 'student' ? `Course: ${unit.course}` : `${unit.enrolledStudents.length} students enrolled`}
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
                      <span className="flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {unit.credits} credits
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
                        <Link to={`/group/${group.id}`}>
                          <Button variant="outline" size="sm">
                            Open Workspace
                          </Button>
                        </Link>
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
                    <p className="text-sm text-muted-foreground">Student submitted assignment</p>
                    <p className="font-medium text-foreground">CS301 - Project Proposal</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">New group created</p>
                    <p className="font-medium text-foreground">CS401 - Team Delta</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
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