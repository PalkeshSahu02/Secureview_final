// User types
export type UserRole = 'super_admin' | 'org_admin' | 'manager' | 'member' | 'viewer';

export interface User {
  id: string;
  organization_id?: string;
  email: string;
  name: string;
  employee_id?: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  pin_verified: boolean;
  expires_at: string;
}

// Document types
export interface Document {
  id: string;
  organization_id: string;
  uploaded_by: string;
  title: string;
  description?: string;
  original_filename?: string;
  file_type: string;
  file_size: number;
  page_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  uploader?: User;
}

export type AccessLevel = 'view' | 'reshare';

export interface DocumentAccess {
  id: string;
  document_id: string;
  user_id?: string;
  group_id?: string;
  role_access?: string;
  granted_by: string;
  access_level: AccessLevel;
  expires_at?: string;
  is_one_time: boolean;
  one_time_used: boolean;
  created_at: string;
  user?: User;
  group?: Group;
}

// Group types
export interface Group {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  added_at: string;
  user?: User;
}

// Invitation types
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  name?: string;
  role: UserRole;
  invited_by: string;
  status: InvitationStatus;
  token?: string;
  expires_at: string;
  created_at: string;
  organization?: Organization;
  inviter?: User;
}

// Audit log types
export type EventType =
  | 'document_opened'
  | 'document_closed'
  | 'document_uploaded'
  | 'document_deleted'
  | 'access_denied'
  | 'permission_granted'
  | 'permission_revoked'
  | 'access_requested'
  | 'devtools_detected'
  | 'screenshot_attempt'
  | 'user_login'
  | 'user_logout';

export interface AuditLog {
  id: string;
  document_id?: string;
  user_id?: string;
  event_type: EventType;
  ip_address?: string;
  city?: string;
  country?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  session_duration_seconds?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  document?: Document;
  user?: User;
}

// Notification types
export type NotificationType =
  | 'document_viewed'
  | 'access_requested'
  | 'access_granted'
  | 'access_denied'
  | 'document_shared'
  | 'invitation_accepted';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  related_document_id?: string;
  related_user_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  requires_pin: boolean;
  session_id: string;
}

export interface RegisterRequest {
  organization_name: string;
  admin_name: string;
  email: string;
  password: string;
  pin: string;
  phone?: string;
}

export interface RegisterResponse {
  organization: Organization;
  user: User;
  session_id: string;
  access_token: string;
  refresh_token: string;
}

export interface VerifyPINRequest {
  pin: string;
  session_id: string;
}

export interface AcceptInvitationRequest {
  token: string;
  name: string;
  password: string;
  pin: string;
}

// Viewer types
export interface WatermarkData {
  user_name: string;
  user_email: string;
  employee_id: string;
  organization: string;
  ip_address: string;
  location: string;
  timestamp: string;
}

export interface ViewingSessionResponse {
  session_token: string;
  document: Document;
  watermark_data: WatermarkData;
  page_count: number;
}
