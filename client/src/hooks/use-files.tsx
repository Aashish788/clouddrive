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

export function useFiles(groupId: number, parentId: number | null = null) {
  const { toast } = useToast();

  const filesQuery = useQuery<FilesData>({
    queryKey: ["/api/files", groupId, parentId],
    queryFn: async ({ queryKey }) => {
      const [_, gId, pId] = queryKey;
      const url = `/api/files?groupId=${gId}${pId !== null ? `&parentId=${pId}` : ''}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch files");
      }
      return res.json();
    },
    enabled: groupId !== undefined,
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string, parentId: number | null, groupId: number }) => {
      const res = await apiRequest("POST", "/api/folders", data);
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
    mutationFn: async (data: { name: string, type: string, data: string, groupId: number, parentId: number | null }) => {
      const res = await apiRequest("POST", "/api/files", data);
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
