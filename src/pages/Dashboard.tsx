import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { CreateUnitDialog } from "@/components/ui/create-unit-dialog";
import { NotificationBell } from "@/components/ui/notification-bell";
import { 
  BookOpen, 
  Users, 
  Plus, 
  LogOut, 
  User, 
  Calendar,
  Search,
  MoreVertical,
  GraduationCap,
  ChevronRight,
  Clock,
  Target,
  TrendingUp
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { db, type Unit, type Group, type User as DbUser } from "@/lib/database";
import { sessionManager } from "@/lib/session-manager";

import { GroupManagement } from "@/components/ui/group-management";
const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // User state from session manager
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userCourse, setUserCourse] = useState("");
  
  // Data state
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Unit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize session and check authentication
  useEffect(() => {
    const session = sessionManager.getCurrentSession();
    console.log('Dashboard session check:', session);
    
    if (!session || !sessionManager.isAuthenticated()) {
      console.log('No valid session found, redirecting to login');
      navigate("/login");
      return;
    }
    
    // Set user data from session
    setUserRole(session.userRole);
    setUserName(session.userName);
    setUserId(session.userId);
    setUserEmail(session.userEmail);
    setUserCourse(session.userCourse || "");
    
    // Load dashboard data immediately
    loadDashboardData(session.userId, session.userRole);
    
    // Listen for session changes from other tabs
    const handleSessionChange = (data: any) => {
      console.log('Session changed from another tab:', data);
      if (data.userId !== session.userId) {
        navigate("/login");
      }
    };
    
    const handleRemoteLogout = () => {
      console.log('Logged out from another tab');
      navigate("/login");
    };
    
    sessionManager.on('session_changed', handleSessionChange);
    sessionManager.on('remote_logout', handleRemoteLogout);
    sessionManager.on('session_cleared', handleRemoteLogout);
    
    return () => {
      sessionManager.off('session_changed', handleSessionChange);
      sessionManager.off('remote_logout', handleRemoteLogout);
      sessionManager.off('session_cleared', handleRemoteLogout);
    };
  }, [navigate]);

  const loadDashboardData = async (currentUserId?: string, currentUserRole?: string) => {
    const effectiveUserId = currentUserId || userId;
    const effectiveUserRole = currentUserRole || userRole;
    
    console.log('Loading dashboard data for role:', effectiveUserRole, 'userId:', effectiveUserId);
    
    // Add additional safety checks
    if (!effectiveUserId || !effectiveUserRole) {
      console.log('Missing userId or userRole, cannot load data');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      if (effectiveUserRole === 'lecturer') {
        // Load units created by this lecturer
        const lecturerUnits = await db.getUnitsByLecturer(effectiveUserId);
        console.log('Lecturer units loaded:', lecturerUnits);
        setUnits(lecturerUnits);
        
        // Load groups from lecturer's units
        const lecturerGroups = await db.getGroupsByLecturer(effectiveUserId);
        console.log('Lecturer groups loaded:', lecturerGroups);
        setGroups(lecturerGroups);
        
        // Load pending enrollment requests for lecturer
        const requests = await db.getPendingEnrollmentRequests(effectiveUserId);
        console.log('Pending requests loaded:', requests);
        setPendingRequests(requests);
      } else if (effectiveUserRole === 'student') {
        // Load units student is enrolled in
        const studentUnits = await db.getUnitsByStudent(effectiveUserId);
        console.log('Student units loaded:', studentUnits);
        setUnits(studentUnits);
        
        // Load groups student is member of
        const studentGroups = await db.getGroupsByStudent(effectiveUserId);
        console.log('Student groups loaded:', studentGroups);
        setGroups(studentGroups);
        
        // Load available units for enrollment
        const availableUnits = await db.getAvailableUnitsForStudent(effectiveUserId);
        console.log('Available units loaded:', availableUnits);
        setAvailableUnits(availableUnits);
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

  const handleSignOut = () => {
    // Clear session using session manager
    sessionManager.clearSession();
    
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out."
    });
    
    navigate("/");
  };

  const handleUnitCreated = () => {
    loadDashboardData(userId, userRole); // Refresh data when unit is created
  };

  const handleUnitSearch = async () => {
    if (!unitSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await db.searchUnitsByCode(unitSearchQuery, userId);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: "No units found",
          description: "No units found with that code. Make sure you're searching for units in your course.",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search for units. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestEnrollment = async (unitId: string, unitName: string) => {
    try {
      const result = await db.requestEnrollment(unitId, userId, `Request to join ${unitName}`);
      if (result.success) {
        toast({
          title: "Enrollment requested",
          description: `Your request to join "${unitName}" has been sent to the lecturer.`
        });
        setSearchResults(prev => prev.filter(u => u.id !== unitId));
      } else {
        toast({
          title: "Request failed",
          description: result.error || "Failed to request enrollment",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request enrollment",
        variant: "destructive"
      });
    }
  };

  const handleProcessEnrollmentRequest = async (requestId: string, approve: boolean, studentName: string, unitName: string) => {
    try {
      const result = await db.processEnrollmentRequest(requestId, userId, approve);
      if (result.success) {
        toast({
          title: approve ? "Request approved" : "Request rejected",
          description: `${studentName}'s request to join "${unitName}" has been ${approve ? 'approved' : 'rejected'}.`
        });
        loadDashboardData(); // Refresh data
        loadDashboardData(userId, userRole); // Refresh data
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process request",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process enrollment request",
        variant: "destructive"
      });
    }
  };

  // Filter data based on search
  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <header className="bg-gradient-header shadow-elegant border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-header-foreground">KCAU UniCollab</h1>
                <p className="text-xs text-header-foreground/80">University Collaboration Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationBell userId={userId} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card/95 backdrop-blur-sm border-primary/10" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-foreground">{userName}</p>
                      <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
                      <Badge variant="outline" className="w-fit text-xs">
                        {userRole === 'lecturer' ? 'Lecturer' : 'Student'}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userName}!
          </h2>
          <p className="text-muted-foreground text-lg">
            {userRole === 'lecturer' 
              ? 'Manage your units and monitor student collaboration.'
              : 'Access your enrolled units and collaborate with your groups.'
            }
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {userRole === 'lecturer' ? 'Units Created' : 'Units Enrolled'}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{units.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {userRole === 'lecturer' ? 'Active Groups' : 'Groups Joined'}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{groups.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold text-foreground">{groups.filter(g => g.currentAssignment).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search units and groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card/50 border-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            {userRole === 'lecturer' && (
              <CreateUnitDialog 
                lecturerId={userId}
                onUnitCreated={handleUnitCreated}
              />
            )}
          </div>
        </div>

        {/* Units Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-foreground">
              {userRole === 'lecturer' ? 'Your Units' : 'Enrolled Units'}
            </h3>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {filteredUnits.length} units
            </Badge>
          </div>
          
          {filteredUnits.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h4 className="text-xl font-semibold text-foreground mb-2">
                  {userRole === 'lecturer' ? 'No units created yet' : 'No units enrolled'}
                </h4>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  {userRole === 'lecturer' 
                    ? 'Create your first unit to start managing student groups and assignments.'
                    : 'Contact your lecturers to get enrolled in units, or check for available units.'
                  }
                </p>
                {userRole === 'lecturer' && (
                  <CreateUnitDialog 
                    lecturerId={userId}
                    onUnitCreated={handleUnitCreated}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUnits.map((unit) => (
                <Card 
                  key={unit.id} 
                  className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  onClick={() => navigate(`/unit/${unit.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">
                          {unit.name}
                        </CardTitle>
                        <CardDescription className="font-mono text-sm text-primary">
                          {unit.code}
                        </CardDescription>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {unit.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {unit.semester} {unit.year}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {unit.enrolledStudents?.length || 0} students
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Groups Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-foreground">
              {userRole === 'lecturer' ? 'Student Groups' : 'Your Groups'}
            </h3>
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
              {filteredGroups.length} groups
            </Badge>
          </div>
          
          {filteredGroups.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h4 className="text-xl font-semibold text-foreground mb-2">
                  {userRole === 'lecturer' ? 'No groups created yet' : 'No groups joined'}
                </h4>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  {userRole === 'lecturer' 
                    ? 'Students will create groups within your units for collaborative work.'
                    : 'Join a group or create one to start collaborating with other students.'
                  }
                </p>
                {userRole === 'student' && (
                  <p className="text-sm text-muted-foreground">
                    Navigate to a unit to create or join groups
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <Card 
                  key={group.id} 
                  className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">
                          {group.name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {group.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                          {group.members?.length || 0}/{group.maxMembers} members
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Current Assignment */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current Assignment:</span>
                        <span className="font-medium text-foreground">
                          {group.currentAssignment || 'No assignment'}
                        </span>
                      </div>
                      
                      {/* Last Activity */}
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Last activity: {new Date(group.lastActivity).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions for Students */}
        {userRole === 'student' && units.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Search for Units</h4>
                      <p className="text-sm text-muted-foreground mb-4">Find units by code and request enrollment</p>
                      
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Enter unit code (e.g., CS301)"
                          value={unitSearchQuery}
                          onChange={(e) => setUnitSearchQuery(e.target.value)}
                          className="bg-card/50 border-primary/20 focus:border-primary"
                          onKeyPress={(e) => e.key === 'Enter' && handleUnitSearch()}
                        />
                        <Button onClick={handleUnitSearch} disabled={isSearching} size="sm">
                          {isSearching ? 'Searching...' : 'Search'}
                        </Button>
                      </div>
                      
                      {searchResults.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-foreground">Search Results:</p>
                          {searchResults.map((unit) => (
                            <div key={unit.id} className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-medium text-foreground">{unit.code} - {unit.name}</h5>
                                  <p className="text-xs text-muted-foreground">{unit.description}</p>
                                  <p className="text-xs text-muted-foreground">{unit.semester} {unit.year}</p>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleRequestEnrollment(unit.id, unit.name)}
                                >
                                  Request Enrollment
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 backdrop-blur-sm border-primary/10 hover:shadow-card transition-all duration-300 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Join Study Groups</h4>
                      <p className="text-sm text-muted-foreground">Connect with classmates for collaboration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Enrollment Requests for Lecturers */}
        {userRole === 'lecturer' && pendingRequests.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">Pending Enrollment Requests</h3>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="bg-card/80 backdrop-blur-sm border-primary/10">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground">{request.studentName}</h4>
                        <p className="text-sm text-muted-foreground">wants to join {request.unitName}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested on {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                        {request.message && (
                          <p className="text-xs text-muted-foreground mt-1">"{request.message}"</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleProcessEnrollmentRequest(request.id, false, request.studentName, request.unitName)}
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleProcessEnrollmentRequest(request.id, true, request.studentName, request.unitName)}
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
        )}
      </main>
    </div>
  );
};

export default Dashboard;