import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal";
import { useFiles, File as FileType, Folder } from "@/hooks/use-files";
import { 
  Download, 
  Share, 
  Pencil, 
  Copy, 
  FolderPlus, 
  Trash,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileIcon,
  FolderIcon,
  File as FileIconBase
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatBytes } from "@/lib/utils";

export function FileActionModal() {
  const { activeModal, modalData, closeModal, openModal } = useModal();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  
  const isFolder = modalData?.isFolder;
  const item = modalData?.folder || modalData?.file;
  const permission = modalData?.permission;
  
  // Use the useFiles hook for mutation actions
  const { 
    deleteFile, 
    deleteFolder, 
    renameFile, 
    renameFolder 
  } = useFiles(item?.groupId, item?.parentId);
  
  const isOpen = activeModal === 'fileAction';
  
  if (!item) return null;
  
  const handleDownload = async () => {
    if (isFolder) return;
    
    try {
      window.open(`/api/files/${item.id}/download`, '_blank');
      closeModal();
    } catch (error) {
      console.error("Download error:", error);
    }
  };
  
  const handleDelete = () => {
    if (isFolder) {
      deleteFolder(item.id);
    } else {
      deleteFile(item.id);
    }
    closeModal();
  };
  
  const handleRename = () => {
    if (isRenaming) {
      if (newName && newName !== item.name) {
        if (isFolder) {
          renameFolder(item.id, newName);
        } else {
          renameFile(item.id, newName);
        }
      }
      setIsRenaming(false);
    } else {
      setNewName(item.name);
      setIsRenaming(true);
    }
  };
  
  const getFileIcon = () => {
    if (isFolder) {
      return <FolderIcon className="h-10 w-10 text-blue-600" />;
    }
    
    const type = (item as FileType).type || "";
    
    switch (true) {
      case type.includes('image'):
        return <FileImage className="h-10 w-10 text-blue-600" />;
      case type.includes('pdf'):
        return <FileIconBase className="h-10 w-10 text-red-600" />;
      case type.includes('spreadsheet') || type.includes('excel') || type.includes('sheet'):
        return <FileSpreadsheet className="h-10 w-10 text-green-600" />;
      case type.includes('document') || type.includes('word'):
        return <FileText className="h-10 w-10 text-blue-600" />;
      default:
        return <FileIcon className="h-10 w-10 text-gray-600" />;
    }
  };
  
  const getItemDetails = () => {
    if (isFolder) {
      return `Folder • Modified ${formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}`;
    } else {
      const file = item as FileType;
      return `${formatBytes(file.size)} • Modified ${formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}`;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>File Actions</DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 rounded-md flex items-center justify-center mr-3">
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  className="w-full mb-1"
                />
              ) : (
                <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
              )}
              <p className="text-xs text-gray-500">{getItemDetails()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {!isFolder && (
              <Button 
                variant="ghost" 
                className="justify-start px-3 py-2 w-full"
                onClick={handleDownload}
              >
                <Download className="h-5 w-5 mr-3 text-gray-500" />
                <span>Download</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              className="justify-start px-3 py-2 w-full"
              onClick={() => {
                closeModal();
                openModal('fileShare', { file: item, isFolder, permission });
              }}
            >
              <Share className="h-5 w-5 mr-3 text-gray-500" />
              <span>Share</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="justify-start px-3 py-2 w-full"
              onClick={handleRename}
              disabled={permission !== "Edit"}
            >
              <Pencil className="h-5 w-5 mr-3 text-gray-500" />
              <span>{isRenaming ? "Save" : "Rename"}</span>
            </Button>
            
            {!isFolder && (
              <Button 
                variant="ghost" 
                className="justify-start px-3 py-2 w-full"
                disabled={permission !== "Edit"}
              >
                <Copy className="h-5 w-5 mr-3 text-gray-500" />
                <span>Make a copy</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              className="justify-start px-3 py-2 w-full"
              disabled={permission !== "Edit"}
            >
              <FolderPlus className="h-5 w-5 mr-3 text-gray-500" />
              <span>Move to</span>
            </Button>
            
            {permission === "Edit" && (
              <Button 
                variant="destructive" 
                className="justify-start px-3 py-2 w-full mt-2"
                onClick={handleDelete}
              >
                <Trash className="h-5 w-5 mr-3" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
