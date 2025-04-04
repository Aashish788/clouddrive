import { useState } from "react";
import { useFiles, File as FileType, Folder } from "@/hooks/use-files";
import { useLocation } from "wouter";
import { FileCard } from "@/components/ui/file-card";
import { FolderCard } from "@/components/ui/folder-card";
import { Button } from "@/components/ui/button";
import { 
  ALargeSmall, 
  List, 
  SlidersHorizontal, 
  ChevronDown,
  Loader2,
  FileX,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileExplorerProps {
  groupId: number | null;
  parentId: number | null;
}

type ViewMode = "grid" | "list";
type SortOption = "name" | "date" | "size" | "type";
type SortDirection = "asc" | "desc";

export function FileExplorer({ groupId, parentId }: FileExplorerProps) {
  const { filesData, isLoading, error } = useFiles(groupId, parentId);
  const [_, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Handle sorting of files and folders
  const sortItems = <T extends FileType | Folder>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "date") {
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === "type" && 'type' in a && 'type' in b) {
        comparison = (a as FileType).type.localeCompare((b as FileType).type);
      } else if (sortBy === "size" && 'size' in a && 'size' in b) {
        comparison = (a as FileType).size - (b as FileType).size;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  };
  
  const sortedFolders = filesData?.folders ? sortItems(filesData.folders) : [];
  const sortedFiles = filesData?.files ? sortItems(filesData.files) : [];
  
  // Handle changing sort options
  const handleSortChange = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(option);
      setSortDirection("asc");
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium">Error loading files</h3>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }
  
  const isEmpty = (!sortedFolders || sortedFolders.length === 0) && (!sortedFiles || sortedFiles.length === 0);
  
  return (
    <div>
      {/* Filter/Sort Bar */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Sort:</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {sortBy === "name" ? "Name" : 
                 sortBy === "date" ? "Date Modified" :
                 sortBy === "size" ? "Size" : "Type"}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleSortChange("name")}>
                Name {sortBy === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("date")}>
                Date Modified {sortBy === "date" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("size")}>
                Size {sortBy === "size" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("type")}>
                Type {sortBy === "type" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant={viewMode === "grid" ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setViewMode("grid")}
          >
            <ALargeSmall className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "list" ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {isEmpty ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <FileX className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files or folders</h3>
          <p className="text-gray-500">This location is empty</p>
        </div>
      ) : (
        <>
          {/* Folders Section */}
          {sortedFolders && sortedFolders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Folders</h2>
              
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      permission={filesData?.permission || "View"}
                      groupId={groupId}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {sortedFolders.map((folder) => (
                    <div 
                      key={folder.id} 
                      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => groupId ? setLocation(`/group/${groupId}/folder/${folder.id}`) : setLocation(`/personal/folder/${folder.id}`)}
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-secondary-100 text-secondary-600 flex items-center justify-center mr-3">
                          <FolderIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">{folder.name}</h3>
                          <p className="text-xs text-gray-500">
                            Modified {new Date(folder.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`bg-${filesData?.permission === "Edit" ? "green" : "blue"}-100 text-${filesData?.permission === "Edit" ? "success" : "secondary"}-500 text-xs px-2 py-0.5 rounded-full mr-2`}>
                          {filesData?.permission}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); /* Add action handling */ }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Files Section */}
          {sortedFiles && sortedFiles.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Files</h2>
              
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      permission={filesData?.permission || "View"}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {sortedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md flex items-center justify-center mr-3">
                          <FileIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">{file.name}</h3>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB • Modified {new Date(file.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`bg-${filesData?.permission === "Edit" ? "green" : "blue"}-100 text-${filesData?.permission === "Edit" ? "success" : "secondary"}-500 text-xs px-2 py-0.5 rounded-full mr-2`}>
                          {filesData?.permission}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { /* Add action handling */ }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { FolderIcon, FileIcon, MoreVertical } from "lucide-react";
