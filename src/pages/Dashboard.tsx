import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateUnitDialog } from "@/components/ui/create-unit-dialog";
import { NotificationBell } from "@/components/ui/notification-bell";
import { VideoCall } from "@/components/ui/video-call";
import { 
  BookOpen, 
  Users, 
  MessageSquare, 
  Calendar, 
  Settings, 
  LogOut, 
  Plus,
  GraduationCap,
  User,
  Clock,
  Target,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, type Unit, type Group, type Course } from "@/lib/database";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // User data from localStorage
  const [userRole] = useState(localStorage.getItem("userRole") || "");
  const [userName] = useState(localStorage.getItem("userName") || "");
  const [userId] = useState(localStorage.getItem("userId") || "");
  const [userEmail] = useState(localStorage.getItem("userEmail") || "");
  const [userCourse] = useState(localStorage.getItem("userCourse") || "");
  
  // State
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    if (!userRole || !userName || !userId) {
      navigate("/login");
      return;
    }
  }, [userRole, userName, userId, navigate]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // Load units based on user role
        let userUnits: Unit[] = [];
        if (userRole === 'lecturer') {
          userUnits = await db.getUnitsByLecturer(userId);
        } else if (userRole === 'student') {
          userUnits = await db.getUnitsByStudent(userId);
        }
        setUnits(userUnits);

        // Load groups for student
        if (userRole === 'student') {
          const userGroups = await db.getGroupsByStudent(userId);
          setGroups(userGroups);
        } else if (userRole === 'lecturer') {
          const lecturerGroups = await db.getGroupsByLecturer(userId);
          setGroups(lecturerGroups);
        }

        // Load course information for students
        if (userRole === 'student' && userCourse) {
          const courseData = await db.getCourseById(userCourse);
          setCourse(courseData);
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [userId, userRole, userCourse, toast]);

  const handleLogout = () => {
    localStorage.clear();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out."
    });
    navigate("/");
  };

  const handleViewAllAssignments = () => {
    // Navigate to assignments page or show assignments modal
    toast({
      title: "Assignments",
      description: "Assignments feature will be implemented soon."
    });
  };

  const handleManageStudents = () => {
    // Navigate to student management page
    toast({
      title: "Student Management",
      description: "Student management feature will be implemented soon."
    });
  };

  const handleJoinNewUnit = () => {
    // Show available units for enrollment
    const showAvailableUnits = async () => {
      try {
        const availableUnits = await db.getAvailableUnitsForStudent(userId);
        if (availableUnits.length === 0) {
          toast({
            title: "No Units Available",
            description: "No new units are available for enrollment at this time."
          });
        } else {
          toast({
            title: "Available Units",
            description: `${availableUnits.length} units available for enrollment.`
          });
          // In a full implementation, this would open a modal with available units
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load available units.",
          variant: "destructive"
        });
      }
    };
    showAvailableUnits();
  };

  const handleCreateGroup = () => {
    // Navigate to group creation or show modal
    toast({
      title: "Create Group",
      description: "Group creation feature will be implemented soon."
    });
  };

  const handleViewAssignments = () => {
    // Show student assignments
    toast({
      title: "Your Assignments",
      description: "Assignments view will be implemented soon."
    });
  };

  const handleEditProfile = () => {
    // Open profile editing modal
    toast({
      title: "Edit Profile",
      description: "Profile editing feature will be implemented soon."
    });
  };
  const handleUnitCreated = () => {
    // Reload units when a new unit is created
    const loadUnits = async () => {
      if (userRole === 'lecturer') {
        const userUnits = await db.getUnitsByLecturer(userId);
        setUnits(userUnits);
      }
    };
    loadUnits();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-card flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      {/* Header */}
      <header className="bg-gradient-header shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-header-foreground">UniCollab</h1>
                <p className="text-xs text-header-foreground/80">KCAU University</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationBell userId={userId} />
              <div className="flex items-center space-x-2 text-header-foreground">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs opacity-80 capitalize">{userRole}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-header-foreground hover:bg-white/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-card/80 backdrop-blur-sm border-primary/10 rounded-lg p-6 shadow-card">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Welcome back, {userName}! 👋
                </h2>
                <p className="text-muted-foreground">
                  {userRole === 'lecturer' 
                    ? 'Manage your units and track student progress' 
                    : `Continue your studies in ${course?.name || 'your course'}`
                  }
                </p>
                {userRole === 'student' && course && (
                  <div className="flex items-center mt-2 text-sm text-muted-foreground">
                    <GraduationCap className="w-4 h-4 mr-1" />
                    {course.name} ({course.code})
                  </div>
                )}
              </div>
              {userRole === 'lecturer' && (
                <CreateUnitDialog lecturerId={userId} onUnitCreated={handleUnitCreated} />
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Units Section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  {userRole === 'lecturer' ? 'My Units' : 'Enrolled Units'}
                </h3>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {units.length} {units.length === 1 ? 'Unit' : 'Units'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {units.map((unit) => (
                  <Link key={unit.id} to={`/unit/${unit.id}`}>
                    <Card className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg text-foreground">{unit.code}</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              {unit.name}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {unit.semester}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {unit.description}
                        </p>
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Users className="w-4 h-4 mr-1" />
                            {unit.enrolledStudents.length} students
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Target className="w-4 h-4 mr-1" />
                            {unit.assignments.length} assignments
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                
                {units.length === 0 && (
                  <div className="md:col-span-2">
                    <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                      <CardContent className="p-8 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {userRole === 'lecturer' 
                            ? 'No units created yet. Create your first unit to get started!' 
                            : 'No units enrolled yet. Contact your lecturers to get enrolled in units.'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>

            {/* Groups Section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  {userRole === 'lecturer' ? 'Unit Groups' : 'My Groups'}
                </h3>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                  {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {groups.map((group) => (
                  <Link key={group.id} to={`/group/${group.id}`}>
                    <Card className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg text-foreground">{group.name}</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              {group.description}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm mb-3">
                          <div className="flex items-center text-muted-foreground">
                            <Users className="w-4 h-4 mr-1" />
                            {group.members.length}/{group.maxMembers} members
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(group.lastActivity).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {group.members.slice(0, 3).map((member, index) => (
                              <div
                                key={member.userId}
                                className="w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground border-2 border-card"
                                title={`Member ${index + 1}`}
                              >
                                {index + 1}
                              </div>
                            ))}
                            {group.members.length > 3 && (
                              <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium border-2 border-card">
                                +{group.members.length - 3}
                              </div>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Open
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                
                {groups.length === 0 && (
                  <div className="md:col-span-2">
                    <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                      <CardContent className="p-8 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {userRole === 'lecturer' 
                            ? 'No groups created in your units yet.' 
                            : 'No groups joined yet. Join or create a group to start collaborating!'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userRole === 'lecturer' ? (
                  <>
                    <CreateUnitDialog lecturerId={userId} onUnitCreated={handleUnitCreated} />
                    <Button variant="outline" className="w-full justify-start" onClick={handleViewAllAssignments}>
                      <FileText className="w-4 h-4 mr-2" />
                      View All Assignments
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleManageStudents}>
                      <Users className="w-4 h-4 mr-2" />
                      Manage Students
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="accent" className="w-full justify-start" onClick={handleJoinNewUnit}>
                      <Plus className="w-4 h-4 mr-2" />
                      Join New Unit
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleCreateGroup}>
                      <Users className="w-4 h-4 mr-2" />
                      Create Group
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleViewAssignments}>
                      <FileText className="w-4 h-4 mr-2" />
                      View Assignments
                    </Button>
                  </>
                )}
                <VideoCall 
                  groupId="general" 
                  participants={[
                    { id: userId, name: userName, isOnline: true }
                  ]} 
                />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-foreground">Welcome to UniCollab!</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-foreground">Account created successfully</p>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Summary */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium text-foreground capitalize">{userRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-foreground text-xs">{userEmail}</span>
                  </div>
                  {course && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Course</span>
                      <span className="font-medium text-foreground text-xs">{course.code}</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" className="w-full mt-4">
                <Button variant="outline" className="w-full mt-4" onClick={handleEditProfile}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;