import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import GroupPage from "@/pages/group-page";
import UserManagementPage from "@/pages/user-management-page";
import GroupManagementPage from "@/pages/group-management-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";
import { ModalProvider } from "@/hooks/use-modal";
import ModalContainer from "@/components/modals";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/group/:groupId" component={GroupPage} />
      <ProtectedRoute path="/group/:groupId/folder/:folderId" component={GroupPage} />
      <AdminRoute path="/admin/users" component={UserManagementPage} />
      <AdminRoute path="/admin/groups" component={GroupManagementPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ModalProvider>
          <Router />
          <ModalContainer />
          <Toaster />
        </ModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
