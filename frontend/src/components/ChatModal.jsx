import React, { useState, useEffect, useRef, useMemo } from 'react';

const ChatModal = ({ complaint, onClose, token, userRole, chatWith }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [error, setError] = useState('');
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    // Reset state when modal is opened with a new complaint or chatWith changes
  setMessages([]);
  setError('');
  setChatInitialized(false);
  setHasFetchedOnce(false);
  setLoading(true);
    
    let mounted = true;
    let interval;
    
    const initializeAndStartPolling = async () => {
      if (!mounted) return;
      
      console.log('🚀 Starting chat initialization sequence...');
      
  // Initialize chat first
      const success = await initializeChat();
      
      // Start polling only after successful initialization
      if (success && mounted) {
        console.log('✅ Initialization successful, starting polling...');
        // Small delay to ensure state is updated
        setTimeout(() => {
          if (mounted) {
            interval = setInterval(() => {
              if (mounted) {
                fetchMessages(false, false); // Don't mark as read during polling, normal init check
              }
            }, 20000); // 20 seconds polling interval
          }
        }, 500);

        // Also trigger a one-time short delayed refetch to catch backend creation races
        setTimeout(() => {
          if (mounted) {
            fetchMessages(false, false); // Normal fetch with init check
          }
        }, 1200);
      }
    };
    
    initializeAndStartPolling();
    
    return () => {
      console.log('🧹 Cleaning up chat component...');
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [complaint._id, chatWith]); // Include chatWith as dependency

  const initializeChat = async () => {
    try {
      setLoading(true);
      setError('');
      setMessages([]); // Clear messages before initializing
      
      // Check complaint status first
      if (complaint.status !== 'in_progress') {
        setError(`Chat is only available for complaints in progress. Current status: ${complaint.status}`);
        setLoading(false);
        return false;
      }
      
      console.log('🔄 Initializing chat for complaint:', complaint._id, 'userRole:', userRole, 'chatWith:', chatWith);
      
      // Initialize chat
      const initResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/chat/init/${complaint._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatWith: userRole === 'department' ? chatWith : undefined
        })
      });
      
      console.log('Init response status:', initResponse.status);
      
      if (initResponse.ok) {
        const initData = await initResponse.json();
        console.log('✅ Chat initialized successfully:', initData);
        setParticipants(initData.participants || []);
        
        // Fetch messages immediately after successful initialization
        // Use a direct fetch call that bypasses the chatInitialized check
        console.log('🔄 Immediately fetching messages after initialization...');
        await directFetchMessages(true); // Mark as read on initial load
        
        // Set initialized state after successful fetch
        setChatInitialized(true);
        return true;
      } else {
        const errorData = await initResponse.json();
        console.error('❌ Init error:', errorData);
        setError(`Chat initialization failed: ${errorData.error || 'Unknown error'}`);
        setLoading(false);
        return false;
      }

    } catch (error) {
      console.error('❌ Error initializing chat:', error);
      setError(`Network error: ${error.message}`);
      setLoading(false);
      return false;
    }
  };

  // Direct fetch function that doesn't check chatInitialized state
  const directFetchMessages = async (markAsRead = false) => {
    try {
      console.log('📥 Direct fetching messages for complaint:', complaint._id, 'userRole:', userRole, 'chatWith:', chatWith);
      
      // Build URL with chatWith parameter for department users
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/chat/${complaint._id}`;
      if (userRole === 'department' && chatWith) {
        url += `?chatWith=${chatWith}`;
      }
      
      console.log('🌐 Direct fetch URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Direct fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📨 Direct fetch messages data received:', data);
        
        // Handle case where chat exists and has messages
        if (data.chat && Array.isArray(data.chat.messages)) {
          console.log(`📝 Direct fetch found ${data.chat.messages.length} messages in chat`);
          setMessages(data.chat.messages);
        } else if (data.chat === null) {
          console.log('📭 Direct fetch - No chat found, setting empty messages');
          setMessages([]);
        } else {
          console.log('❓ Direct fetch - Unexpected data structure:', data);
          setMessages([]);
        }
        
        // Only mark messages as read if explicitly requested and we have messages
        if (markAsRead && data.chat && data.chat.messages && data.chat.messages.length > 0) {
          setTimeout(() => markMessagesAsRead(), 100); // Small delay to avoid race conditions
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Direct fetch messages error:', errorData);
        
        if (response.status === 403) {
          setError('Access denied or complaint not in progress.');
        } else if (response.status === 404) {
          console.log('📭 Direct fetch - Chat not found (404), setting empty messages');
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('❌ Error in direct fetch messages:', error);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  };

  const fetchMessages = async (markAsRead = false, forceSkipInitCheck = false) => {
    try {
      // Don't fetch if chat is not initialized (unless explicitly forced)
      if (!forceSkipInitCheck && !chatInitialized) {
        console.log('⏭️ Chat not initialized, skipping message fetch');
        return;
      }
      
      console.log('📥 Fetching messages for complaint:', complaint._id, 'userRole:', userRole, 'chatWith:', chatWith);
      
      // Build URL with chatWith parameter for department users
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/chat/${complaint._id}`;
      if (userRole === 'department' && chatWith) {
        url += `?chatWith=${chatWith}`;
      }
      
      console.log('🌐 Fetch URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📨 Messages data received:', data);
        
        // Handle case where chat exists and has messages
        if (data.chat && Array.isArray(data.chat.messages)) {
          console.log(`📝 Found ${data.chat.messages.length} messages in chat`);
          setMessages(data.chat.messages);
        } else if (data.chat === null) {
          console.log('📭 No chat found, setting empty messages');
          setMessages([]);
        } else {
          console.log('❓ Unexpected data structure:', data);
          setMessages([]);
        }
        
        // Only mark messages as read if explicitly requested and we have messages
        if (markAsRead && data.chat && data.chat.messages && data.chat.messages.length > 0) {
          setTimeout(() => markMessagesAsRead(), 100); // Small delay to avoid race conditions
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Fetch messages error:', errorData);
        
        // Clarify errors: 403 -> permission/status, 404 -> not initialized yet
        if (response.status === 403) {
          setChatInitialized(false);
          setError('Access denied or complaint not in progress.');
        } else if (response.status === 404) {
          // Attempt a single re-init then refetch
          setChatInitialized(false);
          const reinitOk = await initializeChat();
          if (reinitOk) {
            await fetchMessages(markAsRead, true); // Skip init check on reinit
          } else {
            setError('Chat not found. Try again.');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const body = {};
      if (userRole === 'department' && chatWith) {
        body.chatWith = chatWith;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/chat/${complaint._id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error('Failed to mark messages as read:', response.status);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !chatInitialized) return;

    console.log('📤 Sending message:', newMessage.trim());
    setSending(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/chat/${complaint._id}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          messageType: 'text',
          ...(userRole === 'department' && chatWith && { chatWith })
        })
      });

      console.log('📤 Send response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Message sent successfully:', data);
        
        // Add the message immediately to the UI for instant feedback
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        
        // Fetch updated messages to ensure consistency
        setTimeout(() => fetchMessages(false, false), 800);
      } else {
        const errorData = await response.json();
        console.error('❌ Error sending message:', errorData);
        alert('Failed to send message: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Network error: Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'user': return 'bg-blue-600';
      case 'admin': return 'bg-red-600';
      case 'department': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'user': return 'User';
      case 'admin': return 'Admin';
      case 'department': return 'Department';
      default: return 'Unknown';
    }
  };

  // Memoize current user ID to prevent recalculation on every render
  const currentUserId = useMemo(() => {
    try {
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Handle different token formats: users use 'userId', admins/departments use 'id'
        return payload.id || payload.userId;
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
    return null;
  }, [token]);

  const getCurrentUserId = () => {
    return currentUserId;
  };

  const isOwnMessage = (message) => {
    const currentUserId = getCurrentUserId();
    return message.senderId === currentUserId;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Chat - Complaint #{complaint._id?.slice(-6)}
              {userRole === 'department' && chatWith && (
                <span className="text-sm font-normal text-blue-600">
                  {' '}(with {chatWith === 'user' ? 'User' : 'Admin'})
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600">
              Status: <span className="font-medium">{complaint.status}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Participants */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {participants.map((participant, index) => (
              <span
                key={index}
                className={`px-2 py-1 rounded-full text-xs text-white ${getRoleColor(participant.participantRole)}`}
              >
                {getRoleName(participant.participantRole)}: {participant.participantName}
              </span>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p className="font-semibold">Chat Error</p>
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Close
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading chat...</p>
            </div>
          ) : !chatInitialized ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-comments text-4xl mb-4"></i>
              <p>Initializing chat...</p>
            </div>
          ) : (!hasFetchedOnce) ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-comments text-4xl mb-4"></i>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = isOwnMessage(message);
              return (
                <div
                  key={message._id || index}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {!isOwn && (
                      <div className="text-xs opacity-75 mb-1">
                        {getRoleName(message.senderRole)}: {message.senderName}
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending || !chatInitialized || error}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim() || !chatInitialized || error}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;