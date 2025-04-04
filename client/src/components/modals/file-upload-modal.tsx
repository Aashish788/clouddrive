import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal";
import { useFiles } from "@/hooks/use-files";
import { Upload, File as FileIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function FileUploadModal() {
  const { activeModal, modalData, closeModal } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const groupId = modalData?.groupId;
  const parentId = modalData?.parentId;
  const { uploadFile } = useFiles(groupId, parentId);
  
  const isOpen = activeModal === 'fileUpload';
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setProgress(10);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 300);
    
    try {
      // Read the file as a base64 string
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      reader.onload = () => {
        const base64Data = reader.result as string;
        // Remove the data:mimetype;base64, prefix
        const base64Content = base64Data.split(',')[1];
        
        // Upload the file - if groupId is null, use a "personal" storage area
        uploadFile({
          name: selectedFile.name,
          type: selectedFile.type,
          data: base64Content,
          groupId: groupId || 0, // Use 0 to indicate personal files
          parentId: parentId || null
        });
        
        clearInterval(progressInterval);
        setProgress(100);
        
        // Wait a moment to show 100% progress, then close
        setTimeout(() => {
          setUploading(false);
          setSelectedFile(null);
          setProgress(0);
          closeModal();
        }, 500);
      };
    } catch (error) {
      console.error("Upload error:", error);
      clearInterval(progressInterval);
      setUploading(false);
      setProgress(0);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          {!selectedFile ? (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-primary-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Drag a file here or click to browse</h3>
              <p className="text-sm text-gray-500">Upload any file up to 100MB</p>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                  <FileIcon className="h-6 w-6" />
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-gray-900 text-sm mb-1">{selectedFile.name}</h3>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              
              {uploading && (
                <div className="mb-4">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">Uploading... {progress}%</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
