import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/layout";
import { FileExplorer } from "@/components/file-explorer";
import { Button } from "@/components/ui/button";
import { useFiles } from "@/hooks/use-files";
import { useGroup } from "@/hooks/use-group";
import { useModal } from "@/hooks/use-modal";
import { useAuth } from "@/hooks/use-auth";
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
  const [matchGroup] = useRoute<{ groupId: string }>("/group/:groupId");
  const [matchFolder] = useRoute<{ groupId: string, folderId: string }>("/group/:groupId/folder/:folderId");
  
  // Extract and sanitize groupId
  const rawGroupId = matchGroup && typeof matchGroup !== 'boolean' ? matchGroup.params.groupId : 
                     (matchFolder && typeof matchFolder !== 'boolean' ? matchFolder.params.groupId : "");
  const groupId = rawGroupId ? parseInt(rawGroupId) : 0;
  const folderId = matchFolder && typeof matchFolder !== 'boolean' && matchFolder.params.folderId ? 
                   parseInt(matchFolder.params.folderId) : null;
  
  // Only call useGroup if groupId is valid
  const { groupDetails, isLoading: isGroupLoading, updateGroup } = useGroup(groupId || 0);
  const { openModal } = useModal();
  const { user } = useAuth();
  
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

  if (!groupDetails) {
    setLocation("/");
    return null;
  }

  return (
    <AppLayout
      folderId={folderId}
      groupId={groupId}
      groupName={headerTitle}
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
          <h1 className="text-2xl font-semibold text-gray-900">{headerTitle}</h1>
          
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
              disabled={groupDetails.userPermission !== "Edit"}
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
                {(isAdmin || groupDetails.userPermission === "Edit") && (
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
