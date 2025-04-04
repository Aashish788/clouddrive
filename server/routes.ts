import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupFileRoutes } from "./fileRoutes";
import { setupGroupRoutes } from "./groupRoutes";
import { setupAdminRoutes } from "./adminRoutes";
import { setupShareRoutes } from "./shareRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Set up file and folder routes
  setupFileRoutes(app);
  
  // Set up group routes
  setupGroupRoutes(app);
  
  // Set up admin routes
  setupAdminRoutes(app);
  
  // Set up sharing routes
  setupShareRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
