import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/layout";
import { FileExplorer } from "@/components/file-explorer";
import { Button } from "@/components/ui/button";
import { useFiles } from "@/hooks/use-files";
import { useGroup } from "@/hooks/use-group";
import { useModal } from "@/hooks/use-modal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Upload, MoreVertical } from "lucide-react";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function GroupPage() {
  const [_, setLocation] = useLocation();
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const { toast } = useToast();
  
  // Handle group route
  const [matchesGroupRoute, groupParams] = useRoute<{ groupId: string }>("/group/:groupId");
  
  // Handle folder within group route
  const [matchesFolderRoute, folderParams] = useRoute<{ groupId: string, folderId: string }>("/group/:groupId/folder/:folderId");
  
  // Determine groupId and folderId based on matched routes
  let groupId = 0;
  let folderId: number | null = null;
  
  if (matchesGroupRoute && groupParams) {
    groupId = parseInt(groupParams.groupId) || 0;
  }
  
  if (matchesFolderRoute && folderParams) {
    groupId = parseInt(folderParams.groupId) || 0;
    folderId = parseInt(folderParams.folderId) || null;
  }
  
  // Only call useGroup if groupId is valid
  const { groupDetails, isLoading: isGroupLoading, error: groupError, updateGroup } = useGroup(groupId || 0);
  const { openModal } = useModal();
  const { user } = useAuth();
  
  // Redirect if there's an error accessing the group or response is 403
  useEffect(() => {
    if (groupError) {
      toast({
        title: "Access Denied",
        description: "You don't have access to this group",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [groupError, toast, setLocation]);
  
  // Check if user is an admin or superadmin
  const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";
  
  const headerTitle = groupDetails?.group?.name || "Loading...";

  const handleCreateFolder = () => {
    setIsCreateFolderOpen(true);
  };

  const handleUploadFile = () => {
    openModal('fileUpload', { groupId, parentId: folderId });
  };

  const handleManageGroup = () => {
    openModal('groupManagement', { groupId });
  };

  if (isGroupLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Only redirect to home page if we're not loading and the group doesn't exist
  if (!isGroupLoading && !groupDetails) {
    setLocation("/");
    return null;
  }

  // We've verified groupDetails exists at this point
  const userPermission = groupDetails?.userPermission || "View";
  const canEdit = userPermission === "Edit" || isAdmin;

  return (
    <AppLayout
      folderId={folderId}
      groupId={groupId}
      groupName={headerTitle}
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{headerTitle}</h1>
            <div className="flex gap-2 mt-1">
              {user?.role && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  {user.role}
                </span>
              )}
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                {userPermission} Access
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>New</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreateFolder}>
                  <span>New Folder</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline"
              onClick={handleUploadFile}
              disabled={!canEdit}
            >
              <Upload className="mr-2 h-4 w-4" />
              <span>Upload</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && (
                  <DropdownMenuItem onClick={handleManageGroup}>
                    Manage Group
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <>
                    {isAdmin && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => openModal('fileUpload', { groupId, parentId: folderId })}>
                      Upload File
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCreateFolder}>
                      Create Folder
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <CreateFolderDialog
          open={isCreateFolderOpen}
          onOpenChange={setIsCreateFolderOpen}
          groupId={groupId}
          parentId={folderId}
        />
        
        <FileExplorer 
          groupId={groupId} 
          parentId={folderId} 
        />
      </div>
    </AppLayout>
  );
}
