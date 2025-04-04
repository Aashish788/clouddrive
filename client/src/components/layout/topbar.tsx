import { useState } from "react";
import { useLocation, Link } from "wouter";
import { 
  Search, 
  Bell, 
  ArrowLeft, 
  ArrowRight, 
  Menu,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useFolderPath } from "@/hooks/use-folders";

interface TopbarProps {
  onMenuClick: () => void;
  folderId?: number | null;
  groupId?: number;
  groupName?: string;
}

export function Topbar({ onMenuClick, folderId, groupId, groupName }: TopbarProps) {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { path } = useFolderPath(folderId || null, groupId || 0);
  
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoForward = () => {
    window.history.forward();
  };

  const handlePathClick = (id: number | null) => {
    if (groupId) {
      if (id === null) {
        setLocation(`/group/${groupId}`);
      } else {
        setLocation(`/group/${groupId}/folder/${id}`);
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-md bg-primary-600 flex items-center justify-center">
            <div className="text-white font-bold">CD</div>
          </div>
          <h1 className="font-bold text-lg">Cogmac Drive</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center flex-1 space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={handleGoForward}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          
          {groupId && path && (
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
              {path.map((item, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                  <Button 
                    variant="link" 
                    className={index === path.length - 1 ? "font-medium text-gray-900" : "text-gray-500"} 
                    onClick={() => handlePathClick(item.id)}
                  >
                    {item.name}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative max-w-xs hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              type="text" 
              placeholder="Search files..." 
              className="pl-10 pr-3 py-2 w-full max-w-[200px]" 
            />
          </div>
          
          <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary-600"></span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full overflow-hidden">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
