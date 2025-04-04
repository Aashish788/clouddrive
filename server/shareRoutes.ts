import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { z } from "zod";
import crypto from "crypto";
import { Permission } from "@shared/schema";

// Validation schemas
const shareItemSchema = z.object({
  userId: z.number(),
  permission: z.enum(["View", "Edit"])
});

const updateShareSchema = z.object({
  permission: z.enum(["View", "Edit"])
});

const publicAccessSchema = z.object({
  isPublic: z.boolean()
});

// Maps to track public links
const publicFileLinks = new Map<number, { token: string, link: string }>();
const publicFolderLinks = new Map<number, { token: string, link: string }>();

interface ValidationResult {
  item: any;
}

// Helper to check if user has permission to share an item
async function validateSharePermission(
  req: Request,
  res: Response,
  itemType: 'file' | 'folder',
  itemId: number
): Promise<ValidationResult | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  // Get the item
  const item = itemType === 'file' 
    ? await storage.getFile(itemId)
    : await storage.getFolder(itemId);

  if (!item) {
    res.status(404).json({ message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} not found` });
    return null;
  }

  // Check if user has permissions for the item
  const userId = req.user!.id;
  
  // For personal files/folders (null groupId)
  if (item.groupId === null) {
    // For personal items, check if the user is the owner
    const ownerId = itemType === 'file' ? (item as any).uploadedById : (item as any).createdById;
    
    if (ownerId !== userId) {
      res.status(403).json({ message: `You don't have access to this ${itemType}` });
      return null;
    }
  } else {
    // For group files/folders, check permissions
    const userPermission = await storage.getUserPermissionForGroup(userId, item.groupId);

    if (!userPermission) {
      res.status(403).json({ message: `You don't have access to this ${itemType}` });
      return null;
    }

    if (userPermission !== "Edit") {
      res.status(403).json({ message: `You need edit permission to share this ${itemType}` });
      return null;
    }
  }

  return { item };
}

// Generate a public link
function generatePublicLink(baseUrl: string, token: string, itemType: string, itemId: number) {
  return `${baseUrl}/public/${itemType}/${itemId}/${token}`;
}

