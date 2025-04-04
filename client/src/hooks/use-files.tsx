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
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the query for the specific folder where the new folder was created
      queryClient.invalidateQueries({ 
        queryKey: ["/api/files", variables.groupId, variables.parentId] 
      });
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
    mutationFn: async (data: { name: string, type: string, data: string, groupId: number | null, parentId: number | null }) => {
      // If groupId is null or 0, we're uploading to personal space
      const url = (!data.groupId || data.groupId === 0) ? "/api/personal-files" : "/api/files";
      
      // Remove groupId for personal files endpoint or ensure it's included for group files
      const payload = (!data.groupId || data.groupId === 0) 
        ? { name: data.name, type: data.type, data: data.data, parentId: data.parentId }
        : data;
        
      const res = await apiRequest("POST", url, payload);
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the query for the specific folder where the file was uploaded
      // This ensures that when we upload to a folder, the folder's content is refreshed
      queryClient.invalidateQueries({ 
        queryKey: ["/api/files", variables.groupId, variables.parentId] 
      });
      
      toast({
        title: "File uploaded",
        description: "The file has been uploaded successfully",
      });
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
      return { groupId: fileGroupId, parentId: fileParentId };
    },
    onSuccess: (result) => {
      // Invalidate the specific folder query where the file was deleted from
      queryClient.invalidateQueries({ 
        queryKey: ["/api/files", result.groupId, result.parentId] 
      });
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
      return { groupId: folderGroupId, parentId: folderParentId };
    },
    onSuccess: (result) => {
      // Invalidate the specific folder query where the folder was deleted from
      queryClient.invalidateQueries({ 
        queryKey: ["/api/files", result.groupId, result.parentId] 
      });
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
      return { result: await res.json(), groupId: fileGroupId, parentId: fileParentId };
    },
    onSuccess: (data) => {
      // Invalidate the specific folder query where the file was renamed
      queryClient.invalidateQueries({ 
        queryKey: ["/api/files", data.groupId, data.parentId] 
      });
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
      return { result: await res.json(), groupId: folderGroupId, parentId: folderParentId };
    },
    onSuccess: (data) => {
      // Invalidate the specific folder query where the folder was renamed
      queryClient.invalidateQueries({ 
        queryKey: ["/api/files", data.groupId, data.parentId] 
      });
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
    createFolder: createFolderMutation.mutate,
    uploadFile: uploadFileMutation.mutate,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
  };
}
