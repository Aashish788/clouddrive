import { useState } from "react";
import { AppLayout } from "@/components/layout/layout";
import { useAdminGroups, useGroup } from "@/hooks/use-group";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, ArrowRight, Users, Pencil, Trash } from "lucide-react";

export default function GroupManagementPage() {
  const { groups, isLoading } = useAdminGroups();
  const [_, setLocation] = useLocation();
  const { openModal } = useModal();
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  // Get all users for adding to groups
  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
  });
  
  const handleCreateGroup = () => {
    // Implementation would connect to the API
    console.log("Create group:", newGroupName);
    setNewGroupName("");
    setIsCreatingGroup(false);
  };
  
  const handleViewGroup = (groupId: number) => {
    setLocation(`/group/${groupId}`);
  };
  
  const handleManageGroup = (groupId: number) => {
    openModal('groupManagement', { groupId });
  };
  
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Group Management</h1>
          
          <Button onClick={() => setIsCreatingGroup(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </div>
        
        {isCreatingGroup && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="text-lg font-medium mb-3">Create New Group</h2>
              <div className="flex space-x-2">
                <Input 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="flex-1"
                />
                <Button onClick={handleCreateGroup}>Create</Button>
                <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups?.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.id}</TableCell>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{new Date(group.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewGroup(group.id)}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleManageGroup(group.id)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Members
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {groups?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No groups found. Create a new group to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
