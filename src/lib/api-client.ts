// Enhanced API client with proper error handling and type safety
import { User, Unit, Group, Assignment, Course } from './database';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  timestamp: Date;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.authToken = localStorage.getItem('authToken');
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('authToken', token);
  }

  // Clear authentication token
  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('authToken');
  }

  // Generic request method with proper error handling
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data,
        statusCode: response.status,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        statusCode: 0,
        timestamp: new Date()
      };
    }
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: Omit<User, 'id' | 'createdAt' | 'isOnline' | 'lastSeen' | 'isVerified'>): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    
    if (response.success) {
      this.clearAuthToken();
    }
    
    return response;
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  // User management
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/api/user/me');
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    return this.request(`/api/user/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getUsersByRole(role: 'student' | 'lecturer'): Promise<ApiResponse<User[]>> {
    return this.request(`/api/users?role=${role}`);
  }

  // Course management
  async getCourses(): Promise<ApiResponse<Course[]>> {
    return this.request('/api/courses');
  }

  async getCourse(courseId: string): Promise<ApiResponse<Course>> {
    return this.request(`/api/courses/${courseId}`);
  }

  // Unit management
  async createUnit(unitData: Omit<Unit, 'id' | 'createdAt' | 'enrolledStudents' | 'assignments' | 'isActive' | 'pendingEnrollments'>): Promise<ApiResponse<Unit>> {
    return this.request('/api/units', {
      method: 'POST',
      body: JSON.stringify(unitData),
    });
  }

  async getUnits(): Promise<ApiResponse<Unit[]>> {
    return this.request('/api/units');
  }

  async getUnit(unitId: string): Promise<ApiResponse<Unit>> {
    return this.request(`/api/units/${unitId}`);
  }

  async updateUnit(unitId: string, updates: Partial<Unit>): Promise<ApiResponse<Unit>> {
    return this.request(`/api/units/${unitId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteUnit(unitId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/units/${unitId}`, {
      method: 'DELETE',
    });
  }

  // Enrollment management
  async enrollStudent(unitId: string, studentId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/units/${unitId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  }

  async requestEnrollment(unitId: string, message?: string): Promise<ApiResponse<void>> {
    return this.request(`/api/units/${unitId}/request-enrollment`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async processEnrollmentRequest(requestId: string, approve: boolean): Promise<ApiResponse<void>> {
    return this.request(`/api/enrollment-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ approve }),
    });
  }

  // Group management
  async createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'lastActivity' | 'courseId'>): Promise<ApiResponse<Group>> {
    return this.request('/api/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  async getGroups(): Promise<ApiResponse<Group[]>> {
    return this.request('/api/groups');
  }

  async getGroup(groupId: string): Promise<ApiResponse<Group>> {
    return this.request(`/api/groups/${groupId}`);
  }

  async joinGroup(groupId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/groups/${groupId}/join`, {
      method: 'POST',
    });
  }

  async leaveGroup(groupId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/groups/${groupId}/leave`, {
      method: 'POST',
    });
  }

  // Assignment management
  async createAssignment(assignmentData: Omit<Assignment, 'id' | 'createdAt'>): Promise<ApiResponse<Assignment>> {
    return this.request('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async getAssignments(unitId?: string): Promise<ApiResponse<Assignment[]>> {
    const query = unitId ? `?unitId=${unitId}` : '';
    return this.request(`/api/assignments${query}`);
  }

  async getAssignment(assignmentId: string): Promise<ApiResponse<Assignment>> {
    return this.request(`/api/assignments/${assignmentId}`);
  }

  async updateAssignment(assignmentId: string, updates: Partial<Assignment>): Promise<ApiResponse<Assignment>> {
    return this.request(`/api/assignments/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // File management
  async uploadFile(file: File, context: { groupId?: string; assignmentId?: string }): Promise<ApiResponse<{ fileId: string; url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', JSON.stringify(context));

    return this.request('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it
      },
    });
  }

  async downloadFile(fileId: string): Promise<ApiResponse<Blob>> {
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}/download`, {
      headers: {
        'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to download file: ${response.statusText}`,
        statusCode: response.status,
        timestamp: new Date()
      };
    }

    const blob = await response.blob();
    return {
      success: true,
      data: blob,
      statusCode: response.status,
      timestamp: new Date()
    };
  }

  async deleteFile(fileId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Document collaboration
  async getDocument(documentId: string): Promise<ApiResponse<{ content: string; version: number }>> {
    return this.request(`/api/documents/${documentId}`);
  }

  async saveDocument(documentId: string, content: string, version: number): Promise<ApiResponse<{ version: number }>> {
    return this.request(`/api/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content, version }),
    });
  }

  async getDocumentHistory(documentId: string, limit: number = 50): Promise<ApiResponse<any[]>> {
    return this.request(`/api/documents/${documentId}/history?limit=${limit}`);
  }

  // Notifications
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.request('/api/notifications');
  }

  async markNotificationRead(notificationId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  // Health and metrics
  async getHealth(): Promise<ApiResponse<any>> {
    return this.request('/health');
  }

  async getMetrics(): Promise<ApiResponse<any>> {
    return this.request('/metrics');
  }

  // Utility methods
  async ping(): Promise<number> {
    const start = Date.now();
    try {
      await this.request('/health');
      return Date.now() - start;
    } catch {
      return -1;
    }
  }

  // Batch operations
  async batchRequest<T>(requests: Array<{ endpoint: string; options?: RequestInit }>): Promise<ApiResponse<T[]>> {
    const promises = requests.map(req => this.request<T>(req.endpoint, req.options));
    const results = await Promise.allSettled(promises);
    
    const data = results.map(result => 
      result.status === 'fulfilled' ? result.value.data : null
    ).filter(Boolean) as T[];

    const hasErrors = results.some(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && !result.value.success)
    );

    return {
      success: !hasErrors,
      data,
      error: hasErrors ? 'Some requests failed' : undefined,
      statusCode: 200,
      timestamp: new Date()
    };
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Request interceptor for automatic token refresh
export class ApiInterceptor {
  private static instance: ApiInterceptor;
  private refreshPromise: Promise<void> | null = null;

  static getInstance(): ApiInterceptor {
    if (!ApiInterceptor.instance) {
      ApiInterceptor.instance = new ApiInterceptor();
    }
    return ApiInterceptor.instance;
  }

  async interceptRequest(request: () => Promise<ApiResponse<any>>): Promise<ApiResponse<any>> {
    const response = await request();
    
    // If unauthorized, try to refresh token
    if (response.statusCode === 401 && !this.refreshPromise) {
      this.refreshPromise = this.refreshToken();
      await this.refreshPromise;
      this.refreshPromise = null;
      
      // Retry original request
      return request();
    }
    
    return response;
  }

  private async refreshToken(): Promise<void> {
    try {
      const response = await apiClient.refreshToken();
      if (response.success && response.data) {
        apiClient.setAuthToken(response.data.token);
      } else {
        // Refresh failed, redirect to login
        apiClient.clearAuthToken();
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      apiClient.clearAuthToken();
      window.location.href = '/login';
    }
  }
}

// Error handling utilities
export class ApiErrorHandler {
  static handleError(error: ApiError, context?: string): void {
    console.error(`API Error${context ? ` in ${context}` : ''}:`, error);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service (e.g., Sentry)
      this.logToExternalService(error, context);
    }
  }

  static logToExternalService(error: ApiError, context?: string): void {
    // Implementation for external error logging
    // Example: Sentry, LogRocket, etc.
  }

  static getErrorMessage(error: ApiError): string {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'UNAUTHORIZED':
        return 'You are not authorized to perform this action.';
      case 'NOT_FOUND':
        return 'The requested resource was not found.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
}

// Response cache for performance optimization
export class ApiCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// Create singleton cache instance
export const apiCache = new ApiCache();

// Enhanced API client with caching and interceptors
export class EnhancedApiClient extends ApiClient {
  private cache = apiCache;
  private interceptor = ApiInterceptor.getInstance();

  async request<T>(endpoint: string, options: RequestInit = {}, useCache: boolean = false): Promise<ApiResponse<T>> {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          statusCode: 200,
          timestamp: new Date()
        };
      }
    }

    // Make request with interceptor
    const response = await this.interceptor.interceptRequest(() => 
      super.request<T>(endpoint, options)
    );

    // Cache successful GET responses
    if (response.success && useCache && (!options.method || options.method === 'GET')) {
      this.cache.set(cacheKey, response.data);
    }

    return response;
  }

  // Invalidate cache for specific patterns
  invalidateCache(pattern: string): void {
    for (const key of this.cache['cache'].keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Create enhanced API client instance
export const enhancedApiClient = new EnhancedApiClient();

// Type-safe API hooks for React components
export const useApiClient = () => {
  return enhancedApiClient;
};

// Utility functions for common API patterns
export const ApiUtils = {
  // Handle API response in React components
  handleResponse: <T>(
    response: ApiResponse<T>,
    onSuccess: (data: T) => void,
    onError?: (error: string) => void
  ) => {
    if (response.success && response.data) {
      onSuccess(response.data);
    } else if (onError) {
      onError(response.error || 'Unknown error');
    }
  },

  // Create error toast from API response
  createErrorToast: (response: ApiResponse<any>) => ({
    title: "Error",
    description: response.error || "An unexpected error occurred",
    variant: "destructive" as const
  }),

  // Create success toast from API response
  createSuccessToast: (message: string) => ({
    title: "Success",
    description: message
  }),

  // Validate response data
  validateResponse: <T>(response: ApiResponse<T>, validator: (data: any) => boolean): boolean => {
    return response.success && response.data && validator(response.data);
  }
};