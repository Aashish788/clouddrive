import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserPlus, Users, Mail, Link, Copy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Define the share item type
type ShareItem = {
  id: number;
  name: string;
  type: "file" | "folder";
  groupId: number;
};

// Define a sharing permission type
type SharePermission = "View" | "Edit";

// Define a share settings type
type ShareSettings = {
  isPublic: boolean;
  publicLink: string | null;
  users: {
    userId: number;
    permission: SharePermission;
    name: string;
    email: string;
  }[];
};

export function FileShareModal() {
  const { activeModal, modalData, closeModal } = useModal();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isOpen = activeModal === 'fileShare';
  const item = modalData?.file || modalData?.folder;
  const itemType = modalData?.isFolder ? "folder" : "file";
  
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedPermission, setSelectedPermission] = useState<SharePermission>("View");
  const [isPublic, setIsPublic] = useState(false);
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    isPublic: false,
    publicLink: null,
    users: []
  });
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filtered users based on search term
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Load share settings and available users
  useEffect(() => {
    if (isOpen && item) {
      // Load current share settings for this item
      const loadShares = async () => {
        try {
          setIsLoading(true);
          
          // API call to get share settings
          const res = await apiRequest("GET", `/${itemType}s/${item.id}/shares`);
          const data = await res.json();
          setShareSettings(data);
          
          // Get available users to share with
          const usersRes = await apiRequest("GET", "/api/users");
          const usersData = await usersRes.json();
          // Filter out current user and already shared users
          const availableUsers = usersData.filter((u: any) => 
            u.id !== user?.id && 
            !data.users.some((su: any) => su.userId === u.id)
          );
          setUsers(availableUsers);
          
          setIsLoading(false);
        } catch (error) {
          console.error("Error loading share data:", error);
          setIsLoading(false);
          
          // Set defaults for now
          setShareSettings({
            isPublic: false,
            publicLink: null,
            users: []
          });
        }
      };
      
      loadShares();
    }
  }, [isOpen, item, itemType, user?.id]);
  
  // Handle adding a new share
  const handleAddShare = async () => {
    if (!selectedUser) return;
    
    try {
      const userId = parseInt(selectedUser);
      const selectedUserData = users.find(u => u.id === userId);
      
      if (!selectedUserData) return;
      
      // API call to add share
      await apiRequest("POST", `/${itemType}s/${item.id}/shares`, {
        userId,
        permission: selectedPermission
      });
      
      // Update local state
      setShareSettings(prev => ({
        ...prev,
        users: [
          ...prev.users,
          {
            userId,
            permission: selectedPermission,
            name: selectedUserData.name,
            email: selectedUserData.email
          }
        ]
      }));
      
      // Remove the user from available users
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelectedUser("");
      
      toast({
        title: "Share added",
        description: `${selectedUserData.name} can now ${selectedPermission.toLowerCase()} this ${itemType}`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding share",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  };
  
  // Handle removing a share
  const handleRemoveShare = async (userId: number) => {
    try {
      // API call to remove share
      await apiRequest("DELETE", `/${itemType}s/${item.id}/shares/${userId}`);
      
      // Update local state
      const removedUser = shareSettings.users.find(u => u.userId === userId);
      setShareSettings(prev => ({
        ...prev,
        users: prev.users.filter(u => u.userId !== userId)
      }));
      
      // Add the user back to available users if they exist
      if (removedUser) {
        setUsers(prev => [
          ...prev,
          { 
            id: removedUser.userId, 
            name: removedUser.name, 
            email: removedUser.email 
          }
        ]);
      }
      
      toast({
        title: "Share removed",
        description: "The user no longer has access to this item",
      });
    } catch (error: any) {
      toast({
        title: "Error removing share",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  };
  
  // Handle changing the permission for a user
  const handleChangePermission = async (userId: number, newPermission: SharePermission) => {
    try {
      // API call to update permission
      await apiRequest("PATCH", `/${itemType}s/${item.id}/shares/${userId}`, {
        permission: newPermission
      });
      
      // Update local state
      setShareSettings(prev => ({
        ...prev,
        users: prev.users.map(u => 
          u.userId === userId 
            ? { ...u, permission: newPermission }
            : u
        )
      }));
      
      toast({
        title: "Permission updated",
        description: `The user now has ${newPermission.toLowerCase()} permission`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating permission",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  };
  
  // Handle toggling public access
  const handleTogglePublic = async () => {
    try {
      const newPublicState = !isPublic;
      setIsPublic(newPublicState);
      
      // API call to update public access
      const res = await apiRequest("PATCH", `/${itemType}s/${item.id}/public`, {
        isPublic: newPublicState
      });
      
      const data = await res.json();
      
      setShareSettings(prev => ({
        ...prev,
        isPublic: newPublicState,
        publicLink: data.publicLink
      }));
      
      toast({
        title: newPublicState ? "Public sharing enabled" : "Public sharing disabled",
        description: newPublicState 
          ? "Anyone with the link can now access this item" 
          : "This item is no longer publicly accessible",
      });
    } catch (error: any) {
      // Revert the toggle if there was an error
      setIsPublic(!isPublic);
      
      toast({
        title: "Error updating public access",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  };
  
  // Handle copying the public link
  const handleCopyLink = () => {
    if (shareSettings.publicLink) {
      navigator.clipboard.writeText(shareSettings.publicLink);
      toast({
        title: "Link copied",
        description: "The public link has been copied to your clipboard",
      });
    }
  };
  
  if (!isOpen || !item) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {itemType === "folder" ? "Folder" : "File"}</DialogTitle>
        </DialogHeader>
        
        <div className="p-2 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Public sharing section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Public access</h3>
                    <p className="text-xs text-gray-500">
                      Anyone with the link can view this {itemType}
                    </p>
                  </div>
                  <Switch
                    checked={shareSettings.isPublic}
                    onCheckedChange={handleTogglePublic}
                  />
                </div>
                
                {shareSettings.isPublic && shareSettings.publicLink && (
                  <div className="flex items-center mt-2 space-x-2">
                    <Input
                      readOnly
                      value={shareSettings.publicLink}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* User sharing section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Share with users</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a user to share with" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUsers.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedPermission} onValueChange={(val: SharePermission) => setSelectedPermission(val)}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Permission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="View">View</SelectItem>
                        <SelectItem value="Edit">Edit</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button size="sm" onClick={handleAddShare} disabled={!selectedUser}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Current shares list */}
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {shareSettings.users.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      This {itemType} is not shared with any users
                    </div>
                  ) : (
                    shareSettings.users.map(shareUser => (
                      <div key={shareUser.userId} className="p-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{shareUser.name}</p>
                            <p className="text-xs text-gray-500">{shareUser.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select 
                            value={shareUser.permission} 
                            onValueChange={(val: SharePermission) => handleChangePermission(shareUser.userId, val)}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue placeholder="Permission" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="View">View</SelectItem>
                              <SelectItem value="Edit">Edit</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveShare(shareUser.userId)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={closeModal}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}