import React from "react";

// Complaint Form Modal Component
export const ComplaintFormModal = ({ token, setComplaints, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start lg:items-center justify-center 
                  z-50 p-2 lg:p-4 pt-4 lg:pt-4 backdrop-blur-sm">
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-auto shadow-xl 
                    relative animate-in fade-in duration-300">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 border border-gray-200 
                   text-gray-500 hover:text-gray-700 p-2 rounded-full shadow-sm
                   transition-all duration-200 hover:bg-gray-100"
      >
        <i className="fas fa-times text-lg"></i>
      </button>

      {/* Form Content */}
      <div className="p-0">
        <ComplaintForm 
          token={token} 
          setComplaints={setComplaints} 
          onClose={onClose}
        />
      </div>
    </div>
  </div>
);

// Change Password Modal Component
export const ChangePasswordModal = ({ token, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start lg:items-center justify-center 
                  z-50 p-4 pt-8 lg:pt-4 backdrop-blur-sm">
    <div className="bg-white rounded-lg max-w-md w-full shadow-xl animate-in fade-in duration-300">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
          <i className="fas fa-key text-blue-600"></i>
          Change Password
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        
        if (newPassword !== confirmPassword) {
          alert('New passwords do not match');
          return;
        }

        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/user/change-password`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ currentPassword, newPassword })
        })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            alert(data.error);
          } else {
            alert('Password changed successfully!');
            onClose();
          }
        })
        .catch(error => {
          console.error('Error changing password:', error);
          alert('Failed to change password. Please try again.');
        });
      }} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>
          <input
            type="password"
            name="currentPassword"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                      focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter current password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <input
            type="password"
            name="newPassword"
            required
            minLength="6"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                      focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter new password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength="6"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                      focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Confirm new password"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 border border-gray-300 
                      rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-3 bg-blue-600 text-white border border-blue-600 
                      rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Change Password
          </button>
        </div>
      </form>
    </div>
  </div>
);

// Edit Details Modal Component
export const EditDetailsModal = ({ token, userDetails, setUserDetails, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start lg:items-center justify-center 
                  z-50 p-4 pt-8 lg:pt-4 backdrop-blur-sm">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto shadow-xl 
                    animate-in fade-in duration-300">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
          <i className="fas fa-edit text-blue-600"></i>
          Edit Profile Details
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updatedDetails = {
          name: formData.get('name'),
          email: formData.get('email'),
          city: formData.get('city'),
          state: formData.get('state'),
          phone: formData.get('phone')
        };
        
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/user/profile`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updatedDetails)
        })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            alert(data.error);
          } else {
            alert('Profile updated successfully!');
            setUserDetails({...userDetails, ...updatedDetails});
            onClose();
          }
        })
        .catch(error => {
          console.error('Error updating profile:', error);
          alert('Failed to update profile. Please try again.');
        });
      }} className="p-6 space-y-6">
        
        {/* Name and Email Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              defaultValue={userDetails.name || ''}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                        focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              defaultValue={userDetails.email || ''}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                        focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your email"
            />
          </div>
        </div>

        {/* City and State Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              name="city"
              defaultValue={userDetails.city || ''}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                        focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your city"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <input
              type="text"
              name="state"
              defaultValue={userDetails.state || ''}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                        focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your state"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            defaultValue={userDetails.phone || ''}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                      focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter your phone number"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 border border-gray-300 
                      rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 text-white border border-blue-600 
                      rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
);

// Import ComplaintForm component (assuming it exists)
import ComplaintForm from "../components/ComplaintForm";