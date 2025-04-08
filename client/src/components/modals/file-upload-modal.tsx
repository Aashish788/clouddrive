import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal";
import { useFiles } from "@/hooks/use-files";
import { Upload, File as FileIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// Set chunk size to 5MB for efficient uploading of large files
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export function FileUploadModal() {
  const { activeModal, modalData, closeModal } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  
  const groupId = modalData?.groupId;
  const parentId = modalData?.parentId;
  const { uploadFile } = useFiles(groupId, parentId);
  
  const isOpen = activeModal === 'fileUpload';
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Check if file size is within limits (2GB max)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 2GB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setProgress(0);
    
    try {
      // For large files, use binary upload with chunking
      if (selectedFile.size > CHUNK_SIZE) {
        await uploadLargeFile(selectedFile);
      } else {
        // For small files, use the base64 approach
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        
        reader.onload = async () => {
          const base64Data = reader.result as string;
          // Remove the data:mimetype;base64, prefix
          const base64Content = base64Data.split(',')[1];
          
          // Upload the file - if groupId is null, use a "personal" storage area
          await uploadFile({
            name: selectedFile.name,
            type: selectedFile.type,
            data: base64Content,
            groupId: groupId, // Will be null for personal files
            parentId: parentId || null
          });
          
          setProgress(100);
          
          // Wait a moment to show 100% progress, then close
          setTimeout(() => {
            setUploading(false);
            setSelectedFile(null);
            setProgress(0);
            closeModal();
          }, 500);
        };
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      setUploading(false);
      setProgress(0);
    }
  };
  
  // New function to upload large files using binary chunks
  const uploadLargeFile = async (file: File) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedChunks = 0;
    
    for (let start = 0; start < file.size; start += CHUNK_SIZE) {
      // Get a slice of the file
      const chunk = file.slice(start, start + CHUNK_SIZE);
      
      // Create headers with file metadata
      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': file.name,
        'X-File-Type': file.type,
        'X-Chunk-Index': uploadedChunks.toString(),
        'X-Total-Chunks': totalChunks.toString()
      };
      
      // Add groupId or parentId if present
      if (groupId !== null && groupId !== undefined) {
        headers['X-Group-Id'] = groupId.toString();
      }
      
      if (parentId !== null && parentId !== undefined) {
        headers['X-Parent-Id'] = parentId.toString();
      }
      
      // Upload the binary chunk
      const endpoint = (!groupId || groupId === 0) 
        ? '/api/personal-files/binary' 
        : '/api/files/binary';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: chunk,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload chunk: ${errorText}`);
      }
      
      uploadedChunks++;
      // Update progress based on chunks uploaded
      setProgress(Math.round((uploadedChunks / totalChunks) * 100));
      
      // Check if this was the last chunk
      if (uploadedChunks === totalChunks) {
        setTimeout(() => {
          setUploading(false);
          setSelectedFile(null);
          setProgress(0);
          closeModal();
        }, 500);
      }
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
              <p className="text-sm text-gray-500">Upload any file up to 2GB</p>
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
