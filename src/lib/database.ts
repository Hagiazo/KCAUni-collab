// Enhanced Database schema and management for KCAU University system
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In production, this should be hashed
  role: 'student' | 'lecturer';
  course?: string;
  yearOfAdmission?: number; // For students
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  isVerified: boolean;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  department: string;
  createdAt: Date;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  description: string;
  lecturerId: string;
  courseId: string;
  semester: string;
  credits: number;
  enrolledStudents: string[]; // Student IDs
  assignments: Assignment[];
  createdAt: Date;
  isActive: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  unitId: string;
  type: 'individual' | 'group';
  dueDate: Date;
  maxMarks: number;
  instructions: string;
  attachments: string[];
  status: 'draft' | 'published' | 'closed';
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  unitId: string;
  courseId: string; // Ensure students are from same course
  leaderId: string;
  members: GroupMember[];
  maxMembers: number;
  currentAssignment?: string;
  workspace: GroupWorkspace;
  createdAt: Date;
  lastActivity: Date;
  createdBy: 'lecturer' | 'student'; // Track who created the group
  createdById: string;
}

export interface GroupMember {
  userId: string;
  role: 'leader' | 'member';
  joinedAt: Date;
  contributions: number;
}

export interface GroupWorkspace {
  documents: Document[];
  chatMessages: ChatMessage[];
  tasks: Task[];
  files: FileAttachment[];
  submissions: Submission[];
  githubRepo?: string;
  meetingHistory: Meeting[];
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'code' | 'text';
  language?: string;
  lastEditedBy: string;
  lastEditedAt: Date;
  version: number;
  collaborators: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  type: 'text' | 'file' | 'system';
  timestamp: Date;
  edited?: boolean;
  replyTo?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  createdBy: string;
  createdAt: Date;
  comments: TaskComment[];
}

export interface TaskComment {
  id: string;
  userId: string;
  comment: string;
  timestamp: Date;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  groupId: string;
  files: FileAttachment[];
  comments: string;
  submittedAt: Date;
  submittedBy: string;
  status: 'submitted' | 'graded' | 'returned';
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
}

export interface Meeting {
  id: string;
  title: string;
  scheduledAt: Date;
  duration: number;
  participants: string[];
  recordingUrl?: string;
  notes?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

export interface Notification {
  id: string;
  userId: string;
  type: 'assignment' | 'submission' | 'grade' | 'group' | 'meeting' | 'system' | 'enrollment';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface EnrollmentRequest {
  id: string;
  studentId: string;
  unitId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
}

// Enhanced Database class with proper user management
class KCAUDatabase {
  private users: User[] = [];
  private courses: Course[] = [];
  private units: Unit[] = [];
  private groups: Group[] = [];
  private notifications: Notification[] = [];
  private enrollmentRequests: EnrollmentRequest[] = [];

  constructor() {
    this.initializeDefaultCourses();
  }

  private initializeDefaultCourses() {
    // Initialize with KCAU courses
    this.courses = [
      {
        id: '1',
        name: 'Computer Science',
        code: 'CS',
        description: 'Bachelor of Science in Computer Science',
        department: 'School of Computing and Information Technology',
        createdAt: new Date()
      },
      {
        id: '2',
        name: 'Information Technology',
        code: 'IT',
        description: 'Bachelor of Science in Information Technology',
        department: 'School of Computing and Information Technology',
        createdAt: new Date()
      },
      {
        id: '3',
        name: 'Software Engineering',
        code: 'SE',
        description: 'Bachelor of Science in Software Engineering',
        department: 'School of Computing and Information Technology',
        createdAt: new Date()
      },
      {
        id: '4',
        name: 'Business Administration',
        code: 'BA',
        description: 'Bachelor of Business Administration',
        department: 'School of Business',
        createdAt: new Date()
      },
      {
        id: '5',
        name: 'Accounting',
        code: 'ACC',
        description: 'Bachelor of Commerce in Accounting',
        department: 'School of Business',
        createdAt: new Date()
      }
    ];
  }

