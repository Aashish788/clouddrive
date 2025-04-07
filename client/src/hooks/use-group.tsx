
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

// Define the Group type
export type Group = {
  id: number;
  name: string;
  createdById: number | null;
  createdAt: string;
};

// Define the GroupMembership type
export type GroupMembership = {
  id: number;
  userId: number;
  groupId: number;
  permission: "View" | "Edit";
  addedById: number | null;
  addedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  group: Group;
};

// Type for the API response
export type GroupDetails = {
  group: Group;
  members: GroupMembership[];
  userPermission: "View" | "Edit";
};

// Regular user groups hook
export function useGroups() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";

  const groupsQuery = useQuery<(GroupMembership & { group: Group })[]>({
    queryKey: ["/api/groups"],
    enabled: !!user,
    select: (data) => {
      if (!data || !user) return [];
      // Return all memberships as they come from the server
      // Server already filters based on user access
      return data;
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/groups", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Group created",
        description: "The group has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    error: groupsQuery.error,
    createGroup: createGroupMutation.mutate,
  };
}

// Admin groups hook - completely separate from regular groups
export function useAdminGroups() {
  const groupsQuery = useQuery<Group[]>({
    queryKey: ["/api/admin/groups"],
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    error: groupsQuery.error,
  };
}

export function useGroup(groupId: number) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";

  const groupQuery = useQuery<GroupDetails>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: Boolean(groupId),
    retry: false,
    meta: { suppressErrorToast: isAdmin }
  });

  useEffect(() => {
    if (groupQuery.error && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have access to this group",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [groupQuery.error, toast, setLocation, isAdmin]);

  const addUserMutation = useMutation({
    mutationFn: async ({ userId, permission }: { userId: number, permission: "View" | "Edit" }) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/members`, { userId, permission });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      toast({
        title: "User added",
        description: "The user has been added to the group",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, permission }: { userId: number, permission: "View" | "Edit" }) => {
      const res = await apiRequest("PATCH", `/api/groups/${groupId}/members/${userId}`, { permission });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      toast({
        title: "Permission updated",
        description: "The user's permission has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update permission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      toast({
        title: "User removed",
        description: "The user has been removed from the group",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("PATCH", `/api/groups/${groupId}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Group updated",
        description: "The group has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Group deleted",
        description: "The group has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    groupDetails: groupQuery.data,
    isLoading: groupQuery.isLoading,
    error: groupQuery.error,
    addUser: addUserMutation.mutate,
    updatePermission: updatePermissionMutation.mutate,
    removeUser: removeUserMutation.mutate,
    updateGroup: updateGroupMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,
  };
}
