// PostgreSQL Database Configuration
const { Pool } = require('pg');

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});
// Database connection configuration
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
const pool = new Pool({
// Function to initialize database tables
async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        description TEXT,
        department VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  user: process.env.DB_USER || 'unicollab_user',
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('student', 'lecturer')),
        course_id UUID REFERENCES courses(id),
        year_of_admission INTEGER,
        semester VARCHAR(50),
        avatar_url TEXT,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        is_verified BOOLEAN DEFAULT FALSE
      );
    `);
  host: process.env.DB_HOST || 'localhost',
    await pool.query(`
      CREATE TABLE IF NOT EXISTS units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        lecturer_id UUID REFERENCES users(id),
        course_id UUID REFERENCES courses(id),
        semester VARCHAR(50),
        credits INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  database: process.env.DB_NAME || 'unicollab_db',
    await pool.query(`
      CREATE TABLE IF NOT EXISTS unit_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id UUID REFERENCES units(id),
        student_id UUID REFERENCES users(id),
        enrolled_at TIMESTAMP DEFAULT NOW(),
        enrolled_by UUID REFERENCES users(id)
      );
    `);
  password: process.env.DB_PASSWORD || 'hakim97',
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        unit_id UUID REFERENCES units(id),
        course_id UUID REFERENCES courses(id),
        leader_id UUID REFERENCES users(id),
        max_members INTEGER DEFAULT 4,
        current_assignment_id UUID,
        created_by VARCHAR(20) CHECK (created_by IN ('lecturer', 'student')),
        created_by_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        last_activity TIMESTAMP DEFAULT NOW()
      );
    `);
  port: process.env.DB_PORT || 5433,
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES groups(id),
        user_id UUID REFERENCES users(id),
        role VARCHAR(20) CHECK (role IN ('leader', 'member')),
        joined_at TIMESTAMP DEFAULT NOW(),
        contributions INTEGER DEFAULT 0
      );
    `);
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}
  max: 20,
// Initialize database on startup
initializeDatabase();
  idleTimeoutMillis: 30000,
module.exports = pool;
  connectionTimeoutMillis: 2000,
});