  // Email validation functions
  validateStudentEmail(email: string): { isValid: boolean; yearOfAdmission?: number; error?: string } {
    const studentEmailRegex = /^(\d{2})(\d{5})@students\.kcau\.ac\.ke$/;
    const match = email.match(studentEmailRegex);
    
    if (!match) {
      return { 
        isValid: false, 
        error: 'Student email must be in format: YYNNNNN@students.kcau.ac.ke (YY = year, NNNNN = student number)' 
      };
    }

    const yearDigits = parseInt(match[1]);
    const currentYear = new Date().getFullYear();
    const currentYearDigits = currentYear % 100;
    
    // Allow years from 2020 to current year + 1
    const minYear = 20; // 2020
    const maxYear = (currentYear + 1) % 100;
    
    if (yearDigits < minYear || yearDigits > maxYear) {
      return { 
        isValid: false, 
        error: `Invalid admission year. Year must be between 20${minYear} and 20${maxYear}` 
      };
    }

    const yearOfAdmission = yearDigits > 50 ? 1900 + yearDigits : 2000 + yearDigits;
    
    return { isValid: true, yearOfAdmission };
  }

  validateLecturerEmail(email: string): { isValid: boolean; error?: string } {
    const lecturerEmailRegex = /^\d{4}@lecturer\.kcau\.ac\.ke$/;
    
    if (!lecturerEmailRegex.test(email)) {
      return { 
        isValid: false, 
        error: 'Lecturer email must be in format: NNNN@lecturer.kcau.ac.ke (NNNN = 4-digit number)' 
      };
    }

    return { isValid: true };
  }

  // User management methods
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'isOnline' | 'lastSeen' | 'isVerified'>): Promise<{ success: boolean; user?: User; error?: string }> {
    // Validate email format based on role
    if (userData.role === 'student') {
      const validation = this.validateStudentEmail(userData.email);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }
      
      // Check if student email already exists
      if (this.users.find(u => u.email === userData.email)) {
        return { success: false, error: 'A user with this email already exists' };
      }

      const newUser: User = {
        ...userData,
        id: Date.now().toString(),
        yearOfAdmission: validation.yearOfAdmission,
        createdAt: new Date(),
        isOnline: false,
        lastSeen: new Date(),
        isVerified: false
      };

      this.users.push(newUser);
      return { success: true, user: newUser };
      
    } else if (userData.role === 'lecturer') {
      const validation = this.validateLecturerEmail(userData.email);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Check if lecturer email already exists
      if (this.users.find(u => u.email === userData.email)) {
        return { success: false, error: 'A user with this email already exists' };
      }

      const newUser: User = {
        ...userData,
        id: Date.now().toString(),
        createdAt: new Date(),
        isOnline: false,
        lastSeen: new Date(),
        isVerified: false
      };

      this.users.push(newUser);
      return { success: true, user: newUser };
    }

    return { success: false, error: 'Invalid user role' };
  }

  async authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const user = this.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update user online status
    user.isOnline = true;
    user.lastSeen = new Date();

    return { success: true, user };
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  // Course management
  async getCourses(): Promise<Course[]> {
    return this.courses;
  }

  async getCourseById(id: string): Promise<Course | null> {
    return this.courses.find(c => c.id === id) || null;
  }

  // Unit management methods
  async createUnit(unitData: Omit<Unit, 'id' | 'createdAt' | 'enrolledStudents' | 'assignments' | 'isActive'>): Promise<Unit> {
    const newUnit: Unit = {
      ...unitData,
      id: Date.now().toString(),
      enrolledStudents: [],
      assignments: [],
      createdAt: new Date(),
      isActive: true
    };
    this.units.push(newUnit);
    return newUnit;
  }

  async getUnits(): Promise<Unit[]> {
    return this.units.filter(u => u.isActive);
  }

  async getUnitsByLecturer(lecturerId: string): Promise<Unit[]> {
    return this.units.filter(u => u.lecturerId === lecturerId && u.isActive);
  }

  async getUnitsByStudent(studentId: string): Promise<Unit[]> {
    return this.units.filter(u => u.enrolledStudents.includes(studentId) && u.isActive);
  }

  async getUnitsByCourse(courseId: string): Promise<Unit[]> {
    return this.units.filter(u => u.courseId === courseId && u.isActive);
  }

  // Student enrollment methods
  async getStudentsByCourse(courseId: string): Promise<User[]> {
    return this.users.filter(u => u.role === 'student' && u.course === courseId);
  }

  async getStudentsInUnit(unitId: string): Promise<User[]> {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit) return [];
    
