import React, { useState } from 'react';
import { NotificationContext } from './NotificationContext';

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Refresh unread count
  const refreshUnreadCount = async (token) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async (token, page = 1, limit = 20) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/notifications?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], total: 0 };
    }
  };

  // Mark notification as read
  const markAsRead = async (token, notificationId) => {
    if (!token) return;
    
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local state
      setNotifications(prev => prev.map(notif => 
        notif._id === notificationId 
          ? { ...notif, status: 'read' }
          : notif
      ));
      
      // Update unread count
      await refreshUnreadCount(token);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async (token) => {
    if (!token) return;
    
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local state
      setNotifications(prev => prev.map(notif => ({ ...notif, status: 'read' })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const value = {
    unreadCount,
    notifications,
    refreshUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;