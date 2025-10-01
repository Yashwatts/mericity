import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheck, faCheckDouble, faTimes } from '@fortawesome/free-solid-svg-icons';
import { api, APIError } from '../utils/api';

const NotificationIcon = ({ token }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.markNotificationAsRead(token, notificationId);
      
      // Update local state
      setNotifications(prev => prev.map(notif => 
        notif._id === notificationId 
          ? { ...notif, status: 'read' }
          : notif
      ));
      
      // Update unread count
      const data = await api.getUnreadCount(token);
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead(token);
      
      // Update local state
      setNotifications(prev => prev.map(notif => ({ ...notif, status: 'read' })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch unread count on mount and setup polling
  useEffect(() => {
    const fetchUnreadCountWrapper = async () => {
      try {
        const data = await api.getUnreadCount(token);
        setUnreadCount(data.count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        if (error instanceof APIError) {
          console.error('API Error details:', error.message);
        }
      }
    };

    if (token) {
      fetchUnreadCountWrapper();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCountWrapper, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    const fetchNotificationsWrapper = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const data = await api.getNotifications(token, 1, 10);
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        if (error instanceof APIError) {
          console.error('API Error details:', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationsWrapper();
  }, [isOpen, token]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in_progress':
        return '🚧';
      case 'resolved':
        return '✅';
      default:
        return '📋';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-full 
                   transition-all duration-200 w-10 h-10 flex items-center justify-center
                   hover:bg-gray-100 hover:text-gray-800"
      >
        <FontAwesomeIcon icon={faBell} className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold 
                           rounded-full min-w-[1.2rem] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg 
                       shadow-lg z-50 max-h-96 overflow-hidden">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  title="Mark all as read"
                >
                  <FontAwesomeIcon icon={faCheckDouble} className="mr-1" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="py-2">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors
                               ${notification.status === 'unread' ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {getStatusIcon(notification.metadata?.newStatus)}
                          </span>
                          <h4 className="text-sm font-medium text-gray-800 truncate">
                            {notification.title}
                          </h4>
                          {notification.status === 'unread' && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {getTimeAgo(notification.createdAt)}
                          </span>
                          {notification.status === 'unread' && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              title="Mark as read"
                            >
                              <FontAwesomeIcon icon={faCheck} className="mr-1" />
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium w-full text-center">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationIcon;