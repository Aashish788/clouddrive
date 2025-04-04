import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export type UserRole = "User" | "Admin" | "SuperAdmin";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["User", "Admin", "SuperAdmin"] }).notNull().default("User"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Permissions
export type Permission = "View" | "Edit";

// Group memberships (users in groups with permissions)
export const groupMemberships = pgTable("group_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
  permission: text("permission", { enum: ["View", "Edit"] }).notNull().default("View"),
  addedById: integer("added_by_id").references(() => users.id),
  addedAt: timestamp("added_at").defaultNow(),
});

// Folders table - define first to avoid circular reference
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  groupId: integer("group_id").notNull().references(() => groups.id),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add self-reference for folders by using a proper drizzle-orm relation pattern
// This is handled in the folderRelations below

// Files table
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  parentId: integer("parent_id").references(() => folders.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isPublic: boolean("is_public").default(false),
  publicToken: text("public_token"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  role: true,
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  createdById: true,
});

export const insertGroupMembershipSchema = createInsertSchema(groupMemberships).pick({
  userId: true,
  groupId: true,
  permission: true,
  addedById: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  type: true,
  size: true,
  path: true,
  parentId: true,
  groupId: true,
  uploadedById: true,
});

export const insertFolderSchema = createInsertSchema(folders).pick({
  name: true,
  parentId: true,
  groupId: true,
  createdById: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;
export type GroupMembership = typeof groupMemberships.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;

// Relations
export const userRelations = {
  groupMemberships: {
    from: users,
    through: groupMemberships,
    to: groups,
  },
};

export const groupRelations = {
  members: {
    from: groups,
    through: groupMemberships,
    to: users,
  },
  files: {
    from: groups,
    to: files,
    relation: "one-to-many",
  },
  folders: {
    from: groups,
    to: folders,
    relation: "one-to-many",
  },
};

// File shares table
export const fileShares = pgTable("file_shares", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => files.id),
  userId: integer("user_id").notNull().references(() => users.id),
  permission: text("permission", { enum: ["View", "Edit"] }).notNull().default("View"),
  sharedById: integer("shared_by_id").notNull().references(() => users.id),
  sharedAt: timestamp("shared_at").defaultNow(),
});

// Folder shares table
export const folderShares = pgTable("folder_shares", {
  id: serial("id").primaryKey(),
  folderId: integer("folder_id").notNull().references(() => folders.id),
  userId: integer("user_id").notNull().references(() => users.id),
  permission: text("permission", { enum: ["View", "Edit"] }).notNull().default("View"),
  sharedById: integer("shared_by_id").notNull().references(() => users.id),
  sharedAt: timestamp("shared_at").defaultNow(),
});

// Insert schemas for shares
export const insertFileShareSchema = createInsertSchema(fileShares).pick({
  fileId: true,
  userId: true,
  permission: true,
  sharedById: true,
});

export const insertFolderShareSchema = createInsertSchema(folderShares).pick({
  folderId: true,
  userId: true,
  permission: true,
  sharedById: true,
});

// Type definitions for shares
export type InsertFileShare = z.infer<typeof insertFileShareSchema>;
export type FileShare = typeof fileShares.$inferSelect;

export type InsertFolderShare = z.infer<typeof insertFolderShareSchema>;
export type FolderShare = typeof folderShares.$inferSelect;

// Folder relations including self-reference to handle parent/child structure
export const folderRelations = {
  parent: {
    relationName: "folder_to_parent",
    columns: [folders.parentId],
    references: () => [folders.id],
  },
  children: {
    relationName: "folder_to_children",
    columns: [folders.id],
    references: () => [folders.parentId],
  },
  group: {
    columns: [folders.groupId],
    references: () => [groups.id],
  },
  creator: {
    columns: [folders.createdById],
    references: () => [users.id],
  },
};
