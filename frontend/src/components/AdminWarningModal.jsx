import React, { useState } from 'react';

const AdminWarningModal = ({ show, onClose, onSubmit, userPhone }) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(reason, notes.trim() || undefined);
      setReason('');
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Error submitting warning:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setReason('');
    setNotes('');
    onClose();
  };

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (!isSubmitting) handleClose();
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Give Warning to User
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          <div className="mb-4 p-3 bg-yellow-50 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>User Phone:</strong> {userPhone}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              This will give a warning to the user and automatically reject the complaint.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warning Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
                disabled={isSubmitting}
              >
                <option value="">Select a reason...</option>
                {predefinedReasons.map((reasonOption, index) => (
                  <option key={index} value={reasonOption}>
                    {reasonOption}
                  </option>
                ))}
              </select>
            </div>

            {reason === 'Other' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Reason
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Please specify the reason..."
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}

            {reason && reason !== 'Other' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={3}
                  placeholder="Any additional information about this warning..."
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !reason.trim()}
              >
                {isSubmitting ? 'Processing...' : 'Give Warning'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminWarningModal;