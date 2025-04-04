import { useState } from "react";
import { AppLayout } from "@/components/layout/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
  role: "User" | "Admin" | "SuperAdmin";
  createdAt: string;
};

export default function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });
  
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}`,
      });
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleRoleChange = () => {
    if (!selectedUser || !newRole) return;
    
    updateRoleMutation.mutate({
      userId: selectedUser.id,
      role: newRole
    });
  };
  
  const openChangeRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
  };
  
  // Check if the current user is a SuperAdmin
  const isSuperAdmin = user?.role === "SuperAdmin";
  
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        </div>
        
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
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'SuperAdmin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : user.role === 'Admin' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isSuperAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openChangeRoleDialog(user)}
                          disabled={user.id === Number(user?.id)}
                        >
                          Change Role
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Change Role Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Current role: {selectedUser?.role}</h3>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="User">User</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
              <Button 
                onClick={handleRoleChange} 
                disabled={newRole === selectedUser?.role || updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
