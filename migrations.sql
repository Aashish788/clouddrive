-- Add isPublic and publicToken to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS public_token TEXT;

-- Create file_shares table
CREATE TABLE IF NOT EXISTS file_shares (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'View' CHECK (permission IN ('View', 'Edit')),
  shared_by_id INTEGER NOT NULL REFERENCES users(id),
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create folder_shares table
CREATE TABLE IF NOT EXISTS folder_shares (
  id SERIAL PRIMARY KEY,
  folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'View' CHECK (permission IN ('View', 'Edit')),
  shared_by_id INTEGER NOT NULL REFERENCES users(id),
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraints to prevent duplicate shares
CREATE UNIQUE INDEX IF NOT EXISTS file_share_unique_idx ON file_shares (file_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS folder_share_unique_idx ON folder_shares (folder_id, user_id);