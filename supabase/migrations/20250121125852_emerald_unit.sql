/*
  # Initial Schema Setup for Order Management System

  1. Tables
    - profiles
      - id (uuid, references auth.users)
      - full_name (text)
      - department (text)
      - role (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - orders
      - id (uuid)
      - title (text)
      - description (text)
      - submitted_by (uuid, references profiles)
      - submitted_at (timestamp)
      - status (text)
      - document_path (text)
      - department (text)
      - notes (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - signatures
      - id (uuid)
      - order_id (uuid, references orders)
      - user_id (uuid, references profiles)
      - signature_data (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for each table based on user roles
*/

-- Drop existing types if they exist
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS order_status;

-- Create custom types
CREATE TYPE user_role AS ENUM ('staff', 'director', 'secretary', 'responsible');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'approved', 'rejected');

-- Drop existing tables (if you want to start fresh)
DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS profiles;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'director', 'secretary', 'responsible')),
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  document_path TEXT NOT NULL,
  department TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create signatures table
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  signature_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now drop existing policies after tables exist
DROP POLICY IF EXISTS "Documents are accessible to authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Orders are viewable by authenticated users" ON orders;
DROP POLICY IF EXISTS "Staff can create orders" ON orders;
DROP POLICY IF EXISTS "Signatures are viewable by authenticated users" ON signatures;
DROP POLICY IF EXISTS "Authorized roles can create signatures" ON signatures;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_order_status_trigger ON signatures;
DROP FUNCTION IF EXISTS update_order_status();

-- Create storage bucket
INSERT INTO storage.buckets (id, name) 
VALUES ('documents', 'documents') 
ON CONFLICT DO NOTHING;

-- Set up storage policies
CREATE POLICY "Documents are accessible to authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Staff can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'staff'
  )
);

-- Set up RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- Profiles policies (update these)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Make profiles accessible to all authenticated users
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Allow anyone to create their profile during signup
CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Orders policies
CREATE POLICY "Orders are viewable by authenticated users"
ON orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'staff'
  )
);

-- Signatures policies
CREATE POLICY "Signatures are viewable by authenticated users"
ON signatures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authorized roles can create signatures"
ON signatures FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('director', 'secretary', 'responsible')
  )
);

-- Create function to update order status based on signatures
CREATE OR REPLACE FUNCTION update_order_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update order status based on number of signatures
  UPDATE orders
  SET status = CASE
    WHEN (
      SELECT COUNT(*)
      FROM signatures
      WHERE order_id = NEW.order_id
    ) >= 2 THEN 'approved'::order_status
    ELSE 'processing'::order_status
  END
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update order status
CREATE TRIGGER update_order_status_trigger
AFTER INSERT ON signatures
FOR EACH ROW
EXECUTE FUNCTION update_order_status();

-- Add this near the top of your migration file
CREATE OR REPLACE FUNCTION create_profile(
  user_id UUID,
  full_name TEXT,
  user_role TEXT,
  user_department TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, department)
  VALUES (user_id, full_name, user_role, user_department);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;