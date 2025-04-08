import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define the File type
export type File = {
  id: number;
  name: string;
  type: string;
  size: number;
  path: string;
  parentId: number | null;
  groupId: number;
  uploadedById: number;
  uploadedAt: string;
  updatedAt: string;
};

// Define the data returned from the files API
export type FilesData = {
  files: File[];
  folders: Folder[];
  permission: "View" | "Edit";
};

// Define the Folder type
export type Folder = {
  id: number;
  name: string;
  parentId: number | null;
  groupId: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
};

export function useFiles(groupId: number | null, parentId: number | null = null) {
  const { toast } = useToast();

  const filesQuery = useQuery<FilesData>({
    queryKey: ["/api/files", groupId, parentId],
    queryFn: async ({ queryKey }) => {
      const [_, gId, pId] = queryKey;
      let url = '';
      
      // If groupId is null or 0, we're in personal files mode
      if (!gId || gId === 0) {
        url = `/api/personal-files${pId !== null ? `?parentId=${pId}` : ''}`;
      } else {
        url = `/api/files?groupId=${gId}${pId !== null ? `&parentId=${pId}` : ''}`;
      }
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch files");
      }
      return res.json();
    },
    enabled: true,
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string, parentId: number | null, groupId: number | null }) => {
      // If groupId is null or 0, we're creating a personal folder
      const url = (!data.groupId || data.groupId === 0) ? "/api/personal-folders" : "/api/folders";
      
      // Remove groupId for personal folders endpoint or ensure it's included for group folders
      const payload = (!data.groupId || data.groupId === 0) 
        ? { name: data.name, parentId: data.parentId }
        : data;
        
      const res = await apiRequest("POST", url, payload);
      const newFolder = await res.json();
      
      // Return the new folder with the query parameters
      return { newFolder, groupId: data.groupId, parentId: data.parentId };
    },
    onSuccess: (data) => {
      // Get the existing query data
      const queryKey = ["/api/files", data.groupId, data.parentId];
      const existingData = queryClient.getQueryData<FilesData>(queryKey);
      
      // Optimistically update the UI with the new folder
      if (existingData) {
        queryClient.setQueryData<FilesData>(queryKey, {
          ...existingData,
          folders: [...existingData.folders, data.newFolder]
        });
      }
      
      // Still invalidate the query to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "Folder created",
        description: "The folder has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (data: { 
      name: string, 
      type: string, 
      data: string, 
      groupId: number | null, 
      parentId: number | null,
      chunkIndex?: number,
      totalChunks?: number
    }) => {
      try {
        // If groupId is null or 0, we're uploading to personal space
        const url = (!data.groupId || data.groupId === 0) ? "/api/personal-files" : "/api/files";
        
        // Remove groupId for personal files endpoint or ensure it's included for group files
        const payload = (!data.groupId || data.groupId === 0) 
          ? { 
              name: data.name, 
              type: data.type, 
              data: data.data, 
              parentId: data.parentId,
              chunkIndex: data.chunkIndex,
              totalChunks: data.totalChunks
            }
          : data;
          
        const res = await apiRequest("POST", url, payload);
        
        // For chunked uploads, only return full data on last chunk or non-chunked uploads
        if (!data.chunkIndex || (data.chunkIndex === data.totalChunks! - 1)) {
          const newFile = await res.json();
          return { newFile, groupId: data.groupId, parentId: data.parentId };
        }
        
        return { isChunk: true, groupId: data.groupId, parentId: data.parentId };
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Only update the UI if this is a complete file upload
      if (!data.isChunk) {
        // Get the existing query data
        const queryKey = ["/api/files", data.groupId, data.parentId];
        const existingData = queryClient.getQueryData<FilesData>(queryKey);
        
        // Optimistically update the UI with the new file
        if (existingData && data.newFile) {
          queryClient.setQueryData<FilesData>(queryKey, {
            ...existingData,
            files: [...existingData.files, data.newFile]
          });
        }
        
        // Still invalidate the query to ensure data consistency
        queryClient.invalidateQueries({ queryKey });
        
        toast({
          title: "File uploaded",
          description: "The file has been uploaded successfully",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ fileId, groupId: fileGroupId, parentId: fileParentId }: 
      { fileId: number, groupId: number | null, parentId: number | null }) => {
      await apiRequest("DELETE", `/api/files/${fileId}`);
      return { fileId, groupId: fileGroupId, parentId: fileParentId };
    },
    onSuccess: (result) => {
      // Get the existing query data
      const queryKey = ["/api/files", result.groupId, result.parentId];
      const existingData = queryClient.getQueryData<FilesData>(queryKey);
      
      // Optimistically update the UI by removing the deleted file
      if (existingData) {
        queryClient.setQueryData<FilesData>(queryKey, {
          ...existingData,
          files: existingData.files.filter(file => file.id !== result.fileId)
        });
      }
      
      // Still invalidate the query to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async ({ folderId, groupId: folderGroupId, parentId: folderParentId }: 
      { folderId: number, groupId: number | null, parentId: number | null }) => {
      await apiRequest("DELETE", `/api/folders/${folderId}`);
      return { folderId, groupId: folderGroupId, parentId: folderParentId };
    },
    onSuccess: (result) => {
      // Get the existing query data
      const queryKey = ["/api/files", result.groupId, result.parentId];
      const existingData = queryClient.getQueryData<FilesData>(queryKey);
      
      // Optimistically update the UI by removing the deleted folder
      if (existingData) {
        queryClient.setQueryData<FilesData>(queryKey, {
          ...existingData,
          folders: existingData.folders.filter(folder => folder.id !== result.folderId)
        });
      }
      
      // Still invalidate the query to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "Folder deleted",
        description: "The folder has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, name, groupId: fileGroupId, parentId: fileParentId }: 
      { fileId: number, name: string, groupId: number | null, parentId: number | null }) => {
      const res = await apiRequest("PATCH", `/api/files/${fileId}`, { name });
      const updatedFile = await res.json();
      return { updatedFile, fileId, groupId: fileGroupId, parentId: fileParentId };
    },
    onSuccess: (data) => {
      // Get the existing query data
      const queryKey = ["/api/files", data.groupId, data.parentId];
      const existingData = queryClient.getQueryData<FilesData>(queryKey);
      
      // Optimistically update the UI with the renamed file
      if (existingData) {
        queryClient.setQueryData<FilesData>(queryKey, {
          ...existingData,
          files: existingData.files.map(file => 
            file.id === data.fileId ? { ...file, name: data.updatedFile.name } : file
          )
        });
      }
      
      // Still invalidate the query to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "File renamed",
        description: "The file has been renamed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rename file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name, groupId: folderGroupId, parentId: folderParentId }: 
      { folderId: number, name: string, groupId: number | null, parentId: number | null }) => {
      const res = await apiRequest("PATCH", `/api/folders/${folderId}`, { name });
      const updatedFolder = await res.json();
      return { updatedFolder, folderId, groupId: folderGroupId, parentId: folderParentId };
    },
    onSuccess: (data) => {
      // Get the existing query data
      const queryKey = ["/api/files", data.groupId, data.parentId];
      const existingData = queryClient.getQueryData<FilesData>(queryKey);
      
      // Optimistically update the UI with the renamed folder
      if (existingData) {
        queryClient.setQueryData<FilesData>(queryKey, {
          ...existingData,
          folders: existingData.folders.map(folder => 
            folder.id === data.folderId ? { ...folder, name: data.updatedFolder.name } : folder
          )
        });
      }
      
      // Still invalidate the query to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: "Folder renamed",
        description: "The folder has been renamed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rename folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create wrapped functions to ensure groupId and parentId are always included
  const deleteFile = (fileId: number) => 
    deleteFileMutation.mutate({ fileId, groupId, parentId });
    
  const deleteFolder = (folderId: number) => 
    deleteFolderMutation.mutate({ folderId, groupId, parentId });
    
  const renameFile = (fileId: number, name: string) => 
    renameFileMutation.mutate({ fileId, name, groupId, parentId });
    
  const renameFolder = (folderId: number, name: string) => 
    renameFolderMutation.mutate({ folderId, name, groupId, parentId });
  
  return {
    filesData: filesQuery.data,
    isLoading: filesQuery.isLoading,
    error: filesQuery.error,
    refetch: filesQuery.refetch,
    createFolder: createFolderMutation.mutate,
    uploadFile: uploadFileMutation.mutate,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
  };
}
