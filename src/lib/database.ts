// Enhanced Database schema and management for KCAU University system
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In production, this should be hashed
  role: 'student' | 'lecturer';
  course?: string;
  yearOfAdmission?: number; // For students
  semester?: string; // Current semester for students
  year?: number; // Academic year for students
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
  year: number;
  enrolledStudents: string[]; // Student IDs
  pendingEnrollments: EnrollmentRequest[]; // Pending student requests
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
  attachments: AssignmentFile[];
  status: 'draft' | 'published' | 'closed';
  createdAt: Date;
}

export interface AssignmentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string; // For text files
  url?: string; // For binary files
  uploadedAt: Date;
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
  message?: string;
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
    this.loadFromStorage();
  }

  private initializeDefaultCourses() {
    // Initialize with KCAU courses
    this.courses = [
      {
        id: '1',
        name: 'Bachelor of Science in Gaming and Animation Technology',
        code: 'BGAT',
        description: 'Comprehensive program in game development and animation',
        department: 'School of Computing and Information Technology',
        createdAt: new Date()
      },
      {
        id: '2',
        name: 'Bachelor of Science In Data Science',
        code: 'BDS',
        description: 'Advanced program in data analytics and machine learning',
        department: 'School of Computing and Information Technology',
        createdAt: new Date()
      },
      {
        id: '3',
        name: 'Bachelor of Science in Information Security and Forensics',
        code: 'BISF',
        description: 'Specialized program in cybersecurity and digital forensics',
        department: 'School of Computing and Information Technology',
        createdAt: new Date()
      },
      {
        id: '4',
        name: 'Bachelor of Science in Software Development',
        code: 'BSD',
        description: 'Professional software development and engineering program',
        department: 'School of Computing and Information Technology',
        createdAt: new Date()
      },
      {
        id: '5',
        name: 'Bachelor of Science in Applied Computing',
        code: 'BAC',
        description: 'Practical computing applications and solutions',
        department: 'School of Computing and Information Technology',
        createdAt: new Date()
      }
    ];
  }

  private saveToStorage() {
    localStorage.setItem('kcau_users', JSON.stringify(this.users));
    localStorage.setItem('kcau_units', JSON.stringify(this.units));
    localStorage.setItem('kcau_groups', JSON.stringify(this.groups));
    localStorage.setItem('kcau_notifications', JSON.stringify(this.notifications));
    localStorage.setItem('kcau_enrollment_requests', JSON.stringify(this.enrollmentRequests));
  }

  private loadFromStorage() {
    try {
      const users = localStorage.getItem('kcau_users');
      const units = localStorage.getItem('kcau_units');
      const groups = localStorage.getItem('kcau_groups');
      const notifications = localStorage.getItem('kcau_notifications');
      const enrollmentRequests = localStorage.getItem('kcau_enrollment_requests');

      if (users) this.users = JSON.parse(users);
      if (units) this.units = JSON.parse(units);
      if (groups) this.groups = JSON.parse(groups);
      if (notifications) this.notifications = JSON.parse(notifications);
      if (enrollmentRequests) this.enrollmentRequests = JSON.parse(enrollmentRequests);
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
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
    console.log('Creating user with data:', userData);
    
    // Validate email format based on role
    if (userData.role === 'student') {
      const validation = this.validateStudentEmail(userData.email);
      if (!validation.isValid) {
        console.log('Student email validation failed:', validation.error);
        return { success: false, error: validation.error };
      }
      
      // Check if student email already exists
      if (this.users.find(u => u.email === userData.email)) {
        console.log('Student email already exists:', userData.email);
        return { success: false, error: 'A user with this email already exists' };
      }

      const newUser: User = {
        ...userData,
        id: uuidv4(),
        yearOfAdmission: validation.yearOfAdmission,
        createdAt: new Date(),
        isOnline: false,
        lastSeen: new Date(),
        isVerified: false
      };

      this.users.push(newUser);
      console.log('Created new student user:', newUser);
      this.saveToStorage();
      return { success: true, user: newUser };
      
    } else if (userData.role === 'lecturer') {
      const validation = this.validateLecturerEmail(userData.email);
      if (!validation.isValid) {
        console.log('Lecturer email validation failed:', validation.error);
        return { success: false, error: validation.error };
      }

      // Check if lecturer email already exists
      if (this.users.find(u => u.email === userData.email)) {
        console.log('Lecturer email already exists:', userData.email);
        return { success: false, error: 'A user with this email already exists' };
      }

      const newUser: User = {
        ...userData,
        id: uuidv4(),
        createdAt: new Date(),
        isOnline: false,
        lastSeen: new Date(),
        isVerified: false
      };

      this.users.push(newUser);
      console.log('Created new lecturer user:', newUser);
      this.saveToStorage();
      return { success: true, user: newUser };
    }

    console.log('Invalid user role provided:', userData.role);
    return { success: false, error: 'Invalid user role' };
  }

  async authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    console.log('Authenticating user with email:', email);
    const user = this.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      console.log('Authentication failed - user not found');
      return { success: false, error: 'Invalid email or password' };
    }

    // Update user online status
    user.isOnline = true;
    user.lastSeen = new Date();
    console.log('Authentication successful for user:', user);
    this.saveToStorage();

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
  async createUnit(unitData: Omit<Unit, 'id' | 'createdAt' | 'enrolledStudents' | 'assignments' | 'isActive' | 'pendingEnrollments'>): Promise<Unit> {
    const newUnit: Unit = {
      ...unitData,
      id: uuidv4(),
      enrolledStudents: [],
      pendingEnrollments: [],
      assignments: [],
      createdAt: new Date(),
      isActive: true
    };
    this.units.push(newUnit);
    this.saveToStorage();
    return newUnit;
  }

  // Assignment management methods
  async createAssignment(assignmentData: Omit<Assignment, 'id' | 'createdAt'>): Promise<Assignment> {
    const newAssignment: Assignment = {
      ...assignmentData,
      id: uuidv4(),
      createdAt: new Date()
    };
    
    // Add assignment to the unit
    const unit = this.units.find(u => u.id === assignmentData.unitId);
    if (unit) {
      unit.assignments.push(newAssignment);
      this.saveToStorage();
    }
    
    return newAssignment;
  }

  async getAssignmentsByUnit(unitId: string): Promise<Assignment[]> {
    const unit = this.units.find(u => u.id === unitId);
    return unit?.assignments || [];
  }

  async getAssignmentById(assignmentId: string): Promise<Assignment | null> {
    for (const unit of this.units) {
      const assignment = unit.assignments.find(a => a.id === assignmentId);
      if (assignment) return assignment;
    }
    return null;
  }

  async getUnits(): Promise<Unit[]> {
    return this.units.filter(u => u.isActive);
  }

  async getUnitById(id: string): Promise<Unit | null> {
    return this.units.find(u => u.id === id && u.isActive) || null;
  }

  async getUnitsByLecturer(lecturerId: string): Promise<Unit[]> {
    return this.units.filter(u => u.lecturerId === lecturerId && u.isActive);
  }

  async getUnitsByStudent(studentId: string): Promise<Unit[]> {
    console.log('Getting units for student:', studentId);
    
    // Add safety check for studentId
    if (!studentId) {
      console.log('No studentId provided');
      return [];
    }
    
    const studentUnits = this.units.filter(u => {
      if (!u || !u.isActive) return false;
      
      const hasEnrolledStudents = u.enrolledStudents && Array.isArray(u.enrolledStudents);
      const isEnrolled = hasEnrolledStudents && u.enrolledStudents.includes(studentId);
      console.log(`Unit ${u.code}: hasEnrolledStudents=${hasEnrolledStudents}, isEnrolled=${isEnrolled}`);
      return isEnrolled;
    });
    console.log('Student units found:', studentUnits);
    return studentUnits;
  }

  async getUnitsByCourse(courseId: string): Promise<Unit[]> {
    return this.units.filter(u => u.courseId === courseId && u.isActive);
  }

  async getAvailableUnitsForStudent(studentId: string): Promise<Unit[]> {
    const student = await this.getUser(studentId);
    console.log('Getting available units for student:', student);
    if (!student || student.role !== 'student') return [];

    // Filter units by course - make semester and year optional
    const availableUnits = this.units.filter(u => 
      u.isActive && 
      u.courseId === student.course &&
      (!u.enrolledStudents || !Array.isArray(u.enrolledStudents) || !u.enrolledStudents.includes(studentId))
    );
    console.log('Available units found:', availableUnits);
    return availableUnits;
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
      
      // Remove any pending enrollment request
      unit.pendingEnrollments = unit.pendingEnrollments.filter(req => req.studentId !== studentId);
      
      // Create notification for student
      await this.createNotification({
        userId: studentId,
        type: 'enrollment',
        title: 'Enrolled in Unit',
        message: `You have been enrolled in ${unit.code} - ${unit.name}`,
        read: false,
        priority: 'medium'
      });
      
      this.saveToStorage();
      return true;
    }
    return false;
  }

  async requestEnrollment(unitId: string, studentId: string, message?: string): Promise<{ success: boolean; error?: string }> {
    const unit = this.units.find(u => u.id === unitId);
    const student = this.users.find(u => u.id === studentId && u.role === 'student');
    
    if (!unit || !student) {
      return { success: false, error: 'Unit or student not found' };
    }

    // Check if already enrolled
    if (unit.enrolledStudents.includes(studentId)) {
      return { success: false, error: 'Already enrolled in this unit' };
    }

    // Check if request already exists
    if (unit.pendingEnrollments.find(req => req.studentId === studentId && req.status === 'pending')) {
      return { success: false, error: 'Enrollment request already pending' };
    }

    // Check if student is from the same course
    if (student.course !== unit.courseId) {
      return { success: false, error: 'You can only enroll in units for your course' };
    }

    const enrollmentRequest: EnrollmentRequest = {
      id: uuidv4(),
      studentId,
      unitId,
      status: 'pending',
      requestedAt: new Date(),
      message
    };

    unit.pendingEnrollments.push(enrollmentRequest);

    // Notify lecturer
    await this.createNotification({
      userId: unit.lecturerId,
      type: 'enrollment',
      title: 'New Enrollment Request',
      message: `${student.name} has requested to enroll in ${unit.code}`,
      read: false,
      priority: 'medium'
    });

    this.saveToStorage();
    return { success: true };
  }

  async processEnrollmentRequest(requestId: string, lecturerId: string, approve: boolean): Promise<{ success: boolean; error?: string }> {
    const unit = this.units.find(u => 
      u.lecturerId === lecturerId && 
      u.pendingEnrollments.find(req => req.id === requestId)
    );

    if (!unit) {
      return { success: false, error: 'Request not found or unauthorized' };
    }

    const requestIndex = unit.pendingEnrollments.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
      return { success: false, error: 'Request not found' };
    }

    const request = unit.pendingEnrollments[requestIndex];
    request.status = approve ? 'approved' : 'rejected';
    request.processedAt = new Date();
    request.processedBy = lecturerId;

    if (approve) {
      // Enroll the student
      unit.enrolledStudents.push(request.studentId);
    }

    // Notify student
    const student = await this.getUser(request.studentId);
    if (student) {
      await this.createNotification({
        userId: request.studentId,
        type: 'enrollment',
        title: approve ? 'Enrollment Approved' : 'Enrollment Rejected',
        message: approve 
          ? `Your enrollment request for ${unit.code} has been approved`
          : `Your enrollment request for ${unit.code} has been rejected`,
        read: false,
        priority: 'high'
      });
    }

    this.saveToStorage();
    return { success: true };
  }

  // Group management methods
  async createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'lastActivity' | 'courseId'>): Promise<Group> {
    // Get course ID from unit if unitId is provided
    let courseId = '';
    if (groupData.unitId) {
      const unit = await this.getUnitById(groupData.unitId);
      courseId = unit?.courseId || '';
    } else {
      // For general groups, get course from leader
      const leader = await this.getUser(groupData.leaderId);
      courseId = leader?.course || '';
    }

    const newGroup: Group = {
      ...groupData,
      courseId,
      id: uuidv4(),
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.groups.push(newGroup);
    this.saveToStorage();
    return newGroup;
  }

  async getGroups(): Promise<Group[]> {
    return this.groups;
  }

  async getGroupById(id: string): Promise<Group | null> {
    return this.groups.find(g => g.id === id) || null;
  }

  async getGroupsByUnit(unitId: string): Promise<Group[]> {
    return this.groups.filter(g => g.unitId === unitId);
  }

  async getGroupsByUnitIncludingGeneral(unitId: string): Promise<Group[]> {
    // Include both unit-specific groups and general groups from the same course
    const unit = await this.getUnitById(unitId);
    if (!unit) return [];
    
    return this.groups.filter(g => 
      g.unitId === unitId || (g.unitId === "" && g.courseId === unit.courseId)
    );
  }

  async getGroupsByStudent(studentId: string): Promise<Group[]> {
    console.log('Getting groups for student:', studentId);
    
    // Add safety check for studentId
    if (!studentId) {
      console.log('No studentId provided');
      return [];
    }
    
    const studentGroups = this.groups.filter(g => {
      if (!g || !g.members) return false;
      
      const hasMembers = g.members && Array.isArray(g.members);
      const isMember = hasMembers && g.members.some(member => member.userId === studentId);
      console.log(`Group ${g.name}: hasMembers=${hasMembers}, isMember=${isMember}`);
      return isMember;
    });
    console.log('Student groups found:', studentGroups);
    return studentGroups;
  }

  async getGroupsByLecturer(lecturerId: string): Promise<Group[]> {
    console.log('Getting groups for lecturer:', lecturerId);
    const lecturerUnits = await this.getUnitsByLecturer(lecturerId);
    const unitIds = lecturerUnits.map(u => u.id);
    const lecturerGroups = this.groups.filter(g => g.unitId && unitIds.includes(g.unitId));
    console.log('Lecturer groups found:', lecturerGroups);
    return lecturerGroups;
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
    this.saveToStorage();
    return { success: true };
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notifications.filter(n => n.userId === userId);
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      createdAt: new Date()
    };
    this.notifications.push(newNotification);
    this.saveToStorage();
    return newNotification;
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Unit deletion method
  async deleteUnit(unitId: string, lecturerId: string): Promise<{ success: boolean; error?: string }> {
    const unitIndex = this.units.findIndex(u => u.id === unitId && u.lecturerId === lecturerId);
    
    if (unitIndex === -1) {
      return { success: false, error: 'Unit not found or unauthorized' };
    }

    const unit = this.units[unitIndex];
    
    // Check if unit has enrolled students
    if (unit.enrolledStudents && unit.enrolledStudents.length > 0) {
      return { success: false, error: 'Cannot delete unit with enrolled students' };
    }

    // Check if unit has active groups
    const unitGroups = this.groups.filter(g => g.unitId === unitId);
    if (unitGroups.length > 0) {
      return { success: false, error: 'Cannot delete unit with active groups' };
    }

    // Remove the unit
    this.units.splice(unitIndex, 1);
    
    // Remove related notifications
    this.notifications = this.notifications.filter(n => 
      !(n.type === 'enrollment' && n.message.includes(unit.code))
    );
    
    this.saveToStorage();
    return { success: true };
  }

  // Delete group method
  async deleteGroup(groupId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const groupIndex = this.groups.findIndex(g => g.id === groupId);
    
    if (groupIndex === -1) {
      return { success: false, error: 'Group not found' };
    }

    const group = this.groups[groupIndex];
    
    // Check if user is the group leader or creator
    const isLeader = group.members.find(m => m.userId === userId && m.role === 'leader');
    const isCreator = group.createdById === userId;
    
    if (!isLeader && !isCreator) {
      return { success: false, error: 'Only group leaders can delete groups' };
    }

    // Check if group has active assignments or submissions
    if (group.currentAssignment) {
      return { success: false, error: 'Cannot delete group with active assignments' };
    }

    // Remove the group
    this.groups.splice(groupIndex, 1);
    
    // Notify all group members
    for (const member of group.members) {
      if (member.userId !== userId) {
        await this.createNotification({
          userId: member.userId,
          type: 'group',
          title: 'Group Deleted',
          message: `The group "${group.name}" has been deleted by the group leader`,
          read: false,
          priority: 'medium'
        });
      }
    }
    
    // Remove related notifications
    this.notifications = this.notifications.filter(n => 
      !(n.type === 'group' && n.message.includes(group.name))
    );
    
    this.saveToStorage();
    return { success: true };
  }

  // Leave group method
  async leaveGroup(groupId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const group = this.groups.find(g => g.id === groupId);
    
    if (!group) {
      return { success: false, error: 'Group not found' };
    }

    const memberIndex = group.members.findIndex(m => m.userId === userId);
    
    if (memberIndex === -1) {
      return { success: false, error: 'User is not a member of this group' };
    }

    const member = group.members[memberIndex];
    
    // Prevent leader from leaving (they should transfer leadership or delete group)
    if (member.role === 'leader') {
      return { success: false, error: 'Group leaders cannot leave. Transfer leadership or delete the group.' };
    }

    // Remove member from group
    group.members.splice(memberIndex, 1);
    group.lastActivity = new Date();
    
    // Notify remaining group members
    const user = await this.getUser(userId);
    for (const remainingMember of group.members) {
      await this.createNotification({
        userId: remainingMember.userId,
        type: 'group',
        title: 'Member Left Group',
        message: `${user?.name || 'A member'} has left the group "${group.name}"`,
        read: false,
        priority: 'low'
      });
    }
    
    this.saveToStorage();
    return { success: true };
  }

  // Search units by code
  async searchUnitsByCode(code: string, studentId: string): Promise<Unit[]> {
    const student = await this.getUser(studentId);
    if (!student || student.role !== 'student') return [];

    const searchTerm = code.toLowerCase().trim();
    if (!searchTerm) return [];

    return this.units.filter(u => 
      u.isActive && 
      u.code.toLowerCase().includes(searchTerm) &&
      u.courseId === student.course &&
      (!u.enrolledStudents || !u.enrolledStudents.includes(studentId)) &&
      !u.pendingEnrollments.find(req => req.studentId === studentId && req.status === 'pending')
    );
  }

  // Enhanced search - get all available units for student's course
  async getAllAvailableUnitsForStudent(studentId: string): Promise<Unit[]> {
    const student = await this.getUser(studentId);
    if (!student || student.role !== 'student') return [];

    return this.units.filter(u => 
      u.isActive && 
      u.courseId === student.course &&
      (!u.enrolledStudents || !Array.isArray(u.enrolledStudents) || !u.enrolledStudents.includes(studentId)) &&
      !u.pendingEnrollments.find(req => req.studentId === studentId && req.status === 'pending')
    );
  }

  // Allow students to create groups without unit enrollment (general groups)
  async createGeneralGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'lastActivity' | 'courseId' | 'unitId'>): Promise<Group> {
    // Get course ID from leader
    const leader = await this.getUser(groupData.leaderId);
    const courseId = leader?.course || '';

    const newGroup: Group = {
      ...groupData,
      unitId: '', // Empty for general groups
      courseId,
      id: uuidv4(),
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    this.groups.push(newGroup);
    this.saveToStorage();
    return newGroup;
  }
  // Get pending enrollment requests for lecturer
  async getPendingEnrollmentRequests(lecturerId: string): Promise<(EnrollmentRequest & { studentName: string; unitName: string })[]> {
    const lecturerUnits = this.units.filter(u => u.lecturerId === lecturerId);
    const allRequests: (EnrollmentRequest & { studentName: string; unitName: string })[] = [];

    for (const unit of lecturerUnits) {
      const pendingRequests = unit.pendingEnrollments.filter(req => req.status === 'pending');
      
      for (const request of pendingRequests) {
        const student = await this.getUser(request.studentId);
        if (student) {
          allRequests.push({
            ...request,
            studentName: student.name,
            unitName: `${unit.code} - ${unit.name}`
          });
        }
      }
    }

    return allRequests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
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

  // Save document content for persistence
  async saveDocument(documentId: string, content: string, version: number): Promise<boolean> {
    try {
      const documentData = {
        id: documentId,
        content,
        version,
        lastModified: new Date(),
        savedBy: 'user',
        groupId: documentId.includes('group-') ? documentId.split('-')[1] : null
      };
      
      localStorage.setItem(`document_${documentId}`, JSON.stringify(documentData));
      console.log(`Document ${documentId} saved successfully with version ${version}`);
      return true;
    } catch (error) {
      console.error('Failed to save document:', error);
      return false;
    }
  }

  // Load document content
  async loadDocument(documentId: string): Promise<{ content: string; version: number } | null> {
    try {
      const documentData = localStorage.getItem(`document_${documentId}`);
      if (documentData) {
        const parsed = JSON.parse(documentData);
        console.log(`Document ${documentId} loaded with version ${parsed.version || 0}`);
        return {
          content: parsed.content || "",
          version: parsed.version || 0
        };
      }
      console.log(`No saved document found for ${documentId}, returning empty content`);
      return { content: "", version: 0 };
    } catch (error) {
      console.error('Failed to load document:', error);
      return { content: "", version: 0 };
    }
  }
}

export const db = new KCAUDatabase();