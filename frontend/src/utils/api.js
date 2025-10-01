// API utility with proper error handling
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class APIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    
    // Try to get error details from response
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } else {
        // If response is HTML (like error page), extract title or show generic message
        const text = await response.text();
        if (text.includes('<!DOCTYPE')) {
          errorMessage = 'Server returned an error page instead of JSON. Please check if the server is running correctly.';
        }
      }
    } catch (parseError) {
      console.error('Error parsing error response:', parseError);
    }
    
    throw new APIError(errorMessage, response.status, response);
  }
  
  return response.json();
};

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    mode: 'cors',
  };

  // Merge options
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    console.log(`Making API request to: ${url}`, finalOptions);
    
    const response = await fetch(url, finalOptions);
    
    console.log(`API response status: ${response.status}`);
    
    return await handleResponse(response);
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    
    // Handle network errors specifically
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new APIError('Network error: Unable to connect to server. Please check if the server is running.', 0, null);
    }
    
    throw error;
  }
};

export const api = {
  // Auth endpoints
  googleLogin: (tokenId) =>
    apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: tokenId }),
    }),

  // Complaint endpoints
  getComplaints: (token) => 
    apiRequest('/complaints', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // User endpoints  
  getUserProfile: (token) =>
    apiRequest('/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getUserMe: (token) =>
    apiRequest('/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Notification endpoints
  getNotifications: (token, page = 1, limit = 20) =>
    apiRequest(`/notifications?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getUnreadCount: (token) =>
    apiRequest('/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  markNotificationAsRead: (token, notificationId) =>
    apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }),

  markAllNotificationsAsRead: (token) =>
    apiRequest('/notifications/mark-all-read', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export { APIError };