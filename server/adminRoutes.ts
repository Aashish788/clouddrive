import { Express } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { User } from "@shared/schema";

// Define validation schemas
const updateUserRoleSchema = z.object({
  role: z.enum(["User", "Admin", "SuperAdmin"]),
});

// Middleware to check if the user is a super admin
function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const user = req.user as User;
  if (user.role !== "SuperAdmin") {
    return res.status(403).json({ message: "SuperAdmin access required" });
  }
  
  next();
}

export function setupAdminRoutes(app: Express) {
  // Get all users (admin only)
  app.get("/api/admin/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = req.user as User;
      if (user.role !== "Admin" && user.role !== "SuperAdmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      
      // Remove passwords from the response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });
  
  // Get all groups (admin only)
  app.get("/api/admin/groups", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = req.user as User;
      if (user.role !== "Admin" && user.role !== "SuperAdmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const groups = await storage.getAllGroups();
      
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });
  
  // Update a user's role (super admin only)
  app.patch("/api/admin/users/:id/role", requireSuperAdmin, async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Validate input
      const result = updateUserRoleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { role } = result.data;
      
      // Get the user
      const userToUpdate = await storage.getUser(userId);
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent updating your own role
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }
      
      // Update the user's role
      const updatedUser = await storage.updateUserRole(userId, role);
      
      // Remove password from the response
      const { password, ...userWithoutPassword } = updatedUser!;
      
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
}
