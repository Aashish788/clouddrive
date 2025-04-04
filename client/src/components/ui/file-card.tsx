import { 
  MoreVertical, 
  FileText, 
  FileImage, 
  FilePen, 
  FileSpreadsheet, 
  File as FileIcon,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useModal } from "@/hooks/use-modal";
import { File as FileType } from "@/hooks/use-files";

interface FileCardProps {
  file: FileType;
  permission: "View" | "Edit";
}

export function FileCard({ file, permission }: FileCardProps) {
  const { openModal } = useModal();
  
  const getFileIcon = (type: string) => {
    switch (true) {
      case type.includes('image'):
        return <FileImage className="h-10 w-10 text-blue-600" />;
      case type.includes('pdf'):
        return <FilePen className="h-10 w-10 text-red-600" />;
      case type.includes('spreadsheet') || type.includes('excel') || type.includes('sheet'):
        return <FileSpreadsheet className="h-10 w-10 text-green-600" />;
      case type.includes('document') || type.includes('word'):
        return <FileText className="h-10 w-10 text-blue-600" />;
      default:
        return <FileIcon className="h-10 w-10 text-gray-600" />;
    }
  };

  const handleFileAction = () => {
    openModal('fileAction', { file, permission });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow group border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-md flex items-center justify-center mr-3">
              {getFileIcon(file.type)}
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm group-hover:text-primary-600 truncate max-w-[140px]">
                {file.name}
              </h3>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
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
          {formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleFileAction}
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </Button>
      </CardFooter>
    </Card>
  );
}