export function setupShareRoutes(app: Express) {
  // Get shares for a file
  app.get("/api/files/:id/shares", async (req, res, next) => {
    try {
      const fileId = Number(req.params.id);
      const validation = await validateSharePermission(req, res, 'file', fileId);
      
      if (!validation) return;

      // Get the shares from the database
      const shares = await storage.getFileShares(fileId);
      
      // Check if file has public link
      const publicLink = publicFileLinks.get(fileId);
      
      res.json({
        isPublic: !!publicLink,
        publicLink: publicLink?.link || null,
        users: shares
      });
    } catch (error) {
      next(error);
    }
  });

  // Get shares for a folder
  app.get("/api/folders/:id/shares", async (req, res, next) => {
    try {
      const folderId = Number(req.params.id);
      const validation = await validateSharePermission(req, res, 'folder', folderId);
      
      if (!validation) return;

      // Get the shares from the database
      const shares = await storage.getFolderShares(folderId);
      
      // Check if folder has public link
      const publicLink = publicFolderLinks.get(folderId);
      
      res.json({
        isPublic: !!publicLink,
        publicLink: publicLink?.link || null,
        users: shares
      });
    } catch (error) {
      next(error);
    }
  });

  // Add a share for a file
  app.post("/api/files/:id/shares", async (req, res, next) => {
    try {
      const fileId = Number(req.params.id);
      const validation = await validateSharePermission(req, res, 'file', fileId);
      
      if (!validation) return;

      // Validate input
      const result = shareItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const { userId, permission } = result.data;

      // Check if user exists
      const userToShare = await storage.getUser(userId);
      if (!userToShare) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add the share
      const share = await storage.addFileShare(fileId, userId, permission, req.user!.id);
      
      res.status(201).json({
        message: "Share added successfully",
        share
      });
    } catch (error) {
      next(error);
    }
  });

  // Add a share for a folder
  app.post("/api/folders/:id/shares", async (req, res, next) => {
    try {
      const folderId = Number(req.params.id);
      const validation = await validateSharePermission(req, res, 'folder', folderId);
      
      if (!validation) return;

      // Validate input
      const result = shareItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const { userId, permission } = result.data;

      // Check if user exists
      const userToShare = await storage.getUser(userId);
      if (!userToShare) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add the share
      const share = await storage.addFolderShare(folderId, userId, permission, req.user!.id);
      
      res.status(201).json({
        message: "Share added successfully",
        share
      });
    } catch (error) {
      next(error);
    }
  });

  // Update a file share
  app.patch("/api/files/:id/shares/:userId", async (req, res, next) => {
    try {
      const fileId = Number(req.params.id);
      const userId = Number(req.params.userId);
      
      const validation = await validateSharePermission(req, res, 'file', fileId);
      if (!validation) return;

      // Validate input
      const result = updateShareSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const { permission } = result.data;

      // Update the share
      const share = await storage.updateFileShare(fileId, userId, permission);
      
      res.json({
        message: "Share updated successfully",
        share
      });
    } catch (error) {
      next(error);
    }
  });

  // Update a folder share
  app.patch("/api/folders/:id/shares/:userId", async (req, res, next) => {
    try {
      const folderId = Number(req.params.id);
      const userId = Number(req.params.userId);
      
      const validation = await validateSharePermission(req, res, 'folder', folderId);
      if (!validation) return;

      // Validate input
      const result = updateShareSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const { permission } = result.data;

      // Update the share
      const share = await storage.updateFolderShare(folderId, userId, permission);
      
      res.json({
        message: "Share updated successfully",
        share
      });
    } catch (error) {
      next(error);
    }
  });

  // Remove a file share
  app.delete("/api/files/:id/shares/:userId", async (req, res, next) => {
    try {
      const fileId = Number(req.params.id);
      const userId = Number(req.params.userId);
      
      const validation = await validateSharePermission(req, res, 'file', fileId);
      if (!validation) return;

      // Remove the share
      await storage.removeFileShare(fileId, userId);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Remove a folder share
  app.delete("/api/folders/:id/shares/:userId", async (req, res, next) => {
    try {
      const folderId = Number(req.params.id);
      const userId = Number(req.params.userId);
      
      const validation = await validateSharePermission(req, res, 'folder', folderId);
      if (!validation) return;

      // Remove the share
      await storage.removeFolderShare(folderId, userId);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Toggle public access for a file
  app.patch("/api/files/:id/public", async (req, res, next) => {
    try {
      const fileId = Number(req.params.id);
      const validation = await validateSharePermission(req, res, 'file', fileId);
      
      if (!validation) return;
      const file = validation.item;

      // Validate input
      const result = publicAccessSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const { isPublic } = result.data;
      
      if (isPublic) {
        // Generate a token if it doesn't exist
        let token = "";
        if (!publicFileLinks.has(fileId)) {
          token = crypto.randomBytes(16).toString('hex');
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          const link = generatePublicLink(baseUrl, token, 'file', fileId);
          
          publicFileLinks.set(fileId, { token, link });
        } else {
          token = publicFileLinks.get(fileId)!.token;
        }
        
        // Update the file's public access status in the database
        await storage.setFilePublicAccess(fileId, true, token);
        
        res.json({
          isPublic: true,
          publicLink: publicFileLinks.get(fileId)?.link
        });
      } else {
        // Remove the public link
        publicFileLinks.delete(fileId);
        
        // Update the file's public access status in the database
        await storage.setFilePublicAccess(fileId, false);
        
        res.json({
          isPublic: false,
          publicLink: null
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Toggle public access for a folder
  app.patch("/api/folders/:id/public", async (req, res, next) => {
    try {
      const folderId = Number(req.params.id);
      const validation = await validateSharePermission(req, res, 'folder', folderId);
      
      if (!validation) return;
      const folder = validation.item;

      // Validate input
      const result = publicAccessSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const { isPublic } = result.data;
      
      if (isPublic) {
        // Generate a token if it doesn't exist
        if (!publicFolderLinks.has(folderId)) {
          const token = crypto.randomBytes(16).toString('hex');
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          const link = generatePublicLink(baseUrl, token, 'folder', folderId);
          
          publicFolderLinks.set(folderId, { token, link });
        }
        
        res.json({
          isPublic: true,
          publicLink: publicFolderLinks.get(folderId)?.link
        });
      } else {
        // Remove the public link
        publicFolderLinks.delete(folderId);
        
        res.json({
          isPublic: false,
          publicLink: null
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Public file access
  app.get("/api/public/file/:id/:token", async (req, res, next) => {
    try {
      const fileId = Number(req.params.id);
      const token = req.params.token;
      
      // Validate the token
      const filePublicData = publicFileLinks.get(fileId);
      if (!filePublicData || filePublicData.token !== token) {
        return res.status(404).send("File not found or link has expired");
      }
      
      // Get the file
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).send("File not found");
      }
      
      // Send the file
      res.download(file.path, file.name);
    } catch (error) {
      next(error);
    }
  });

  // Get all users (for sharing)
  app.get("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get all users
      const users = await storage.getAllUsers();
      
      // Don't send password hashes
      const safeUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }));
      
      res.json(safeUsers);
    } catch (error) {
      next(error);
    }
  });
}