// filepath: /home/aashish/Desktop/CloudVault (2)./CloudVault/server/run-migrations.ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { pool } from './db';

// Load environment variables
dotenv.config();

async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Read the SQL file
    const migrationsPath = path.join(process.cwd(), 'migrations.sql');
    const sql = fs.readFileSync(migrationsPath, 'utf8');

    console.log('Running SQL migrations...');
    
    // Execute the SQL commands
    await pool.query(sql);
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the migrations
runMigrations();