// Database schema and mock data management
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer';
  course?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  description: string;
  lecturerId: string;
  course: string;
  semester: string;
  credits: number;
  enrolledStudents: string[];
  assignments: Assignment[];
  createdAt: Date;
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
  leaderId: string;
  members: GroupMember[];
  maxMembers: number;
  currentAssignment?: string;
  workspace: GroupWorkspace;
  createdAt: Date;
  lastActivity: Date;
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
  type: 'assignment' | 'submission' | 'grade' | 'group' | 'meeting' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

// Mock database class
class MockDatabase {
  private users: User[] = [];
  private units: Unit[] = [];
  private groups: Group[] = [];
  private notifications: Notification[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize with sample data
    this.users = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@university.edu',
        role: 'student',
        course: 'Computer Science',
        isOnline: true,
        lastSeen: new Date()
      },
      {
        id: '2',
        name: 'Dr. Jane Smith',
        email: 'jane.smith@university.edu',
        role: 'lecturer',
        isOnline: true,
        lastSeen: new Date()
      }
    ];

    this.units = [
      {
        id: '1',
        code: 'CS301',
        name: 'Database Systems',
        description: 'Introduction to database design and management',
        lecturerId: '2',
        course: 'Computer Science',
        semester: 'Fall 2024',
        credits: 3,
        enrolledStudents: ['1'],
        assignments: [],
        createdAt: new Date()
      }
    ];
  }

  // User methods
  async getUser(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: Date.now().toString()
    };
    this.users.push(newUser);
    return newUser;
  }

  // Unit methods
  async getUnits(): Promise<Unit[]> {
    return this.units;
  }

  async getUnitsByLecturer(lecturerId: string): Promise<Unit[]> {
    return this.units.filter(u => u.lecturerId === lecturerId);
  }

  async getUnitsByStudent(studentId: string): Promise<Unit[]> {
    return this.units.filter(u => u.enrolledStudents.includes(studentId));
  }

  async createUnit(unit: Omit<Unit, 'id' | 'createdAt'>): Promise<Unit> {
    const newUnit: Unit = {
      ...unit,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    this.units.push(newUnit);
    return newUnit;
  }

  async enrollStudent(unitId: string, studentId: string): Promise<boolean> {
    const unit = this.units.find(u => u.id === unitId);
    if (unit && !unit.enrolledStudents.includes(studentId)) {
      unit.enrolledStudents.push(studentId);
      return true;
    }
    return false;
  }

  // Group methods
  async getGroups(): Promise<Group[]> {
    return this.groups;
  }

  async getGroupsByUnit(unitId: string): Promise<Group[]> {
    return this.groups.filter(g => g.unitId === unitId);
  }

  async createGroup(group: Omit<Group, 'id' | 'createdAt' | 'lastActivity'>): Promise<Group> {
    const newGroup: Group = {
      ...group,
      id: Date.now().toString(),
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.groups.push(newGroup);
    return newGroup;
  }

  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    const group = this.groups.find(g => g.id === groupId);
    if (group && group.members.length < group.maxMembers) {
      const existingMember = group.members.find(m => m.userId === userId);
      if (!existingMember) {
        group.members.push({
          userId,
          role: 'member',
          joinedAt: new Date(),
          contributions: 0
        });
        group.lastActivity = new Date();
        return true;
      }
    }
    return false;
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
}

export const db = new MockDatabase();