import { useQuery } from "@tanstack/react-query";
import { Folder } from "./use-files";

export type BreadcrumbItem = {
  id: number | null;
  name: string;
};

export function useFolderPath(folderId: number | null, groupId: number) {
  // Mock implementation - in a real app this would fetch the folder path from the server
  const pathQuery = useQuery<BreadcrumbItem[]>({
    queryKey: ["/api/folders/path", folderId, groupId],
    queryFn: async ({ queryKey }) => {
      const [_, currentFolderId, gId] = queryKey;
      
      if (currentFolderId === null) {
        return [{ id: null, name: "Home" }];
      }

      try {
        const res = await fetch(`/api/folders/${currentFolderId}/path?groupId=${gId}`, {
          credentials: "include"
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch folder path");
        }
        
        return await res.json();
      } catch (error) {
        // Fallback for development
        return [
          { id: null, name: "Home" },
          { id: currentFolderId as number, name: "Current Folder" }
        ];
      }
    },
    enabled: groupId !== undefined,
  });

  return {
    path: pathQuery.data || [{ id: null, name: "Home" }],
    isLoading: pathQuery.isLoading,
    error: pathQuery.error,
  };
}
