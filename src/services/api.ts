/**
 * Central API service for Dwaso.
 *
 * BASE_URL points to your local backend.
 * For a physical device replace 'localhost' with your machine's LAN IP,
 * e.g. 'http://192.168.191.77:5000'
 * 
 */
export const BASE_URL = 'http://192.168.36.77:5000';

const API_URL = `${BASE_URL}/api`;
 
async function parseApiResponse<T>(res: Response): Promise<T> {
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw { success: false, message: 'Server returned an invalid response.' } as ApiError;
  }

  if (!res.ok) throw json as ApiError;
  return json as T;
}

// ─── Types ────────────────────────────

export interface Address {
  _id: string;
  label: string;
  address: string;
  default: boolean;
}

export interface User {
  _id: string;
  fullName: string;
  phone: string;
  email: string | null;
  profilePicture: string | null;
  location?: string | null;
  bio?: string | null;
  addresses?: Address[];
  lat?: number | null;
  lng?: number | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface SignupResponse {
  success: boolean;
  message: string;
  data: {
    phone: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { msg: string; path: string }[];
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export interface SignupPayload {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  /** Local image URI from expo-image-picker */
  avatarUri?: string | null;
}

export async function signupApi(payload: SignupPayload): Promise<SignupResponse> {
  const form = new FormData();

  form.append('fullName', payload.fullName);
  form.append('phone', payload.phone);
  form.append('password', payload.password);
  if (payload.email) form.append('email', payload.email);

  if (payload.avatarUri) {
    // React Native FormData accepts this object shape for file uploads
    const filename = payload.avatarUri.split('/').pop() ?? 'profile.jpg';
    const match    = /\.(\w+)$/.exec(filename);
    const type     = match ? `image/${match[1]}` : 'image/jpeg';
    form.append('profilePicture', { uri: payload.avatarUri, name: filename, type } as any);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      body: form,
      // Do NOT set Content-Type — fetch sets it automatically with the boundary
    });
  } catch (err: any) {
    throw { success: false, message: err?.message ?? 'Network error during signup.' } as ApiError;
  }

  return parseApiResponse<SignupResponse>(res);
}

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  phone: string;
  password: string;
}

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json as AuthResponse;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export interface Post {
  _id: string;
  user: { _id: string; fullName: string; profilePicture: string | null; phone: string };
  category: string;
  serviceType: string | null;
  title: string | null;
  description: string;
  budget: number | null;
  budgetType: string | null;
  deliveryRequired: string | null;
  urgency: string | null;
  contactPreference: string | null;
  quantity: number | null;
  condition: string | null;
  requestType?: 'product' | 'service' | null;
  brand?: string | null;
  model?: string | null;
  preferredColor?: string | null;
  preferredSize?: string | null;
  region?: string | null;
  city?: string | null;
  area?: string | null;
  exactAddress?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  estimatedDuration?: string | null;
  workersNeeded?: number | null;
  location: string;
  images: string[];
  showInFeed: boolean;
  status: 'open' | 'closed' | 'fulfilled';
  createdAt: string;
}

export interface CreatePostPayload {
  requestType?: 'product' | 'service';
  category: string;
  serviceType?: string;
  title?: string;
  description?: string;
  budget?: string;
  budgetType?: string;
  deliveryRequired?: string;
  urgency?: string;
  contactPreference?: string;
  quantity?: string;
  condition?: string;
  location: string;
  imageUris?: string[];
  brand?: string;
  model?: string;
  preferredColor?: string;
  preferredSize?: string;
  region?: string;
  city?: string;
  area?: string;
  exactAddress?: string;
  preferredDate?: string;
  preferredTime?: string;
  estimatedDuration?: string;
  workersNeeded?: string;
  showInFeed?: boolean;
  /** Buyer's GPS coordinates — used for distance-based seller matching */
  lat?: number;
  lng?: number;
}