    return this.users.filter(u => unit.enrolledStudents.includes(u.id));
  }

  async enrollStudentInUnit(unitId: string, studentId: string, enrolledBy: string): Promise<boolean> {
    const unit = this.units.find(u => u.id === unitId);
    const student = this.users.find(u => u.id === studentId && u.role === 'student');
    
    if (!unit || !student) return false;
    
    if (!unit.enrolledStudents.includes(studentId)) {
      unit.enrolledStudents.push(studentId);
      
      // Create notification for student
      await this.createNotification({
        userId: studentId,
        type: 'enrollment',
        title: 'Enrolled in Unit',
        message: `You have been enrolled in ${unit.code} - ${unit.name}`,
        read: false,
        priority: 'medium'
      });
      
      return true;
    }
    return false;
  }

  async removeStudentFromUnit(unitId: string, studentId: string): Promise<boolean> {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit) return false;
    
    const index = unit.enrolledStudents.indexOf(studentId);
    if (index > -1) {
      unit.enrolledStudents.splice(index, 1);
      return true;
    }
    return false;
  }

  // Group management methods
  async createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'lastActivity'>): Promise<Group> {
    const newGroup: Group = {
      ...groupData,
      id: Date.now().toString(),
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.groups.push(newGroup);
    return newGroup;
  }

  async getGroups(): Promise<Group[]> {
    return this.groups;
  }

  async getGroupsByUnit(unitId: string): Promise<Group[]> {
    return this.groups.filter(g => g.unitId === unitId);
  }

  async getGroupsByStudent(studentId: string): Promise<Group[]> {
    return this.groups.filter(g => 
      g.members.some(member => member.userId === studentId)
    );
  }

  async getGroupsByLecturer(lecturerId: string): Promise<Group[]> {
    const lecturerUnits = await this.getUnitsByLecturer(lecturerId);
    const unitIds = lecturerUnits.map(u => u.id);
    return this.groups.filter(g => unitIds.includes(g.unitId));
  }

  async joinGroup(groupId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const group = this.groups.find(g => g.id === groupId);
    const user = this.users.find(u => u.id === userId);
    
    if (!group || !user) {
      return { success: false, error: 'Group or user not found' };
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return { success: false, error: 'Group is full' };
    }

    // Check if user is already a member
    if (group.members.find(m => m.userId === userId)) {
      return { success: false, error: 'User is already a member of this group' };
    }

    // Check if user is enrolled in the same unit
    const unit = this.units.find(u => u.id === group.unitId);
    if (!unit || !unit.enrolledStudents.includes(userId)) {
      return { success: false, error: 'User must be enrolled in the unit to join this group' };
    }

    // Check if user is from the same course
    if (user.course !== group.courseId) {
      return { success: false, error: 'User must be from the same course to join this group' };
    }

    group.members.push({
      userId,
      role: 'member',
      joinedAt: new Date(),
      contributions: 0
    });
    
    group.lastActivity = new Date();
    return { success: true };
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notifications.filter(n => n.userId === userId);
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    this.notifications.push(newNotification);
    return newNotification;
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  // Get all users (for admin purposes)
  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  // Get students by course for lecturer
  async getStudentsByCourseForUnit(courseId: string, unitId: string): Promise<User[]> {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit) return [];
    
    // Get all students from the same course who are not yet enrolled in this unit
    return this.users.filter(u => 
      u.role === 'student' && 
      u.course === courseId &&
      !unit.enrolledStudents.includes(u.id)
    );
  }

  // Check if students can create group together (same course and unit)
  async canStudentsCreateGroup(studentIds: string[], unitId: string): Promise<{ canCreate: boolean; error?: string }> {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit) {
      return { canCreate: false, error: 'Unit not found' };
    }

    const students = this.users.filter(u => studentIds.includes(u.id) && u.role === 'student');
    
    if (students.length !== studentIds.length) {
      return { canCreate: false, error: 'Some users are not valid students' };
    }

    // Check if all students are enrolled in the unit
    const notEnrolled = students.filter(s => !unit.enrolledStudents.includes(s.id));
    if (notEnrolled.length > 0) {
      return { canCreate: false, error: 'All students must be enrolled in the unit' };
    }

    // Check if all students are from the same course
    const courses = [...new Set(students.map(s => s.course))];
    if (courses.length > 1) {
      return { canCreate: false, error: 'All students must be from the same course' };
    }

    return { canCreate: true };
  }
}

export const db = new KCAUDatabase();