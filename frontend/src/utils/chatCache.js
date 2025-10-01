// Simple cache to prevent duplicate API calls
class ChatCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.CACHE_TTL = 8000; // 8 seconds cache time
  }

  generateKey(complaintId, chatWith = null) {
    return chatWith ? `${complaintId}-${chatWith}` : complaintId;
  }

  async getUnreadCount(complaintId, token, chatWith = null) {
    const key = this.generateKey(complaintId, chatWith);
    const now = Date.now();

    // Return cached value if still valid
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (now - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
      // Remove expired cache
      this.cache.delete(key);
    }

    // Return pending request if one exists
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const requestPromise = this.fetchUnreadCount(complaintId, token, chatWith);
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache the result
      this.cache.set(key, {
        data: result,
        timestamp: now
      });

      return result;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { unreadCount: 0 };
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(key);
    }
  }

  async fetchUnreadCount(complaintId, token, chatWith) {
    let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/chat/${complaintId}`;
    if (chatWith) {
      url += `?chatWith=${chatWith}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      return await response.json();
    } else if (response.status === 429) {
      console.log('Chat API rate limited');
      // Return cached value if available, otherwise return 0
      const key = this.generateKey(complaintId, chatWith);
      if (this.cache.has(key)) {
        return this.cache.get(key).data;
      }
      return { unreadCount: 0 };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  // Clean up expired cache entries
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const chatCache = new ChatCache();

// Clean up cache every minute
setInterval(() => {
  chatCache.cleanup();
}, 60000);