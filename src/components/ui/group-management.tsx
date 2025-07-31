import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Crown, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Trash2,
  AlertTriangle,
  UserMinus,
  MoreVertical
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { db, type Group, type User } from "@/lib/database";

interface GroupManagementProps {
  group: Group;
  currentUserId: string;
  currentUserRole: string;
  onGroupUpdated: () => void;
  onGroupDeleted: () => void;
}

export const GroupManagement = ({ 
  group, 
  currentUserId, 
  currentUserRole,
  onGroupUpdated, 
  onGroupDeleted 
}: GroupManagementProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isGroupLeader = group.members.find(m => m.userId === currentUserId && m.role === 'leader');
  const isGroupCreator = group.createdById === currentUserId;
  const canDeleteGroup = isGroupLeader || isGroupCreator;

  const handleDeleteGroup = async () => {
    if (!canDeleteGroup) {
      toast({
        title: "Unauthorized",
        description: "Only group leaders can delete groups.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await db.deleteGroup(group.id, currentUserId);
      
      if (result.success) {
        toast({
          title: "Group Deleted",
          description: `"${group.name}" has been permanently deleted.`
        });
        setIsDeleteDialogOpen(false);
        onGroupDeleted();
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
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isGroupLeader) {
      toast({
        title: "Cannot Leave",
        description: "Group leaders cannot leave. Transfer leadership or delete the group.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await db.leaveGroup(group.id, currentUserId);
      
      if (result.success) {
        toast({
          title: "Left Group",
          description: `You have left "${group.name}".`
        });
        setIsLeaveDialogOpen(false);
        onGroupUpdated();
      } else {
        toast({
          title: "Cannot Leave Group",
          description: result.error || "Failed to leave group",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave group. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Group Actions Dropdown */}
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
          
          {!isGroupLeader && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsLeaveDialogOpen(true)}
                className="text-orange-600 focus:text-orange-600"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Leave Group
              </DropdownMenuItem>
            </>
          )}
          
          {canDeleteGroup && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Group
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Group Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center">
              <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
              Delete Group
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to permanently delete "{group.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium mb-2">This will permanently:</p>
              <ul className="text-sm text-destructive space-y-1">
                <li>• Delete all group documents and files</li>
                <li>• Remove all chat history</li>
                <li>• Delete all tasks and assignments</li>
                <li>• Remove all {group.members.length} members from the group</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteGroup}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/10">
          <DialogHeader>
            <DialogTitle className="text-foreground">Leave Group</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to leave "{group.name}"? You'll lose access to all group content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <p className="text-sm text-orange-600 font-medium mb-2">You will lose access to:</p>
              <ul className="text-sm text-orange-600 space-y-1">
                <li>• Group documents and collaborative editing</li>
                <li>• Chat history and ongoing conversations</li>
                <li>• Shared files and resources</li>
                <li>• Task assignments and progress</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsLeaveDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleLeaveGroup}
                disabled={isLoading}
              >
                {isLoading ? "Leaving..." : "Leave Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};