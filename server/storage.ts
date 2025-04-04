import { 
  users, type User, type InsertUser,
  groups, type Group, type InsertGroup,
  groupMemberships, type GroupMembership, type InsertGroupMembership,
  files, type File, type InsertFile,
  folders, type Folder, type InsertFolder, 
  type Permission
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, isNull, inArray } from "drizzle-orm";
import session from "express-session";
import pgSession from "connect-pg-simple";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Group methods
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getAllGroups(): Promise<Group[]>;
  updateGroup(id: number, name: string): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;
  
  // Group membership methods
  addUserToGroup(membership: InsertGroupMembership): Promise<GroupMembership>;
  removeUserFromGroup(userId: number, groupId: number): Promise<boolean>;
  updateUserPermission(userId: number, groupId: number, permission: Permission): Promise<GroupMembership | undefined>;
  getGroupMembers(groupId: number): Promise<(GroupMembership & { user: User })[]>;
  getUserGroups(userId: number): Promise<(GroupMembership & { group: Group })[]>;
  getUserPermissionForGroup(userId: number, groupId: number): Promise<Permission | undefined>;
  
  // File methods
  createFile(file: InsertFile): Promise<File>;
  getFile(id: number): Promise<File | undefined>;
  getFilesByParent(parentId: number | null, groupId: number): Promise<File[]>;
  updateFile(id: number, name: string): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // Folder methods
  createFolder(folder: InsertFolder): Promise<Folder>;
  getFolder(id: number): Promise<Folder | undefined>;
  getFoldersByParent(parentId: number | null, groupId: number): Promise<Folder[]>;
  updateFolder(id: number, name: string): Promise<Folder | undefined>;
  deleteFolder(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any; // Using any to avoid SessionStore typing issues
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any for session store type
  
  constructor() {
    // Use PostgreSQL store for session data
    const PostgresStore = pgSession(session);
    this.sessionStore = new PostgresStore({
      pool: pool,
      createTableIfMissing: true
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    // Cast the role to the expected type
    const userRole = role as "User" | "Admin" | "SuperAdmin";
    const [user] = await db
      .update(users)
      .set({ role: userRole })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  // Group methods
  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }
  
  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }
  
  async getAllGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }
  
  async updateGroup(id: number, name: string): Promise<Group | undefined> {
    const [group] = await db
      .update(groups)
      .set({ name })
      .where(eq(groups.id, id))
      .returning();
    return group;
  }
  
  async deleteGroup(id: number): Promise<boolean> {
    const result = await db.delete(groups).where(eq(groups.id, id));
    return true;
  }
  
  // Group membership methods
  async addUserToGroup(membership: InsertGroupMembership): Promise<GroupMembership> {
    const [result] = await db.insert(groupMemberships).values(membership).returning();
    return result;
  }
  
  async removeUserFromGroup(userId: number, groupId: number): Promise<boolean> {
    await db
      .delete(groupMemberships)
      .where(
        and(
          eq(groupMemberships.userId, userId),
          eq(groupMemberships.groupId, groupId)
        )
      );
    return true;
  }
  
  async updateUserPermission(userId: number, groupId: number, permission: Permission): Promise<GroupMembership | undefined> {
    const [result] = await db
      .update(groupMemberships)
      .set({ permission })
      .where(
        and(
          eq(groupMemberships.userId, userId),
          eq(groupMemberships.groupId, groupId)
        )
      )
      .returning();
    return result;
  }
  
  async getGroupMembers(groupId: number): Promise<(GroupMembership & { user: User })[]> {
    const result = await db
      .select({
        membership: groupMemberships,
        user: users
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, groupId));
    
    return result.map(r => ({
      ...r.membership,
      user: r.user
    }));
  }
  
  async getUserGroups(userId: number): Promise<(GroupMembership & { group: Group })[]> {
    const result = await db
      .select({
        membership: groupMemberships,
        group: groups
      })
      .from(groupMemberships)
      .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
      .where(eq(groupMemberships.userId, userId));
    
    return result.map(r => ({
      ...r.membership,
      group: r.group
    }));
  }
  
  async getUserPermissionForGroup(userId: number, groupId: number): Promise<Permission | undefined> {
    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.userId, userId),
          eq(groupMemberships.groupId, groupId)
        )
      );
    
    return membership?.permission as Permission | undefined;
  }
  
  // File methods
  async createFile(file: InsertFile): Promise<File> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }
  
  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }
  
  async getFilesByParent(parentId: number | null, groupId: number): Promise<File[]> {
    if (parentId === null) {
      return await db
        .select()
        .from(files)
        .where(
          and(
            isNull(files.parentId),
            eq(files.groupId, groupId)
          )
        );
    } else {
      return await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.parentId, parentId),
            eq(files.groupId, groupId)
          )
        );
    }
  }
  
  async updateFile(id: number, name: string): Promise<File | undefined> {
    const [file] = await db
      .update(files)
      .set({ 
        name,
        updatedAt: new Date()
      })
      .where(eq(files.id, id))
      .returning();
    return file;
  }
  
  async deleteFile(id: number): Promise<boolean> {
    await db.delete(files).where(eq(files.id, id));
    return true;
  }
  
  // Folder methods
  async createFolder(folder: InsertFolder): Promise<Folder> {
    const [newFolder] = await db.insert(folders).values(folder).returning();
    return newFolder;
  }
  
  async getFolder(id: number): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder;
  }
  
  async getFoldersByParent(parentId: number | null, groupId: number): Promise<Folder[]> {
    if (parentId === null) {
      return await db
        .select()
        .from(folders)
        .where(
          and(
            isNull(folders.parentId),
            eq(folders.groupId, groupId)
          )
        );
    } else {
      return await db
        .select()
        .from(folders)
        .where(
          and(
            eq(folders.parentId, parentId),
            eq(folders.groupId, groupId)
          )
        );
    }
  }
  
  async updateFolder(id: number, name: string): Promise<Folder | undefined> {
    const [folder] = await db
      .update(folders)
      .set({ 
        name,
        updatedAt: new Date()
      })
      .where(eq(folders.id, id))
      .returning();
    return folder;
  }
  
  async deleteFolder(id: number): Promise<boolean> {
    await db.delete(folders).where(eq(folders.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
