import React, { useState, useEffect } from 'react';

const AdminWarningSystem = ({ userId, complaintId, userName }) => {
  const [showModal, setShowModal] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userWarnings, setUserWarnings] = useState(null);
  const [showBlacklistConfirm, setShowBlacklistConfirm] = useState(false);

  const predefinedReasons = [
    'False complaint submission',
    'Inappropriate language or behavior',
    'Repeated frivolous complaints',
    'Misuse of the platform',
    'Providing misleading information',
    'Spam or duplicate submissions',
    'Violation of community guidelines',
    'Other'
  ];

  // Fetch user warning history
  const fetchUserWarnings = async () => {
    try {
      // Use admin token
      const adminToken = localStorage.getItem('adminToken');
      const regularToken = localStorage.getItem('token');
      const token = adminToken || regularToken;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/user-warnings/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setWarningCount(data.warningCount);
        setUserWarnings(data);
      }
    } catch (error) {
      console.error('Error fetching user warnings:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserWarnings();
    }
  }, [userId]);

  const handleGiveWarning = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      // Use admin token
      const adminToken = localStorage.getItem('adminToken');
      const regularToken = localStorage.getItem('token');
      const token = adminToken || regularToken;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/give-warning/${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: reason,
            complaintId: complaintId,
            notes: notes.trim() || undefined
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(`Warning given successfully. User now has ${data.warningCount} warnings.`);
        setWarningCount(data.warningCount);
        setShowModal(false);
        setReason('');
        setNotes('');
        fetchUserWarnings(); // Refresh warning data
      } else {
        throw new Error(data.error || 'Failed to give warning');
      }
    } catch (error) {
      console.error('Error giving warning:', error);
      alert(`Error giving warning: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlacklistUser = async () => {
    const blacklistReason = prompt('Enter reason for blacklisting this user:');
    if (!blacklistReason?.trim()) return;

    try {
      // Use admin token
      const adminToken = localStorage.getItem('adminToken');
      const regularToken = localStorage.getItem('token');
      const token = adminToken || regularToken;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/blacklist-user/${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: blacklistReason.trim(),
            notes: 'Blacklisted from admin panel'
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert('User has been blacklisted successfully.');
        fetchUserWarnings(); // Refresh warning data
      } else {
        throw new Error(data.error || 'Failed to blacklist user');
      }
    } catch (error) {
      console.error('Error blacklisting user:', error);
      alert(`Error blacklisting user: ${error.message}`);
    }
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm transition-colors duration-200 flex items-center gap-1"
        >
          <span>Give Warning</span>
          {warningCount > 0 && (
            <span className="bg-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">
              {warningCount}
            </span>
          )}
        </button>
        
        {userWarnings && !userWarnings.isBlacklisted && (
          <button
            onClick={() => setShowBlacklistConfirm(true)}
            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-colors duration-200"
          >
            Blacklist User
          </button>
        )}

        {userWarnings && userWarnings.isBlacklisted && (
          <span className="px-3 py-1 bg-red-900 text-white rounded-md text-sm">
            BLACKLISTED
          </span>
        )}
      </div>

      {/* Blacklist Confirmation Modal */}
      {showBlacklistConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              Confirm Blacklist
            </h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to blacklist user <strong>{userName}</strong>? 
              This action will permanently restrict their access to the platform.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Current warnings: {warningCount}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBlacklistConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBlacklistConfirm(false);
                  handleBlacklistUser();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Blacklist User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Give Warning to {userName}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="mb-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Current Warnings:</strong> {warningCount}
                </p>
                {warningCount >= 2 && (
                  <p className="text-xs text-yellow-700 mt-1">
                    ⚠️ User has multiple warnings. Consider blacklisting if behavior continues.
                  </p>
                )}
              </div>

              <form onSubmit={handleGiveWarning}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Warning *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select a reason...</option>
                    {predefinedReasons.map((predefinedReason) => (
                      <option key={predefinedReason} value={predefinedReason}>
                        {predefinedReason}
                      </option>
                    ))}
                  </select>
                </div>

                {reason === 'Other' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Reason *
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Enter custom reason..."
                      required={reason === 'Other'}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    rows="3"
                    placeholder="Any additional information..."
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || !reason.trim()}
                  >
                    {isSubmitting ? 'Giving Warning...' : 'Give Warning'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminWarningSystem;