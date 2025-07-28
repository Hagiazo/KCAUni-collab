import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Users, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, type User } from "@/lib/database";

interface CreateGroupDialogProps {
  unitId: string;
  currentUserId: string;
  onGroupCreated: () => void;
}

export const CreateGroupDialog = ({ unitId, currentUserId, onGroupCreated }: CreateGroupDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState("4");
  const [invitedMembers, setInvitedMembers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Search by email or admission number (for students)
      let user = await db.getUserByEmail(searchQuery.trim());
      
      // If not found by email, try searching by admission number pattern
      if (!user && /^\d{7}$/.test(searchQuery.trim())) {
        // Convert admission number to email format
        const admissionNumber = searchQuery.trim();
        const year = admissionNumber.substring(0, 2);
        const studentEmail = `${year}${admissionNumber.substring(2)}@students.kcau.ac.ke`;
        user = await db.getUserByEmail(studentEmail);
      }
      
      if (!user) {
        setSearchResults([]);
        return;
      }

      if (user.role !== 'student') {
        toast({
          title: "Invalid user",
          description: "Only students can be invited to groups.",
          variant: "destructive"
        });
        setSearchResults([]);
        return;
      }

      if (user.id === currentUserId) {
        toast({
          title: "Cannot invite yourself",
          description: "You are automatically added as the group leader.",
          variant: "destructive"
        });
        setSearchResults([]);
        return;
      }

      if (invitedMembers.find(m => m.id === user.id)) {
        toast({
          title: "Already invited",
          description: "This user is already invited to the group.",
          variant: "destructive"
        });
        setSearchResults([]);
        return;
      }

      setSearchResults([user]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to invite member. Please try again.",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteUser = (user: User) => {
    setInvitedMembers(prev => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
    toast({
      title: "Member invited",
      description: `${user.name} has been invited to the group.`
    });
  };

  const removeMember = (userId: string) => {
    setInvitedMembers(prev => prev.filter(m => m.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const members = [
        {
          userId: currentUserId,
          role: 'leader' as const,
          joinedAt: new Date(),
          contributions: 0
        },
        ...invitedMembers.map(user => ({
          userId: user.id,
          role: 'member' as const,
          joinedAt: new Date(),
          contributions: 0
        }))
      ];

      await db.createGroup({
        name: groupName,
        description: description || `Group for collaborative work in this unit`,
        unitId,
        leaderId: currentUserId,
        members,
        maxMembers: parseInt(maxMembers),
        workspace: {
          documents: [],
          chatMessages: [],
          tasks: [],
          files: [],
          submissions: [],
          meetingHistory: []
        }
      });

      // Create notifications for invited members
      for (const member of invitedMembers) {
        await db.createNotification({
          userId: member.id,
          type: 'group',
          title: 'Group Invitation',
          message: `You've been invited to join "${groupName}" group.`,
          read: false,
          priority: 'medium'
        });
      }

      toast({
        title: "Group created successfully!",
        description: `"${groupName}" has been created with ${members.length} members.`
      });

      // Reset form
      setGroupName("");
      setDescription("");
      setMaxMembers("4");
      setInvitedMembers([]);
      setSearchResults([]);
      setIsOpen(false);
      onGroupCreated();
    } catch (error) {
      toast({
        title: "Error creating group",
        description: "Failed to create group. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            Create a collaborative group for your unit assignments.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="groupName" className="text-foreground">Group Name *</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="bg-card/50 border-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your group's focus or goals"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-card/50 border-primary/20 focus:border-primary"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="maxMembers" className="text-foreground">Maximum Members</Label>
            <Select value={maxMembers} onValueChange={setMaxMembers}>
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

          <div>
            <Label className="text-foreground">Invite Members (Email or Admission Number)</Label>
            <div className="flex space-x-2 mt-2">
              <Input
                placeholder="Enter email or admission number (e.g., 2507564)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-card/50 border-primary/20 focus:border-primary"
                onKeyPress={(e) => e.key === 'Enter' && handleSearchAndInvite()}
              />
              <Button onClick={handleInviteMember} size="sm" variant="outline">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You can search by email (e.g., 2507564@students.kcau.ac.ke) or admission number (e.g., 2507564)
            </p>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 p-2 bg-secondary/10 rounded-lg border border-secondary/20">
                <p className="text-xs text-muted-foreground mb-2">Search Results:</p>
                {searchResults.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-2 bg-card/50 rounded">
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleInviteUser(user)}>
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {invitedMembers.length > 0 && (
            <div>
              <Label className="text-foreground">Invited Members</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {invitedMembers.map((member) => (
                  <Badge key={member.id} variant="secondary" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {member.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeMember(member.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <p className="text-xs text-muted-foreground">
              You will be added as the group leader
            </p>
            <Button 
              onClick={handleCreateGroup} 
              variant="hero"
              disabled={isLoading || !groupName.trim()}
            >
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};