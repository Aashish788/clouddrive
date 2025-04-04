import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { promisify } from "util";
import { File, Folder, Permission } from "@shared/schema";

const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Ensure the upload directory exists
const UPLOAD_DIR = path.join(import.meta.dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Define validation schemas
const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.number().nullable().optional(),
  groupId: z.number().nullable(),
});

const updateNameSchema = z.object({
  name: z.string().min(1).max(255),
});

// Middleware to ensure user has proper permissions for a group
async function checkGroupPermission(
  req: Request, 
  res: Response, 
  next: NextFunction, 
  groupId: number, 
  requiredPermission: Permission = "View"
) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const userId = req.user!.id;
  const userPermission = await storage.getUserPermissionForGroup(userId, groupId);
  
  if (!userPermission) {
    return res.status(403).json({ message: "You don't have access to this group" });
  }
  
  if (requiredPermission === "Edit" && userPermission !== "Edit") {
    return res.status(403).json({ message: "You need edit permission to perform this action" });
  }
  
  next();
}

export function setupFileRoutes(app: Express) {
  // Get personal files and folders
  app.get("/api/personal-files", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const parentId = req.query.parentId ? Number(req.query.parentId) : null;
      
      if (req.query.parentId && isNaN(Number(req.query.parentId))) {
        return res.status(400).json({ message: "Invalid parent ID" });
      }
      
      const userId = req.user!.id;
      
      // For personal files, we don't use groupId but we'll pass null
      // We need to modify the storage implementation to handle this case
      const files = await storage.getPersonalFilesByParent(parentId, userId);
      const folders = await storage.getPersonalFoldersByParent(parentId, userId);
      
      res.json({
        files,
        folders,
        permission: "Edit" // Personal files always have Edit permission
      });
    } catch (error) {
      next(error);
    }
  });
  // Get files and folders in a group or folder
  app.get("/api/files", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const groupId = Number(req.query.groupId);
      const parentId = req.query.parentId ? Number(req.query.parentId) : null;
      
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      if (req.query.parentId && isNaN(Number(req.query.parentId))) {
        return res.status(400).json({ message: "Invalid parent ID" });
      }
      
      // Check if user has access to this group
      const userId = req.user!.id;
      const userPermission = await storage.getUserPermissionForGroup(userId, groupId);
      
      if (!userPermission) {
        return res.status(403).json({ message: "You don't have access to this group" });
      }
      
      // Get files and folders
      const files = await storage.getFilesByParent(parentId, groupId);
      const folders = await storage.getFoldersByParent(parentId, groupId);
      
      res.json({
        files,
        folders,
        permission: userPermission
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Create a personal folder
  app.post("/api/personal-folders", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Validate input
      const folderSchema = z.object({
        name: z.string().min(1).max(255),
        parentId: z.number().nullable().optional(),
      });
      
      const result = folderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { name, parentId } = result.data;
      const userId = req.user!.id;
      
      // If parentId is provided, check if it exists and belongs to the user
      if (parentId) {
        const parentFolder = await storage.getFolder(parentId);
        if (!parentFolder) {
          return res.status(404).json({ message: "Parent folder not found" });
        }
        
        if (parentFolder.createdById !== userId || parentFolder.groupId !== null) {
          return res.status(403).json({ message: "You don't have access to this parent folder" });
        }
      }
      
      // Create the folder (with null groupId for personal folders)
      const newFolder = await storage.createFolder({
        name,
        parentId: parentId || null,
        groupId: null,
        createdById: userId
      });
      
      res.status(201).json(newFolder);
    } catch (error) {
      next(error);
    }
  });
  
  // Create a new folder
  app.post("/api/folders", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Validate input
      const result = createFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { name, parentId, groupId } = result.data;
      
      // Check if user has edit permissions for this group
      const userId = req.user!.id;
      
      // For group folders, check permissions
      if (groupId !== null) {
        const userPermission = await storage.getUserPermissionForGroup(userId, groupId);
        
        if (!userPermission) {
          return res.status(403).json({ message: "You don't have access to this group" });
        }
        
        if (userPermission !== "Edit") {
          return res.status(403).json({ message: "You need edit permission to create folders" });
        }
      }
      
      // If parentId is provided, check if it exists and belongs to the same group
      if (parentId) {
        const parentFolder = await storage.getFolder(parentId);
        if (!parentFolder) {
          return res.status(404).json({ message: "Parent folder not found" });
        }
        
        if (parentFolder.groupId !== groupId) {
          return res.status(400).json({ message: "Parent folder does not belong to the specified group" });
        }
      }
      
      // Create the folder
      const newFolder = await storage.createFolder({
        name,
        parentId: parentId || null,
        groupId,
        createdById: userId
      });
      
      res.status(201).json(newFolder);
    } catch (error) {
      next(error);
    }
  });
  
  // Rename a folder
  app.patch("/api/folders/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const folderId = Number(req.params.id);
      
      if (isNaN(folderId)) {
        return res.status(400).json({ message: "Invalid folder ID" });
      }
      
      // Validate input
      const result = updateNameSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { name } = result.data;
      
      // Get the folder
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      // Check if user has edit permissions for this group
      const userId = req.user!.id;
      
      // Check if this is a personal folder (null groupId)
      if (folder.groupId === null) {
        // For personal folders, check if the user is the creator
        if (folder.createdById !== userId) {
          return res.status(403).json({ message: "You don't have access to this folder" });
        }
      } else {
        // For group folders, check permissions
        const userPermission = await storage.getUserPermissionForGroup(userId, folder.groupId);
        
        if (!userPermission) {
          return res.status(403).json({ message: "You don't have access to this folder" });
        }
        
        if (userPermission !== "Edit") {
          return res.status(403).json({ message: "You need edit permission to rename folders" });
        }
      }
      
      // Update the folder
      const updatedFolder = await storage.updateFolder(folderId, name);
      
      res.json(updatedFolder);
    } catch (error) {
      next(error);
    }
  });
  
  // Delete a folder
  app.delete("/api/folders/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const folderId = Number(req.params.id);
      
      if (isNaN(folderId)) {
        return res.status(400).json({ message: "Invalid folder ID" });
      }
      
      // Get the folder
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      // Check if user has edit permissions for this group
      const userId = req.user!.id;
      
      // Check if this is a personal folder (null groupId)
      if (folder.groupId === null) {
        // For personal folders, check if the user is the creator
        if (folder.createdById !== userId) {
          return res.status(403).json({ message: "You don't have access to this folder" });
        }
      } else {
        // For group folders, check permissions
        const userPermission = await storage.getUserPermissionForGroup(userId, folder.groupId);
        
        if (!userPermission) {
          return res.status(403).json({ message: "You don't have access to this folder" });
        }
        
        if (userPermission !== "Edit") {
          return res.status(403).json({ message: "You need edit permission to delete folders" });
        }
      }
      
      // Delete the folder (in a real application, we would recursively delete all contents)
      await storage.deleteFolder(folderId);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  // Upload a personal file
  app.post("/api/personal-files", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // In a real application, this would use a multipart form parser like multer
      // For simplicity, we'll use JSON with base64 encoded data
      const { name, parentId, type, data } = req.body;
      
      if (!name || !type || !data) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const userId = req.user!.id;
      
      // If parentId is provided, check if it exists and belongs to the user
      if (parentId) {
        const parentFolder = await storage.getFolder(Number(parentId));
        if (!parentFolder) {
          return res.status(404).json({ message: "Parent folder not found" });
        }
        
        if (parentFolder.createdById !== userId || parentFolder.groupId !== null) {
          return res.status(403).json({ message: "You don't have access to this parent folder" });
        }
      }
      
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      
      // Decode and save the file
      const fileBuffer = Buffer.from(data, 'base64');
      await writeFileAsync(filePath, fileBuffer);
      
      // Calculate file size
      const size = fileBuffer.length;
      
      // Create the file record (with null groupId for personal files)
      const newFile = await storage.createFile({
        name,
        type,
        size,
        path: filePath,
        parentId: parentId ? Number(parentId) : null,
        groupId: null,
        uploadedById: userId
      });
      
      res.status(201).json(newFile);
    } catch (error) {
      next(error);
    }
  });
  
  // Upload a file
  app.post("/api/files", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // In a real application, this would use a multipart form parser like multer
      // For simplicity, we'll use JSON with base64 encoded data
      const { name, groupId, parentId, type, data } = req.body;
      
      if (!name || !groupId || !type || !data) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if user has edit permissions for this group
      const userId = req.user!.id;
      const userPermission = await storage.getUserPermissionForGroup(userId, Number(groupId));
      
      if (!userPermission) {
        return res.status(403).json({ message: "You don't have access to this group" });
      }
      
      if (userPermission !== "Edit") {
        return res.status(403).json({ message: "You need edit permission to upload files" });
      }
      
      // If parentId is provided, check if it exists and belongs to the same group
      if (parentId) {
        const parentFolder = await storage.getFolder(Number(parentId));
        if (!parentFolder) {
          return res.status(404).json({ message: "Parent folder not found" });
        }
        
        if (parentFolder.groupId !== Number(groupId)) {
          return res.status(400).json({ message: "Parent folder does not belong to the specified group" });
        }
      }
      
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      
      // Decode and save the file
      const fileBuffer = Buffer.from(data, 'base64');
      await writeFileAsync(filePath, fileBuffer);
      
      // Calculate file size
      const size = fileBuffer.length;
      
      // Create the file record
      const newFile = await storage.createFile({
        name,
        type,
        size,
        path: filePath,
        parentId: parentId ? Number(parentId) : null,
        groupId: Number(groupId),
        uploadedById: userId
      });
      
      res.status(201).json(newFile);
    } catch (error) {
      next(error);
    }
  });
  
  // Rename a file
  app.patch("/api/files/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const fileId = Number(req.params.id);
      
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      // Validate input
      const result = updateNameSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { name } = result.data;
      
      // Get the file
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if user has edit permissions for this group
      const userId = req.user!.id;
      
      // Check if this is a personal file (null groupId)
      if (file.groupId === null) {
        // For personal files, check if the user is the uploader
        if (file.uploadedById !== userId) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
      } else {
        // For group files, check permissions
        const userPermission = await storage.getUserPermissionForGroup(userId, file.groupId);
        
        if (!userPermission) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
        
        if (userPermission !== "Edit") {
          return res.status(403).json({ message: "You need edit permission to rename files" });
        }
      }
      
      // Update the file
      const updatedFile = await storage.updateFile(fileId, name);
      
      res.json(updatedFile);
    } catch (error) {
      next(error);
    }
  });
  
  // Delete a file
  app.delete("/api/files/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const fileId = Number(req.params.id);
      
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      // Get the file
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if user has edit permissions for this group
      const userId = req.user!.id;
      
      // Check if this is a personal file (null groupId)
      if (file.groupId === null) {
        // For personal files, check if the user is the uploader
        if (file.uploadedById !== userId) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
      } else {
        // For group files, check permissions
        const userPermission = await storage.getUserPermissionForGroup(userId, file.groupId);
        
        if (!userPermission) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
        
        if (userPermission !== "Edit") {
          return res.status(403).json({ message: "You need edit permission to delete files" });
        }
      }
      
      // Delete the file from the filesystem
      try {
        await unlinkAsync(file.path);
      } catch (err) {
        console.error("Error deleting file from filesystem:", err);
      }
      
      // Delete the file record
      await storage.deleteFile(fileId);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  // Download a file
  app.get("/api/files/:id/download", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const fileId = Number(req.params.id);
      
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      // Get the file
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if user has view permissions for this group
      const userId = req.user!.id;
      
      // Check if this is a personal file (null groupId)
      if (file.groupId === null) {
        // For personal files, check if the user is the uploader
        if (file.uploadedById !== userId) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
      } else {
        // For group files, check permissions
        const userPermission = await storage.getUserPermissionForGroup(userId, file.groupId);
        
        if (!userPermission) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
      }
      
      // Send the file
      res.download(file.path, file.name);
    } catch (error) {
      next(error);
    }
  });
}
