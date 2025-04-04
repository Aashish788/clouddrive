import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useGroups } from "@/hooks/use-group";
import { 
  Home, 
  Star, 
  Clock, 
  Trash, 
  Users, 
  ShieldX, 
  Settings, 
  LogOut, 
  Menu, 
  Box 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ className, isMobile, onClose }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { groups, isLoading, isAdmin } = useGroups();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const closeOnMobile = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <aside className={cn(
      "bg-white border-r border-gray-200 flex flex-col h-full",
      className
    )}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-md bg-primary-600 flex items-center justify-center">
            <Box className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-bold text-lg">Cogmac Drive</h1>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={closeOnMobile}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</h2>
        </div>
        
        <Link href="/" onClick={closeOnMobile}>
          <Button 
            variant={isActive("/") ? "secondary" : "ghost"} 
            className={cn(
              "w-full justify-start mb-1",
              isActive("/") && "bg-primary-50 text-primary-600"
            )}
          >
            <Home className="mr-3 h-5 w-5" />
            <span>Home</span>
          </Button>
        </Link>
        
        <Link href="/starred" onClick={closeOnMobile}>
          <Button 
            variant="ghost" 
            className="w-full justify-start mb-1"
          >
            <Star className="mr-3 h-5 w-5" />
            <span>Starred</span>
          </Button>
        </Link>
        
        <Link href="/recent" onClick={closeOnMobile}>
          <Button 
            variant="ghost" 
            className="w-full justify-start mb-1"
          >
            <Clock className="mr-3 h-5 w-5" />
            <span>Recent</span>
          </Button>
        </Link>
        
        <Link href="/trash" onClick={closeOnMobile}>
          <Button 
            variant="ghost" 
            className="w-full justify-start mb-1"
          >
            <Trash className="mr-3 h-5 w-5" />
            <span>Trash</span>
          </Button>
        </Link>

        <Separator className="my-4" />
        
        <div className="px-4 mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Groups</h2>
        </div>
        
        {isLoading ? (
          <div className="px-4 py-2 text-sm text-gray-500">Loading groups...</div>
        ) : (
          groups && groups.map((membership) => (
            <Link 
              key={membership.groupId} 
              href={`/group/${membership.groupId}`}
              onClick={closeOnMobile}
            >
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start mb-1 pr-2",
                  isActive(`/group/${membership.groupId}`) && "bg-primary-50 text-primary-600",
                  isActive(`/group/${membership.groupId}/folder`) && "bg-primary-50 text-primary-600"
                )}
              >
                <Users className="mr-3 h-5 w-5" />
                <span className="flex-grow truncate text-left">{membership.group.name}</span>
                <Badge 
                  variant={membership.permission === "Edit" ? "default" : "secondary"} 
                  className="ml-2"
                >
                  {membership.permission}
                </Badge>
              </Button>
            </Link>
          ))
        )}

        {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
          <>
            <Separator className="my-4" />
            
            <div className="px-4 mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</h2>
            </div>
            
            <Link href="/admin/users" onClick={closeOnMobile}>
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start mb-1",
                  isActive("/admin/users") && "bg-primary-50 text-primary-600"
                )}
              >
                <ShieldX className="mr-3 h-5 w-5" />
                <span>User Management</span>
              </Button>
            </Link>
            
            <Link href="/admin/groups" onClick={closeOnMobile}>
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start mb-1",
                  isActive("/admin/groups") && "bg-primary-50 text-primary-600"
                )}
              >
                <Settings className="mr-3 h-5 w-5" />
                <span>Group Management</span>
              </Button>
            </Link>
          </>
        )}
      </nav>

      {user && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
