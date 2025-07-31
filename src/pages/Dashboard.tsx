import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Plus, 
  LogOut, 
  User, 
  Calendar,
  Bell,
  Settings,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { CreateUnitDialog } from '../components/ui/create-unit-dialog';
import { CreateGroupDialog } from '../components/ui/create-group-dialog';
import { supabase } from '../supabaseClient';
import { toast } from '../hooks/use-toast';

interface Unit {
  id: string;
  name: string;
  code: string;
  description: string;
  lecturer_id: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  unit_id: string;
  created_by: string;
  created_at: string;
  unit?: Unit;
  member_count?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateUnit, setShowCreateUnit] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);

      // Get user role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const role = profile?.role || 'student';
      setUserRole(role);

      // Load data based on role
      if (role === 'lecturer') {
        await loadLecturerData(user.id);
      } else {
        await loadStudentData(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadLecturerData = async (userId: string) => {
    try {
      // Load units created by lecturer
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('lecturer_id', userId)
        .order('created_at', { ascending: false });

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);

      // Load groups for lecturer's units
      if (unitsData && unitsData.length > 0) {
        const unitIds = unitsData.map(unit => unit.id);
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select(`
            *,
            unit:units(name, code),
            group_members(count)
          `)
          .in('unit_id', unitIds)
          .order('created_at', { ascending: false });

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);
      }
    } catch (error) {
      console.error('Error loading lecturer data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  const loadStudentData = async (userId: string) => {
    try {
      // Load enrolled units
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('unit_enrollments')
        .select(`
          unit_id,
          units(*)
        `)
        .eq('student_id', userId);

      if (enrollmentsError) throw enrollmentsError;
      
      const enrolledUnits = enrollmentsData?.map(enrollment => enrollment.units).filter(Boolean) || [];
      setUnits(enrolledUnits);

      // Load groups the student is a member of
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups(
            *,
            unit:units(name, code)
          )
        `)
        .eq('user_id', userId);

      if (membershipError) throw membershipError;
      
      const studentGroups = membershipData?.map(membership => membership.groups).filter(Boolean) || [];
      setGroups(studentGroups);
    } catch (error) {
      console.error('Error loading student data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUnitClick = (unitId: string) => {
    navigate(`/unit/${unitId}`);
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/group/${groupId}`);
  };

  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">
                StudySync
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt="User" />
                      <AvatarFallback>
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.email}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {userRole === 'lecturer' ? 'Lecturer' : 'Student'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.email?.split('@')[0]}!
          </h2>
          <p className="text-gray-600">
            {userRole === 'lecturer' 
              ? 'Manage your units and monitor student groups.'
              : 'Access your enrolled units and collaborate with your groups.'
            }
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search units and groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {userRole === 'lecturer' && (
              <Button onClick={() => setShowCreateUnit(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Unit
              </Button>
            )}
            {userRole === 'student' && (
              <Button onClick={() => setShowCreateGroup(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            )}
          </div>
        </div>

        {/* Units Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {userRole === 'lecturer' ? 'Your Units' : 'Enrolled Units'}
            </h3>
            <Badge variant="secondary">{filteredUnits.length}</Badge>
          </div>
          
          {filteredUnits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {userRole === 'lecturer' ? 'No units created yet' : 'No units enrolled'}
                </h4>
                <p className="text-gray-600 text-center mb-4">
                  {userRole === 'lecturer' 
                    ? 'Create your first unit to start managing student groups.'
                    : 'Enroll in units to start collaborating with other students.'
                  }
                </p>
                {userRole === 'lecturer' && (
                  <Button onClick={() => setShowCreateUnit(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Unit
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUnits.map((unit) => (
                <Card 
                  key={unit.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleUnitClick(unit.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{unit.name}</CardTitle>
                        <CardDescription className="font-mono text-sm">
                          {unit.code}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleUnitClick(unit.id);
                          }}>
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {unit.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      Created {new Date(unit.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Groups Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {userRole === 'lecturer' ? 'Student Groups' : 'Your Groups'}
            </h3>
            <Badge variant="secondary">{filteredGroups.length}</Badge>
          </div>
          
          {filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {userRole === 'lecturer' ? 'No groups created yet' : 'No groups joined'}
                </h4>
                <p className="text-gray-600 text-center mb-4">
                  {userRole === 'lecturer' 
                    ? 'Students will create groups within your units.'
                    : 'Create or join a group to start collaborating.'
                  }
                </p>
                {userRole === 'student' && (
                  <Button onClick={() => setShowCreateGroup(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <Card 
                  key={group.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleGroupClick(group.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <CardDescription>
                          {group.unit?.name} ({group.unit?.code})
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {group.member_count || 0}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {group.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <CreateUnitDialog 
        open={showCreateUnit} 
        onOpenChange={setShowCreateUnit}
        onUnitCreated={() => {
          setShowCreateUnit(false);
          checkUser(); // Reload data
        }}
      />
      
      <CreateGroupDialog 
        open={showCreateGroup} 
        onOpenChange={setShowCreateGroup}
        availableUnits={units}
        onGroupCreated={() => {
          setShowCreateGroup(false);
          checkUser(); // Reload data
        }}
      />
    </div>
  );
}