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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", groupId, parentId] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", groupId, parentId] });
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
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", groupId, parentId] });
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
    mutationFn: async (folderId: number) => {
      await apiRequest("DELETE", `/api/folders/${folderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", groupId, parentId] });
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
    mutationFn: async ({ fileId, name }: { fileId: number, name: string }) => {
      const res = await apiRequest("PATCH", `/api/files/${fileId}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", groupId, parentId] });
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
    mutationFn: async ({ folderId, name }: { folderId: number, name: string }) => {
      const res = await apiRequest("PATCH", `/api/folders/${folderId}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", groupId, parentId] });
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

  return {
    filesData: filesQuery.data,
    isLoading: filesQuery.isLoading,
    error: filesQuery.error,
    createFolder: createFolderMutation.mutate,
    uploadFile: uploadFileMutation.mutate,
    deleteFile: deleteFileMutation.mutate,
    deleteFolder: deleteFolderMutation.mutate,
    renameFile: renameFileMutation.mutate,
    renameFolder: renameFolderMutation.mutate,
  };
}
