import React, { useState } from 'react';

const DepartmentRejectButton = ({ complaint, onReject }) => {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const predefinedReasons = [
    'Insufficient information provided',
    'Duplicate complaint',
    'Not under department jurisdiction',
    'False or misleading information',
    'Complaint lacks evidence',
    'Issue already resolved',
    'Outside service area',
    'Other'
  ];

  // Debug function to check token
  const debugToken = async () => {
    try {
      // Try department token first, fallback to regular token
      const departmentToken = localStorage.getItem('departmentToken');
      const regularToken = localStorage.getItem('token');
      const token = departmentToken || regularToken;
      
      console.log('[DEBUG] Department token exists:', !!departmentToken);
      console.log('[DEBUG] Regular token exists:', !!regularToken);
      console.log('[DEBUG] Using token:', departmentToken ? 'departmentToken' : 'token');
      
      if (!token) {
        console.log('[DEBUG] No token found in localStorage');
        alert('No token found! Please log in again.');
        return;
      }

      // Decode JWT token (client-side decode - not secure but useful for debugging)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.log('[DEBUG] Invalid token format');
        alert('Invalid token format! Please log in again.');
        return;
      }

      // Decode the payload (middle part)
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('[DEBUG] Token payload:', payload);
        
        // Show user what type of user they are logged in as
        const userType = payload.type || 'unknown';
        const userRole = payload.role || 'unknown';
        const userId = payload.id || payload.userId || 'unknown';
        
        alert(`Current login details:
        User Type: ${userType}
        User Role: ${userRole}  
        User ID: ${userId}
        
        Expected: Type should be "department" and Role should be "department"
        
        ${userType === 'department' ? '✅ Type is correct' : '❌ Type should be "department"'}
        ${userRole === 'department' ? '✅ Role is correct' : '❌ Role should be "department"'}
        
        ${userType !== 'department' || userRole !== 'department' ? 
          'Please log out and log in as a department user using credentials like ROAD_CHD_001 / ROAD_CHD_001' : 
          'Login appears correct, checking server response...'}`);
        
      } catch (decodeError) {
        console.log('[DEBUG] Error decoding token payload:', decodeError);
        alert('Error decoding token! Please log in again.');
        return;
      }

      // Also call server debug endpoint
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/department/debug-token`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      console.log('[DEBUG] Server token debug response:', {
        status: response.status,
        data: data
      });

    } catch (error) {
      console.error('[DEBUG] Token debug error:', error);
      alert('Error checking token: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      // Use department token first, fallback to regular token
      const departmentToken = localStorage.getItem('departmentToken');
      const regularToken = localStorage.getItem('token');
      const token = departmentToken || regularToken;
      
      // Add debugging information
      console.log('[REJECT-DEBUG] Attempting to reject complaint:', {
        complaintId: complaint._id,
        reason: reason,
        usingDepartmentToken: !!departmentToken,
        usingRegularToken: !!regularToken && !departmentToken,
        tokenFound: !!token,
        complaintStatus: complaint.status,
        assignedDepartment: complaint.assignedDepartment || 'Not assigned'
      });
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/department/reject-complaint/${complaint._id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: reason,
            additionalNotes: additionalNotes.trim() || undefined
          })
        }
      );

      const data = await response.json();
      
      console.log('[REJECT-DEBUG] Server response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (response.ok) {
        alert('Complaint rejected successfully');
        setShowModal(false);
        setReason('');
        setAdditionalNotes('');
        if (onReject) onReject(complaint._id, data);
      } else {
        throw new Error(data.error || 'Failed to reject complaint');
      }
    } catch (error) {
      console.error('Error rejecting complaint:', error);
      alert(`Error rejecting complaint: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          debugToken(); // Debug the token first
          setShowModal(true);
        }}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
        disabled={complaint.status === 'rejected_by_department'}
      >
        {complaint.status === 'rejected_by_department' ? 'Rejected' : 'Reject Complaint'}
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(false);
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reject Complaint
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModal(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Complaint:</strong> {complaint.description?.substring(0, 100)}...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Submitted on: {new Date(complaint.createdAt).toLocaleDateString()}
                </p>
              </div>

              <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                      value={additionalNotes}
                      onChange={(e) => setReason(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows="3"
                    placeholder="Any additional information..."
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModal(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || !reason.trim()}
                  >
                    {isSubmitting ? 'Rejecting...' : 'Reject Complaint'}
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

export default DepartmentRejectButton;