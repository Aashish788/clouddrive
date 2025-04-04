import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
  folderId?: number | null;
  groupId?: number;
  groupName?: string;
}

export function AppLayout({ children, folderId, groupId, groupName }: AppLayoutProps) {
  const { user, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [_, setLocation] = useLocation();
  
  // Close mobile sidebar when location changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [setLocation]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    setLocation("/auth");
    return null;
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      {/* Mobile sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-full max-w-xs transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar isMobile onClose={() => setIsMobileSidebarOpen(false)} />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar 
          onMenuClick={() => setIsMobileSidebarOpen(true)} 
          folderId={folderId}
          groupId={groupId}
          groupName={groupName}
        />
        
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
