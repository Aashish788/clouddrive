import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { User } from "@shared/schema";

// Define validation schemas
const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
});

const addUserToGroupSchema = z.object({
  userId: z.number(),
  permission: z.enum(["View", "Edit"]),
});

const updatePermissionSchema = z.object({
  permission: z.enum(["View", "Edit"]),
});

// Middleware to check if the user is an admin or super admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const user = req.user as User;
  if (user.role !== "Admin" && user.role !== "SuperAdmin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}

export function setupGroupRoutes(app: Express) {
  // Get all groups for the current user
  app.get("/api/groups", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // If user is admin or superadmin, return all groups
      if (userRole === "Admin" || userRole === "SuperAdmin") {
        const allGroups = await storage.getAllGroups();
        // Format the response to match getUserGroups output structure
        const formattedGroups = allGroups.map(group => ({
          group,
          userId,
          groupId: group.id,
          permission: "Edit" as const, // Admins get edit permission by default
          id: 0, // Placeholder for membership ID
          addedById: null,
          addedAt: new Date().toISOString()
        }));
        return res.json(formattedGroups);
      }
      
      // For regular users, only return groups they are members of
      const userGroups = await storage.getUserGroups(userId);
      res.json(userGroups);
    } catch (error) {
      next(error);
    }
  });
  
  // Create a new group - only admin and superadmin can create groups
  app.post("/api/groups", requireAdmin, async (req, res, next) => {
    try {
      
      // Validate input
      const result = createGroupSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { name } = result.data;
      const user = req.user as User;
      
      // Create the group
      const newGroup = await storage.createGroup({
        name,
        createdById: user.id
      });
      
      // Add the creator to the group with Edit permission
      await storage.addUserToGroup({
        userId: user.id,
        groupId: newGroup.id,
        permission: "Edit",
        addedById: user.id
      });
      
      res.status(201).json(newGroup);
    } catch (error) {
      next(error);
    }
  });
  
  // Get a specific group's details, including members
  app.get("/api/groups/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const groupId = Number(req.params.id);
      
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      // Get the group
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Admin or SuperAdmin can access any group
      const isAdmin = userRole === "Admin" || userRole === "SuperAdmin";
      
      if (!isAdmin) {
        // Regular users need to check permission
        const userPermission = await storage.getUserPermissionForGroup(userId, groupId);
        
        if (!userPermission) {
          return res.status(403).json({ message: "You don't have access to this group" });
        }
      }
      
      // Get the group members
      const members = await storage.getGroupMembers(groupId);
      
      // For admins who aren't group members, return Edit permission by default
      const userPermission = isAdmin 
        ? await storage.getUserPermissionForGroup(userId, groupId) || "Edit" 
        : await storage.getUserPermissionForGroup(userId, groupId);
      
      res.json({
        group,
        members,
        userPermission
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Update a group (admin only)
  app.patch("/api/groups/:id", requireAdmin, async (req, res, next) => {
    try {
      const groupId = Number(req.params.id);
      
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      // Validate input
      const result = createGroupSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { name } = result.data;
      
      // Get the group
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Update the group
      const updatedGroup = await storage.updateGroup(groupId, name);
      
      res.json(updatedGroup);
    } catch (error) {
      next(error);
    }
  });
  
  // Delete a group (admin only)
  app.delete("/api/groups/:id", requireAdmin, async (req, res, next) => {
    try {
      const groupId = Number(req.params.id);
      
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      // Get the group
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Delete the group
      await storage.deleteGroup(groupId);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  // Add a user to a group (admin only)
  app.post("/api/groups/:id/members", requireAdmin, async (req, res, next) => {
    try {
      const groupId = Number(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      // Validate input
      const result = addUserToGroupSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { userId, permission } = result.data;
      
      // Get the group
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Get the user to add
      const userToAdd = await storage.getUser(userId);
      if (!userToAdd) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the user is already in the group
      const existingPermission = await storage.getUserPermissionForGroup(userId, groupId);
      if (existingPermission) {
        return res.status(400).json({ message: "User is already a member of this group" });
      }
      
      // Add the user to the group
      const membership = await storage.addUserToGroup({
        userId,
        groupId,
        permission,
        addedById: req.user!.id
      });
      
      res.status(201).json(membership);
    } catch (error) {
      next(error);
    }
  });
  
  // Update a user's permission in a group (requires Edit permission or admin role)
  app.patch("/api/groups/:groupId/members/:userId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const groupId = Number(req.params.groupId);
      const userId = Number(req.params.userId);
      
      if (isNaN(groupId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid group ID or user ID" });
      }
      
      // Check if user has edit permission or is an admin
      const currentUser = req.user as User;
      const userPermission = await storage.getUserPermissionForGroup(currentUser.id, groupId);
      
      if (!(userPermission === "Edit" || currentUser.role === "Admin" || currentUser.role === "SuperAdmin")) {
        return res.status(403).json({ message: "Edit permission required to update user permissions" });
      }
      
      // Validate input
      const result = updatePermissionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { permission } = result.data;
      
      // Get the group
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update the user's permission
      const updatedMembership = await storage.updateUserPermission(userId, groupId, permission);
      if (!updatedMembership) {
        return res.status(404).json({ message: "User is not a member of this group" });
      }
      
      res.json(updatedMembership);
    } catch (error) {
      next(error);
    }
  });
  
  // Remove a user from a group (requires Edit permission or admin role)
  app.delete("/api/groups/:groupId/members/:userId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const groupId = Number(req.params.groupId);
      const userId = Number(req.params.userId);
      
      if (isNaN(groupId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid group ID or user ID" });
      }
      
      // Check if user has edit permission or is an admin
      const currentUser = req.user as User;
      const userPermission = await storage.getUserPermissionForGroup(currentUser.id, groupId);
      
      if (!(userPermission === "Edit" || currentUser.role === "Admin" || currentUser.role === "SuperAdmin")) {
        return res.status(403).json({ message: "Edit permission required to remove users" });
      }
      
      // Get the group
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove the user from the group
      await storage.removeUserFromGroup(userId, groupId);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
}
