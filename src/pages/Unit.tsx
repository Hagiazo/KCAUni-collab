import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
  const [userRole] = useState(localStorage.getItem("userRole") || "student");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    maxMembers: "4"
  });

  // Mock unit data - replace with real data from API
  const mockUnit = {
    id: unitId,
    code: "CS301",
    name: "Database Systems",
    course: "Computer Science",
    description: "Introduction to database design, SQL, and database management systems.",
    lecturer: "Dr. Jane Smith",
    enrolled: 45,
    semester: "Fall 2024",
    credits: 3,
    assignments: [
      {
        id: 1,
        title: "ER Diagram Design",
        description: "Create an ER diagram for the university system",
        dueDate: "2024-02-15",
        type: "Group",
        status: "Active"
      },
      {
        id: 2,
        title: "SQL Query Assignment",
        description: "Write complex SQL queries for data analysis",
        dueDate: "2024-02-22",
        type: "Individual",
        status: "Upcoming"
      }
    ]
  };

  const mockGroups = [
    {
      id: 1,
      name: "Team Alpha",
      description: "Focused on database optimization and performance",
      members: [
        { id: 1, name: "John Doe", role: "Leader" },
        { id: 2, name: "Jane Smith", role: "Member" },
        { id: 3, name: "Mike Johnson", role: "Member" }
      ],
      maxMembers: 4,
      currentAssignment: "ER Diagram Design",
      lastActivity: "2 hours ago",
      progress: 75
    },
    {
      id: 2,
      name: "Database Warriors",
      description: "Passionate about data modeling and SQL",
      members: [
        { id: 4, name: "Sarah Wilson", role: "Leader" },
        { id: 5, name: "Tom Brown", role: "Member" }
      ],
      maxMembers: 4,
      currentAssignment: "ER Diagram Design",
      lastActivity: "1 day ago",
      progress: 60
    },
    {
      id: 3,
      name: "Query Masters",
      description: "Advanced SQL and database administration",
      members: [
        { id: 6, name: "Alice Cooper", role: "Leader" },
        { id: 7, name: "Bob Davis", role: "Member" },
        { id: 8, name: "Carol White", role: "Member" },
        { id: 9, name: "Dave Miller", role: "Member" }
      ],
      maxMembers: 4,
      currentAssignment: "ER Diagram Design",
      lastActivity: "3 hours ago",
      progress: 90
    }
  ];

  const handleCreateGroup = () => {
    // Mock group creation
    toast({
      title: "Group Created!",
      description: `Successfully created "${newGroup.name}". You can now start collaborating.`
    });
    setIsCreateGroupOpen(false);
    setNewGroup({ name: "", description: "", maxMembers: "4" });
  };

  const handleJoinGroup = (groupId: number, groupName: string) => {
    toast({
      title: "Joined Group!",
      description: `You've successfully joined "${groupName}". Welcome to the team!`
    });
  };

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
                  {mockUnit.code} - {mockUnit.name}
                </h1>
                <p className="text-muted-foreground text-lg mb-4">{mockUnit.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Lecturer: {mockUnit.lecturer}
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-1" />
                    Course: {mockUnit.course}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {mockUnit.enrolled} students enrolled
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {mockUnit.semester}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {mockUnit.credits} Credits
              </Badge>
            </div>
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
              {mockGroups.map((group) => (
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
                            <div key={member.id} className="flex items-center bg-secondary/20 rounded-full px-3 py-1">
                              <User className="w-3 h-3 mr-1 text-muted-foreground" />
                              <span className="text-xs text-foreground">
                                {member.name} {member.role === 'Leader' && '👑'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Current Assignment & Progress */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current Assignment</p>
                          <p className="font-medium text-foreground">{group.currentAssignment}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Progress</p>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-secondary/20 rounded-full h-2">
                              <div 
                                className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${group.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground">{group.progress}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          Last activity: {group.lastActivity}
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
                              onClick={() => handleJoinGroup(group.id, group.name)}
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
                  {mockUnit.assignments.map((assignment) => (
                    <div key={assignment.id} className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-foreground text-sm">{assignment.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            assignment.status === 'Active' 
                              ? 'bg-primary/10 text-primary border-primary/20' 
                              : 'bg-muted/10 text-muted-foreground border-muted/20'
                          }`}
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{assignment.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Due: {assignment.dueDate}</span>
                        <span className={`font-medium ${assignment.type === 'Group' ? 'text-primary' : 'text-accent'}`}>
                          {assignment.type}
                        </span>
                      </div>
                    </div>
                  ))}
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
                    <span className="font-medium text-foreground">{mockGroups.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Assignments</span>
                    <span className="font-medium text-foreground">
                      {mockUnit.assignments.filter(a => a.status === 'Active').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enrolled Students</span>
                    <span className="font-medium text-foreground">{mockUnit.enrolled}</span>
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