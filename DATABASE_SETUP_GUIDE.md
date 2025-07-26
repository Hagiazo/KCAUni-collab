# KCAU UniCollab Database Setup Guide

## Overview
This guide provides detailed instructions for setting up the database structure for the KCAU UniCollab application. The system uses a local JavaScript-based database that stores data in browser localStorage for development purposes.

## Database Structure

### 1. Users Table
Stores information about students and lecturers.

```typescript
interface User {
  id: string;                    // Unique identifier
  name: string;                  // Full name
  email: string;                 // KCAU email (validated format)
  password: string;              // Password (should be hashed in production)
  role: 'student' | 'lecturer';  // User role
  course?: string;               // Course ID (for students)
  yearOfAdmission?: number;      // Admission year (for students)
  avatar?: string;               // Profile picture URL
  isOnline: boolean;             // Online status
  lastSeen: Date;                // Last activity timestamp
  createdAt: Date;               // Account creation date
  isVerified: boolean;           // Email verification status
}
```

**Email Validation Rules:**
- Students: `YYNNNNN@students.kcau.ac.ke` (YY = admission year, NNNNN = student number)
- Lecturers: `NNNN@lecturer.kcau.ac.ke` (NNNN = 4-digit staff number)

### 2. Courses Table
Defines available courses at KCAU.

```typescript
interface Course {
  id: string;           // Unique identifier
  name: string;         // Course name
  code: string;         // Course code (e.g., "CS", "IT")
  description: string;  // Course description
  department: string;   // Department name
  createdAt: Date;      // Creation timestamp
}
```

### 3. Units Table
Academic units/subjects within courses.

```typescript
interface Unit {
  id: string;                // Unique identifier
  code: string;              // Unit code (e.g., "CS301")
  name: string;              // Unit name
  description: string;       // Unit description
  lecturerId: string;        // Teaching lecturer ID
  courseId: string;          // Parent course ID
  semester: string;          // Semester (e.g., "Fall 2024")
  credits: number;           // Credit hours
  enrolledStudents: string[]; // Array of student IDs
  assignments: Assignment[]; // Unit assignments
  createdAt: Date;           // Creation timestamp
  isActive: boolean;         // Active status
}
```

### 4. Groups Table
Student collaboration groups within units.

```typescript
interface Group {
  id: string;                    // Unique identifier
  name: string;                  // Group name
  description: string;           // Group description
  unitId: string;                // Parent unit ID
  courseId: string;              // Course ID (for validation)
  leaderId: string;              // Group leader ID
  members: GroupMember[];        // Group members
  maxMembers: number;            // Maximum allowed members
  currentAssignment?: string;    // Current assignment ID
  workspace: GroupWorkspace;     // Collaboration workspace
  createdAt: Date;               // Creation timestamp
  lastActivity: Date;            // Last activity timestamp
  createdBy: 'lecturer' | 'student'; // Creator type
  createdById: string;           // Creator ID
}
```

### 5. Group Members
Individual group membership records.

```typescript
interface GroupMember {
  userId: string;        // Student ID
  role: 'leader' | 'member'; // Role in group
  joinedAt: Date;        // Join timestamp
  contributions: number; // Contribution score
}
```

## Key Features Implemented

### 1. User Registration & Authentication
- **Email Validation**: Enforces KCAU email format
- **Role-based Registration**: Separate flows for students and lecturers
- **Course Selection**: Students must select their course during registration

### 2. Unit Management
- **Lecturer Unit Creation**: Lecturers can create units for their courses
- **Student Enrollment**: Lecturers can enroll students in their units
- **Course-based Filtering**: Only students from relevant courses can be enrolled

### 3. Group Management
- **Student Group Creation**: Students can create groups within their enrolled units
- **Lecturer Group Creation**: Lecturers can create groups and assign students
- **Access Control**: Only students from the same course and unit can join groups
- **Membership Validation**: Prevents unauthorized group access

