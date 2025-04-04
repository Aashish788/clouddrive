import { useState } from "react";
import { AppLayout } from "@/components/layout/layout";
import { useGroups } from "@/hooks/use-group";
import { FileExplorer } from "@/components/file-explorer";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Plus as PlusIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useModal } from "@/hooks/use-modal";
import { useLocation, useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { CreateFolderDialog } from "@/components/create-folder-dialog";

export default function HomePage() {
  const { groups, isLoading, createGroup } = useGroups();
  const { openModal } = useModal();
  const [_, setLocation] = useLocation();
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const { user } = useAuth();
  
  // Check if we're viewing a personal folder
  const [matchPersonalFolder, params] = useRoute<{ folderId: string }>("/personal/folder/:folderId");
  const personalFolderId = matchPersonalFolder ? parseInt(params.folderId) : null;
  
  // Check if user is an admin or superadmin
  const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";
  
  const handleCreateFolder = () => {
    setIsCreateFolderOpen(true);
  };
  
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroup(newGroupName);
      setNewGroupName("");
      setIsCreatingGroup(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
          <h1 className="text-2xl font-semibold text-gray-900">My Drive</h1>
          
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <Button 
                className="inline-flex items-center"
                onClick={() => setIsCreatingGroup(true)}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                New Group
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => openModal('fileUpload', { groupId: null, parentId: null })}
              className="inline-flex items-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
          </div>
        </div>
        
        {isCreatingGroup && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium mb-3">Create New Group</h2>
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <Button onClick={handleCreateGroup}>Create</Button>
              <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>Cancel</Button>
            </div>
          </div>
        )}
        
        {/* Personal Files Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-3">
            My Personal Files
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={handleCreateFolder}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
          </h2>
          <FileExplorer groupId={null} parentId={personalFolderId} />
          
          <CreateFolderDialog
            open={isCreateFolderOpen}
            onOpenChange={setIsCreateFolderOpen}
            groupId={0} // Dummy group ID for personal files (will be ignored)
            parentId={personalFolderId}
          />
        </div>

        {/* Groups Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-3">My Groups</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-md mr-3" />
                        <div>
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groups.map((membership) => (
                <Card 
                  key={membership.groupId} 
                  className="overflow-hidden transition-all hover:shadow cursor-pointer border border-gray-200"
                  onClick={() => setLocation(`/group/${membership.groupId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-secondary-100 text-secondary-600 flex items-center justify-center mr-3">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm group-hover:text-primary-600">
                            {membership.group.name}
                          </h3>
                          <p className="text-xs text-gray-500">Group</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`bg-${membership.permission === "Edit" ? "green" : "blue"}-100 text-${membership.permission === "Edit" ? "green" : "blue"}-600 text-xs px-2 py-0.5 rounded-full`}>
                          {membership.permission === "Edit" ? "Edit" : "View"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
              <p className="text-gray-500 mb-4">
                {isAdmin 
                  ? "Create a new group to start organizing your files" 
                  : "Contact an administrator to create a group for you"
                }
              </p>
              {isAdmin && (
                <Button onClick={() => setIsCreatingGroup(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

import { Users } from "lucide-react";
