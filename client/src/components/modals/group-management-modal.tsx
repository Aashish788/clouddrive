import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal";
import { useGroup, GroupMembership } from "@/hooks/use-group";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Trash, Plus } from "lucide-react";

export function GroupManagementModal() {
  const { activeModal, modalData, closeModal } = useModal();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<"View" | "Edit">("View");
  
  // Check if user is an admin or superadmin
  const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";
  
  const groupId = modalData?.groupId;
  const { 
    groupDetails, 
    updateGroup, 
    addUser, 
    removeUser, 
    updatePermission 
  } = useGroup(groupId);
  
  const isOpen = activeModal === 'groupManagement';
  
  // Get all users for the add member dropdown
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: isOpen && isAdmin,
  });
  
  useEffect(() => {
    if (groupDetails?.group) {
      setGroupName(groupDetails.group.name);
    }
  }, [groupDetails]);
  
  if (!groupId || !groupDetails) return null;
  
  const handleSave = () => {
    if (groupName !== groupDetails.group.name) {
      updateGroup(groupName);
    }
    closeModal();
  };
  
  const handleAddMember = () => {
    if (selectedUserId) {
      addUser({
        userId: selectedUserId,
        permission: selectedPermission
      });
      setShowAddMember(false);
      setSelectedUserId(null);
      setSelectedPermission("View");
    }
  };
  
  const handleRemoveMember = (userId: number) => {
    removeUser(userId);
  };
  
  const handlePermissionChange = (userId: number, permission: "View" | "Edit") => {
    updatePermission({ userId, permission });
  };
  
  // Filter out users that are already in the group
  const availableUsers = users ? users.filter(
    (user: any) => !groupDetails.members.some((member) => member.userId === user.id)
  ) : [];
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Group Management</DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          <div className="mb-6">
            <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full"
              disabled={!isAdmin}
            />
          </div>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Group Members</h3>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-600"
                  onClick={() => setShowAddMember(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Member
                </Button>
              )}
            </div>
            
            {showAddMember && (
              <div className="mb-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex items-center space-x-2">
                  <Select onValueChange={(value) => setSelectedUserId(Number(value))}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers?.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    defaultValue="View"
                    onValueChange={(value) => setSelectedPermission(value as "View" | "Edit")}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Permission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="View">View Only</SelectItem>
                      <SelectItem value="Edit">View & Edit</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={handleAddMember}
                      disabled={!selectedUserId}
                    >
                      Add
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowAddMember(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="border border-gray-300 rounded-md overflow-hidden">
              {groupDetails.members.length === 0 ? (
                <div className="bg-white p-3 text-center text-gray-500">
                  No members in this group yet.
                </div>
              ) : (
                groupDetails.members.map((member) => (
                  <div 
                    key={member.userId}
                    className="bg-white p-3 border-b border-gray-200 last:border-b-0 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-gray-700">
                          {member.user?.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.user?.name}</p>
                        <p className="text-xs text-gray-500">{member.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {isAdmin ? (
                        <>
                          <Select 
                            defaultValue={member.permission}
                            onValueChange={(value) => handlePermissionChange(member.userId, value as "View" | "Edit")}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="View">View Only</SelectItem>
                              <SelectItem value="Edit">View & Edit</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            <Trash className="h-4 w-4 text-gray-500 hover:text-red-500" />
                          </Button>
                        </>
                      ) : (
                        <div className="px-3 py-2 text-sm bg-gray-100 rounded">
                          {member.permission === "Edit" ? "View & Edit" : "View Only"}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="bg-gray-50 px-4 py-3 sm:px-6 rounded-b-lg">
          <Button variant="outline" onClick={closeModal} className="mr-2">
            {isAdmin ? "Cancel" : "Close"}
          </Button>
          {isAdmin && <Button onClick={handleSave}>Save Changes</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
