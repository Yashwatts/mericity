import React, { useState, useEffect } from 'react';
import { chatCache } from '../utils/chatCache';

const DepartmentChatButton = ({ complaint, onClick, token, chatWith, buttonText, className = "" }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const allowedStatuses = ['in_progress'];
    if (allowedStatuses.includes(complaint.status)) {
      fetchUnreadCount();
      // Much longer polling interval using cached data
      const interval = setInterval(fetchUnreadCount, 45000); // 45 seconds
      return () => clearInterval(interval);
    }
  }, [complaint._id, complaint.status, chatWith]);

  const fetchUnreadCount = async () => {
    try {
      const data = await chatCache.getUnreadCount(complaint._id, token, chatWith);
      const count = data.unreadCount || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation(); // Prevent event bubbling to parent elements
    onClick();
  };

  // Only show chat button for in_progress complaints
  const allowedStatuses = ['in_progress'];
  if (!allowedStatuses.includes(complaint.status)) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className={`
        relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
        text-white transition-all duration-200 hover:scale-105 active:scale-95
        ${className}
      `}
    >
      <i className="fas fa-comments"></i>
      <span>{buttonText}</span>
      
      {/* Unread message indicator - Red dot */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 rounded-full h-3 w-3 animate-pulse"></span>
      )}
    </button>
  );
};

export default DepartmentChatButton;