import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFiles } from "@/hooks/use-files";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  parentId: number | null;
}

export function CreateFolderDialog({ open, onOpenChange, groupId, parentId }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const { createFolder } = useFiles(groupId, parentId);
  
  const handleCreateFolder = () => {
    if (folderName.trim()) {
      createFolder({
        name: folderName,
        parentId,
        groupId
      });
      setFolderName("");
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleCreateFolder} disabled={!folderName.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