### 4. Collaboration Features
- **Real-time Document Editing**: Collaborative text editing with version control
- **Group Chat**: Real-time messaging within groups
- **File Sharing**: Upload and share files with group members
- **Task Management**: Kanban-style task boards
- **Video Calls**: Integration with Google Meet
- **GitHub Integration**: Direct links to GitHub repositories

## Database Operations

### User Management
```typescript
// Create new user
const result = await db.createUser({
  name: "John Doe",
  email: "2507564@students.kcau.ac.ke",
  password: "hashedPassword",
  role: "student",
  course: "1" // Course ID
});

// Authenticate user
const auth = await db.authenticateUser(email, password);
```

### Unit Management
```typescript
// Create unit (lecturer only)
const unit = await db.createUnit({
  code: "CS301",
  name: "Database Systems",
  description: "Introduction to databases",
  lecturerId: "lecturer123",
  courseId: "1",
  semester: "Fall 2024",
  credits: 3
});

// Enroll student in unit
await db.enrollStudentInUnit(unitId, studentId, lecturerId);
```

### Group Management
```typescript
// Create group
const group = await db.createGroup({
  name: "Team Alpha",
  description: "Database project team",
  unitId: "unit123",
  courseId: "1",
  leaderId: "student123",
  members: [{ userId: "student123", role: "leader", joinedAt: new Date(), contributions: 0 }],
  maxMembers: 4,
  workspace: { documents: [], chatMessages: [], tasks: [], files: [], submissions: [], meetingHistory: [] },
  createdBy: "student",
  createdById: "student123"
});

// Join group
await db.joinGroup(groupId, studentId);
```

## Access Control Rules

### 1. Unit Access
- Students can only see units they are enrolled in
- Lecturers can only see units they created
- Only lecturers can enroll students in units

### 2. Group Access
- Students can only join groups in units they are enrolled in
- Students must be from the same course as the group
- Group workspace is only accessible to group members

### 3. Course Restrictions
- Students can only interact with others from their course
- Cross-course collaboration is not permitted
- Lecturers can teach multiple courses

## Data Persistence

The current implementation uses browser localStorage for data persistence:

```typescript
// Data is automatically saved to localStorage
// Keys used:
// - "kcau_users" - User data
// - "kcau_units" - Unit data  
// - "kcau_groups" - Group data
// - "kcau_courses" - Course data
// - "kcau_notifications" - Notifications
```

## Migration to Production Database

For production deployment, replace the localStorage implementation with:

1. **PostgreSQL** (Recommended)
2. **MySQL**
3. **MongoDB**
4. **SQLite** (for smaller deployments)

### Sample SQL Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('student', 'lecturer')),
    course_id UUID REFERENCES courses(id),
    year_of_admission INTEGER,
    avatar_url TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    description TEXT,
    department VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Units table
CREATE TABLE units (
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

-- Unit enrollments
CREATE TABLE unit_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id),
    student_id UUID REFERENCES users(id),
    enrolled_at TIMESTAMP DEFAULT NOW(),
    enrolled_by UUID REFERENCES users(id)
);

-- Groups table
CREATE TABLE groups (
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

-- Group members
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    contributions INTEGER DEFAULT 0
);
```

## Security Considerations

1. **Password Hashing**: Use bcrypt or similar for password hashing
2. **Input Validation**: Validate all user inputs
3. **SQL Injection Prevention**: Use parameterized queries
4. **Access Control**: Implement proper authorization checks
5. **Email Verification**: Verify KCAU email addresses
6. **Rate Limiting**: Prevent abuse of registration/login endpoints

## Backup and Recovery

1. **Regular Backups**: Schedule daily database backups
2. **Point-in-time Recovery**: Enable transaction log backups
3. **Testing**: Regularly test backup restoration procedures
4. **Monitoring**: Monitor database performance and health

This database structure provides a solid foundation for the KCAU UniCollab system with proper access controls, data integrity, and scalability considerations.