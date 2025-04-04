import { MoreVertical, Folder as FolderIcon } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useModal } from "@/hooks/use-modal";
import { Folder } from "@/hooks/use-files";
import { useLocation } from "wouter";

interface FolderCardProps {
  folder: Folder;
  permission: "View" | "Edit";
  groupId: number | null;
  onNavigate?: () => void;
}

export function FolderCard({ folder, permission, groupId, onNavigate }: FolderCardProps) {
  const { openModal } = useModal();
  const [_, setLocation] = useLocation();
  
  const handleFolderAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    openModal('fileAction', { folder, permission, isFolder: true });
  };

  const handleFolderClick = () => {
    if (groupId) {
      setLocation(`/group/${groupId}/folder/${folder.id}`);
    } else {
      // For personal files, use a different URL pattern
      setLocation(`/personal/folder/${folder.id}`);
    }
    if (onNavigate) onNavigate();
  };

  return (
    <Card 
      className="overflow-hidden transition-all hover:shadow group border border-gray-200 cursor-pointer"
      onClick={handleFolderClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-md bg-secondary-100 text-secondary-600 flex items-center justify-center mr-3">
              <FolderIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm group-hover:text-primary-600 truncate max-w-[140px]">
                {folder.name}
              </h3>
              <p className="text-xs text-gray-500">Folder</p>
            </div>
          </div>
          <div className="flex items-center">
            <Badge variant={permission === "Edit" ? "secondary" : "outline"} className="text-xs">
              {permission === "Edit" ? "Edit" : "View"}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(folder.updatedAt), { addSuffix: true })}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleFolderAction}
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </Button>
      </CardFooter>
    </Card>
  );
}
