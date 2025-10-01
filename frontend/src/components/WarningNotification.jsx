import React, { useState, useEffect } from 'react';

const WarningNotification = () => {
  const [warnings, setWarnings] = useState([]);
  const [currentWarningIndex, setCurrentWarningIndex] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // Fetch user warnings
  const fetchWarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/user/warnings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const unacknowledged = data.unacknowledgedWarnings || [];
        
        if (unacknowledged.length > 0) {
          setWarnings(unacknowledged);
          setCurrentWarningIndex(0);
          setShowWarning(true);
        }
      }
    } catch (error) {
      console.error('Error fetching warnings:', error);
    }
  };

  // Acknowledge warning
  const acknowledgeWarning = async (warningId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/user/acknowledge-warning/${warningId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        // Show next warning or close if none left
        if (currentWarningIndex < warnings.length - 1) {
          setCurrentWarningIndex(currentWarningIndex + 1);
        } else {
          setShowWarning(false);
          setWarnings([]);
        }
      }
    } catch (error) {
      console.error('Error acknowledging warning:', error);
    }
  };

  useEffect(() => {
    fetchWarnings();
    
    // Check for new warnings periodically
    const interval = setInterval(fetchWarnings, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (!showWarning || warnings.length === 0) {
    return null;
  }

  const currentWarning = warnings[currentWarningIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      {/* Blurred background effect */}
      <div className="absolute inset-0 backdrop-blur-sm"></div>
      
      {/* Warning Modal */}
      <div className="relative bg-white rounded-lg max-w-md w-full shadow-2xl animate-pulse">
        {/* Header */}
        <div className="bg-red-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold">⚠️</span>
              </div>
              <div>
                <h2 className="text-lg font-bold">Warning Notice</h2>
                <p className="text-sm opacity-90">
                  {warnings.length > 1 && `${currentWarningIndex + 1} of ${warnings.length}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Your account has received a warning
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-800 font-medium mb-1">Reason:</p>
              <p className="text-red-700">{currentWarning.reason}</p>
            </div>
          </div>

          {currentWarning.complaintId && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Related to complaint:</p>
              <p className="text-sm text-gray-800">
                {currentWarning.complaintId.description?.substring(0, 100)}...
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Submitted: {new Date(currentWarning.complaintId.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              <strong>Important:</strong> Multiple warnings may result in account suspension or blacklisting. 
              Please ensure all future submissions follow our community guidelines.
            </p>
          </div>

          <div className="text-xs text-gray-500 mb-6">
            Warning issued on: {new Date(currentWarning.givenAt).toLocaleDateString()} at {new Date(currentWarning.givenAt).toLocaleTimeString()}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => acknowledgeWarning(currentWarning._id)}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium transition-colors duration-200"
            >
              I Understand - Acknowledge Warning
            </button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                You must acknowledge this warning to continue using the platform
              </p>
            </div>
          </div>
        </div>

        {/* Progress indicator for multiple warnings */}
        {warnings.length > 1 && (
          <div className="px-6 pb-4">
            <div className="flex gap-1">
              {warnings.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${
                    index <= currentWarningIndex ? 'bg-red-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pulsing effect overlay */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }
        .animate-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default WarningNotification;