export async function createPostApi(
  payload: CreatePostPayload,
  accessToken: string
): Promise<{ success: boolean; message: string; data: { post: Post } }> {
  const form = new FormData();

  form.append('category',    payload.category);
  if (payload.description) form.append('description', payload.description);
  form.append('location',    payload.location);
  if (payload.serviceType) form.append('serviceType', payload.serviceType);
  if (payload.title)       form.append('title',       payload.title);
  if (payload.budget)      form.append('budget',      payload.budget);
  if (payload.budgetType)  form.append('budgetType',  payload.budgetType);
  if (payload.deliveryRequired) form.append('deliveryRequired', payload.deliveryRequired);
  if (payload.urgency)     form.append('urgency',     payload.urgency);
  if (payload.contactPreference) form.append('contactPreference', payload.contactPreference);
  if (payload.quantity)    form.append('quantity',    payload.quantity);
  if (payload.condition)   form.append('condition',   payload.condition);
  if (payload.requestType) form.append('requestType', payload.requestType);
  if (payload.brand) form.append('brand', payload.brand);
  if (payload.model) form.append('model', payload.model);
  if (payload.preferredColor) form.append('preferredColor', payload.preferredColor);
  if (payload.preferredSize) form.append('preferredSize', payload.preferredSize);
  if (payload.region) form.append('region', payload.region);
  if (payload.city) form.append('city', payload.city);
  if (payload.area) form.append('area', payload.area);
  if (payload.exactAddress) form.append('exactAddress', payload.exactAddress);
  if (payload.preferredDate) form.append('preferredDate', payload.preferredDate);
  if (payload.preferredTime) form.append('preferredTime', payload.preferredTime);
  if (payload.estimatedDuration) form.append('estimatedDuration', payload.estimatedDuration);
  if (payload.workersNeeded) form.append('workersNeeded', payload.workersNeeded);
  form.append('showInFeed', String(payload.showInFeed ?? true));
  if (payload.lat != null) form.append('lat', String(payload.lat));
  if (payload.lng != null) form.append('lng', String(payload.lng));

  (payload.imageUris ?? []).forEach((uri) => {
    const filename = uri.split('/').pop() ?? 'photo.jpg';
    const match    = /\.(\w+)$/.exec(filename);
    const type     = match ? `image/${match[1]}` : 'image/jpeg';
    form.append('images', { uri, name: filename, type } as any);
  });

  const res = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

// ─── Fetch Posts ──────────────────────────────────────────────────────────────

export interface GetPostsParams {
  category?: string;
  location?: string;
  search?: string;
  page?: number;
  limit?: number;
  requestType?: 'product' | 'service';
}

export async function getPostsApi(params: GetPostsParams = {}): Promise<{
  success: boolean;
  data: { posts: Post[]; total: number; page: number; limit: number };
}> {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') query.append('category', params.category);
  if (params.location)    query.append('location',    params.location);
  if (params.search)      query.append('search',      params.search);
  if (params.page)        query.append('page',        String(params.page));
  if (params.limit)       query.append('limit',       String(params.limit));
  if (params.requestType) query.append('requestType', params.requestType);

  const res = await fetch(`${API_URL}/posts?${query.toString()}`);
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function getMyPostsApi(
  accessToken: string
): Promise<{ success: boolean; data: { posts: Post[] } }> {
  const res = await fetch(`${API_URL}/posts/user/my`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function updatePostApi(
  id: string,
  payload: { status: Post['status'] },
  accessToken: string
): Promise<{ success: boolean; data: { post: Post } }> {
  const res = await fetch(`${API_URL}/posts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

// ─── Fetch single post ────────────────────────────────────────────────────────

export async function getPostByIdApi(
  id: string,
  accessToken?: string
): Promise<{ success: boolean; data: { post: Post } }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res  = await fetch(`${API_URL}/posts/${id}`, { headers });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

// ─── Seller Application ───────────────────────────────────────────────────────

export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected';

export async function getSellerStatusApi(
  accessToken: string
): Promise<{ success: boolean; data: { status: SellerStatus; applicationId?: string } }> {
  const res  = await fetch(`${API_URL}/seller/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export interface SellerApplicationPayload {
  bizName: string;
  bizType: 'product' | 'service';
  category: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  town: string;
  lat: number;
  lng: number;
  ghanaCardNumber: string;
  /** Local image URI from expo-image-picker */
  cardFrontUri: string;
}

export async function applySellerApi(
  payload: SellerApplicationPayload,
  accessToken: string
): Promise<{ success: boolean; message: string; data: { applicationId: string; status: string } }> {
  const form = new FormData();

  form.append('bizName',         payload.bizName);
  form.append('bizType',         payload.bizType);
  form.append('category',        payload.category);
  form.append('phone',           payload.phone);
  form.append('town',            payload.town);
  form.append('lat',             String(payload.lat));
  form.append('lng',             String(payload.lng));
  form.append('ghanaCardNumber', payload.ghanaCardNumber);

  if (payload.whatsapp) form.append('whatsapp', payload.whatsapp);
  if (payload.email)    form.append('email',    payload.email);

  const filename = payload.cardFrontUri.split('/').pop() ?? 'card.jpg';
  const match    = /\.(\w+)$/.exec(filename);
  const type     = match ? `image/${match[1]}` : 'image/jpeg';
  form.append('cardFront', { uri: payload.cardFrontUri, name: filename, type } as any);

  const res = await fetch(`${API_URL}/seller/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatUser {
  _id: string;
  fullName: string;
  profilePicture: string | null;
  phone?: string;
}

export interface ChatProfile extends ChatUser {
  location: string;
  bio: string;
  role: 'buyer' | 'seller' | 'admin';
  createdAt: string;
}

export interface ChatRequestSummary {
  _id: string;
  title: string | null;
  description: string;
  category: string;
  location: string;
  contactPreference: string | null;
}

export async function getUserProfileApi(
  userId: string,
  accessToken: string,
  conversationId: string
): Promise<{ success: boolean; data: { user: ChatProfile; request: ChatRequestSummary } }> {
  const res = await fetch(`${API_URL}/auth/users/${userId}?conversationId=${encodeURIComponent(conversationId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export interface Conversation {
  _id: string;
  post: { _id: string; title: string | null; description: string; category: string; images: string[]; contactPreference?: string | null };
  buyer:  ChatUser;
  seller: ChatUser;
  lastMessage: string;
  lastMessageAt: string;
  unreadBuyer: number;
  unreadSeller: number;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: ChatUser;
  text: string;
  read: boolean;
  createdAt: string;
}

/** Get or create a conversation when a seller taps "I Have This!" */
export async function getOrCreateConversationApi(
  postId: string,
  accessToken: string
): Promise<{ success: boolean; data: { conversation: Conversation } }> {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ postId }),
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

/** Fetch all conversations for the logged-in user */
export async function getMyConversationsApi(
  accessToken: string
): Promise<{ success: boolean; data: { conversations: Conversation[] } }> {
  const res  = await fetch(`${API_URL}/chat`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

/** Fetch messages for a conversation (paginated) */
export async function getMessagesApi(
  conversationId: string,
  accessToken: string,
  page = 1
): Promise<{ success: boolean; data: { messages: ChatMessage[]; total: number } }> {
  const res  = await fetch(`${API_URL}/chat/${conversationId}/messages?page=${page}&limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

/** REST fallback to send a message */
export async function sendMessageApi(
  conversationId: string,
  text: string,
  accessToken: string
): Promise<{ success: boolean; data: { message: ChatMessage } }> {
  const res = await fetch(`${API_URL}/chat/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

// ─── Refresh current user (role sync) ────────────────────────────────────────

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  email?: string | null;
  location?: string | null;
  bio?: string | null;
  addresses?: Address[];
  avatarUri?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export async function getMeApi(
  accessToken: string
): Promise<{ success: boolean; data: { user: User } }> {
  const res  = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function updateProfileApi(
  payload: UpdateProfilePayload,
  accessToken: string
): Promise<{ success: boolean; data: { user: User } }> {
  const url = `${API_URL}/auth/me`;
  const isUpload = Boolean(payload.avatarUri);

  let res: Response;
  if (isUpload) {
    const form = new FormData();

    if (payload.fullName) form.append('fullName', payload.fullName);
    if (payload.phone) form.append('phone', payload.phone);
    if (payload.email !== undefined) form.append('email', payload.email);
    if (payload.location !== undefined) form.append('location', payload.location);
    if (payload.bio !== undefined) form.append('bio', payload.bio);
    if (payload.addresses) form.append('addresses', JSON.stringify(payload.addresses));
    if (payload.lat !== undefined && payload.lat !== null) form.append('lat', String(payload.lat));
    if (payload.lng !== undefined && payload.lng !== null) form.append('lng', String(payload.lng));

    const filename = payload.avatarUri?.split('/').pop() ?? 'profile.jpg';
    const match    = /\.(\w+)$/.exec(filename);
    const type     = match ? `image/${match[1]}` : 'image/jpeg';
    form.append('profilePicture', { uri: payload.avatarUri, name: filename, type } as any);

    res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
  } else {
    res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

// ─── Saved Posts ──────────────────────────────────────────────────────────────

export async function getSavedApi(
  accessToken: string
): Promise<{ success: boolean; data: { posts: Post[] } }> {
  const res  = await fetch(`${API_URL}/saved`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function savePostApi(
  postId: string,
  accessToken: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/saved`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body:    JSON.stringify({ postId }),
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function unsavePostApi(
  postId: string,
  accessToken: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/saved/${postId}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function clearSavedApi(
  accessToken: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/saved`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  _id: string;
  type: 'new_request' | 'new_message' | 'offer' | 'system';
  title: string;
  body: string;
  read: boolean;
  data: { postId?: string | null; conversationId?: string | null };
  createdAt: string;
}

export async function getNotificationsApi(
  accessToken: string
): Promise<{ success: boolean; data: { notifications: AppNotification[]; unreadCount: number } }> {
  const res  = await fetch(`${API_URL}/notifications`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function markNotificationReadApi(
  id: string, accessToken: string
): Promise<{ success: boolean }> {
  const res  = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function markAllNotificationsReadApi(
  accessToken: string
): Promise<{ success: boolean }> {
  const res  = await fetch(`${API_URL}/notifications/read-all`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function clearAllNotificationsApi(
  accessToken: string
): Promise<{ success: boolean }> {
  const res  = await fetch(`${API_URL}/notifications`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function savePushTokenApi(
  token: string, accessToken: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/notifications/push-token`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ token }),
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

// ─── OTP ──────────────────────────────────────────────────────────────────────

export interface OtpSendResponse {
  success: boolean;
  message: string;
  requestId: string;
  prefix: string;
}

export async function sendOtpApi(phone: string): Promise<OtpSendResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/send-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone }),
    });
  } catch (err: any) {
    throw { success: false, message: err?.message ?? 'Network error while sending OTP.' } as ApiError;
  }
  return parseApiResponse<OtpSendResponse>(res);
}

export async function verifyOtpApi(params: {
  phone: string;
  requestId: string;
  prefix: string;
  code: string;
}): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/verify-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(params),
    });
  } catch (err: any) {
    throw { success: false, message: err?.message ?? 'Network error while verifying OTP.' } as ApiError;
  }

  return parseApiResponse<AuthResponse>(res);
}

export async function resendOtpApi(requestId: string): Promise<OtpSendResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/resend-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ requestId }),
    });
  } catch (err: any) {
    throw { success: false, message: err?.message ?? 'Network error while resending OTP.' } as ApiError;
  }

  return parseApiResponse<OtpSendResponse>(res);
}

// ─── Forgot / Reset Password ──────────────────────────────────────────────────

export async function forgotPasswordApi(phone: string): Promise<OtpSendResponse> {
  const res  = await fetch(`${API_URL}/auth/forgot-password`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ phone }),
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function resetPasswordApi(params: {
  phone: string;
  requestId: string;
  prefix: string;
  code: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res  = await fetch(`${API_URL}/auth/reset-password`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}

export async function resendResetOtpApi(requestId: string): Promise<OtpSendResponse> {
  const res  = await fetch(`${API_URL}/auth/resend-reset-otp`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ requestId }),
  });
  const json = await res.json();
  if (!res.ok) throw json as ApiError;
  return json;
}
