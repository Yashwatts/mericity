import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faFolderOpen, faCheckCircle, faMap, faUsers, faExclamationTriangle, faTrophy, faGift } from "@fortawesome/free-solid-svg-icons";
import ComplaintForm from "../components/ComplaintForm";
import ExploreComplaints from "../components/ExploreComplaints";
import CommunityComplaints from "../components/CommunityComplaints";
import Janawaaz from "../components/Janawaaz";
import Rewards from "../components/Rewards";
import NotificationIcon from "../components/NotificationIcon";
import ChatModal from "../components/ChatModal";
import ChatButton from "../components/ChatButton";
import WarningNotification from "../components/WarningNotification";
import { ComplaintFormModal, ChangePasswordModal, EditDetailsModal } from "../components/ResponsiveModals";

function ResponsiveDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatComplaint, setChatComplaint] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleChatOpen = (complaint) => {
    setChatComplaint(complaint);
    setShowChatModal(true);
  };

  const handleChatClose = () => {
    setShowChatModal(false);
    setChatComplaint(null);
    // Refresh complaints immediately to update unread counts
    fetchComplaints();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Only close sidebar on mobile devices
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Redirect to login if no token
  useEffect(() => {
    if (!token) {
      navigate("/");
    }
  }, [token, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('[data-profile-dropdown]')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Handle window resize to auto-adjust sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Desktop: sidebar should be open by default
        setSidebarOpen(true);
      } else {
        // Mobile: sidebar should be closed by default
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (token) {
      // Fetch complaints
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('API Response:', data);
          console.log('Full complaint objects:', data.complaints);
          if (data.complaints && data.complaints.length > 0) {
            console.log('All complaint statuses:', data.complaints.map(c => ({ id: c._id, status: c.status })));
            console.log('Rejected complaints:', data.complaints.filter(c => c.status === 'rejected'));
          }
          setComplaints(data.complaints || []);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching complaints:", error);
          setError("Failed to load complaints");
          setComplaints([]);
          setLoading(false);
        });

      // Fetch user details
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUserDetails(data.user);
          }
        })
        .catch((error) => {
          console.error("Error fetching user details:", error);
        });
    }
  }, [token]);

  // Filter complaints by status
  const openComplaints = complaints.filter((c) => c && (
    c.status === "pending" || 
    c.status === "in_progress" || 
    c.status === "pending_verification" || 
    c.status === "pending_manual_verification" ||
    c.status === "phone_verified" ||
    c.status === "pending_assignment"
  ));
  const closedComplaints = complaints.filter((c) => c && (
    c.status === "resolved" || 
    c.status === "closed" || 
    c.status === "rejected" ||
    c.status === "rejected_by_user" ||
    c.status === "rejected_no_answer"
  ));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="text-red-500 text-5xl mb-4">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <p className="text-red-600 text-lg mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Warning Notification Overlay */}
      <WarningNotification />
      
      <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-white text-gray-800 z-50
        transition-all duration-300 ease-in-out border-r border-gray-200
        ${sidebarOpen ? 'w-72 shadow-lg lg:shadow-none' : 'w-0 lg:w-0'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-hidden
      `}>
        <div className="py-6 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="px-4 pb-6 border-b border-gray-200 mb-4 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-full 
                         transition-all duration-200 w-8 h-8 flex items-center justify-center
                         hover:bg-gray-100 hover:text-gray-800"
            >
              <i className="fas fa-bars text-sm"></i>
            </button>
            <h2 className="text-gray-800 text-xl font-semibold tracking-tight flex items-center gap-2">
              <FontAwesomeIcon icon={faBuilding} className="text-blue-600" />
              MeriCity
            </h2>
          </div>
          
          {/* Navigation Items */}
          <div className="px-3 flex-1 overflow-y-auto">
            <nav className="space-y-1">
              <button
                onClick={() => handleTabChange("open")}
                className={`
                  w-full py-3 px-4 border-none rounded-lg cursor-pointer text-left 
                  text-sm transition-all duration-200 flex items-center gap-3
                  ${activeTab === "open" 
                    ? 'bg-blue-50 text-blue-600 font-medium shadow-sm' 
                    : 'bg-transparent text-gray-600 font-normal hover:bg-gray-100 hover:text-gray-800'
                  }
                `}
              >
                <i className="fas fa-folder-open text-base w-5"></i>
                <span>Open Complaints</span>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {openComplaints.length}
                </span>
              </button>
              
              <button
                onClick={() => handleTabChange("closed")}
                className={`
                  w-full py-3 px-4 border-none rounded-lg cursor-pointer text-left 
                  text-sm transition-all duration-200 flex items-center gap-3
                  ${activeTab === "closed" 
                    ? 'bg-green-50 text-green-600 font-medium shadow-sm' 
                    : 'bg-transparent text-gray-600 font-normal hover:bg-gray-100 hover:text-gray-800'
                  }
                `}
              >
                <i className="fas fa-check-circle text-base w-5"></i>
                <span>Closed Complaints</span>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {closedComplaints.length}
                </span>
              </button>
              
              <button
                onClick={() => handleTabChange("explore")}
                className={`
                  w-full py-3 px-4 border-none rounded-lg cursor-pointer text-left 
                  text-sm transition-all duration-200 flex items-center gap-3
                  ${activeTab === "explore" 
                    ? 'bg-purple-50 text-purple-600 font-medium shadow-sm' 
                    : 'bg-transparent text-gray-600 font-normal hover:bg-gray-100 hover:text-gray-800'
                  }
                `}
              >
                <i className="fas fa-map-marked-alt text-base w-5"></i>
                <span>Explore Map</span>
              </button>
              
              <button
                onClick={() => handleTabChange("community")}
                className={`
                  w-full py-3 px-4 border-none rounded-lg cursor-pointer text-left 
                  text-sm transition-all duration-200 flex items-center gap-3
                  ${activeTab === "community" 
                    ? 'bg-orange-50 text-orange-600 font-medium shadow-sm' 
                    : 'bg-transparent text-gray-600 font-normal hover:bg-gray-100 hover:text-gray-800'
                  }
                `}
              >
                <i className="fas fa-users text-base w-5"></i>
                <span>Community</span>
              </button>
              
              <button
                onClick={() => handleTabChange("janawaaz")}
                className={`
                  w-full py-3 px-4 border-none rounded-lg cursor-pointer text-left 
                  text-sm transition-all duration-200 flex items-center gap-3
                  ${activeTab === "janawaaz" 
                    ? 'bg-yellow-50 text-yellow-600 font-medium shadow-sm' 
                    : 'bg-transparent text-gray-600 font-normal hover:bg-gray-100 hover:text-gray-800'
                  }
                `}
              >
                <i className="fas fa-trophy text-base w-5"></i>
                <span>Janawaaz</span>
              </button>
              
              <button
                onClick={() => handleTabChange("rewards")}
                className={`
                  w-full py-3 px-4 border-none rounded-lg cursor-pointer text-left 
                  text-sm transition-all duration-200 flex items-center gap-3
                  ${activeTab === "rewards" 
                    ? 'bg-yellow-50 text-yellow-600 font-medium shadow-sm' 
                    : 'bg-transparent text-gray-600 font-normal hover:bg-gray-100 hover:text-gray-800'
                  }
                `}
              >
                <FontAwesomeIcon icon={faGift} className="text-base w-5" />
                <span>Rewards</span>
              </button>
            </nav>
          </div>
          
          {/* Logout Button */}
          <div className="px-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-transparent text-red-600 border border-gray-200 
                         rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 
                         flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300"
            >
              <i className="fas fa-sign-out-alt text-sm"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 min-h-screen transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'lg:ml-72' : 'ml-0'
      }`}>
        {/* Header */}
        <div className="bg-white text-gray-800 px-4 lg:px-6 py-4 shadow-sm border-b border-gray-200 
                        flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Hamburger Menu Button - Only show when sidebar is closed */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-full 
                           transition-all duration-200 w-10 h-10 flex items-center justify-center
                           hover:bg-gray-100 hover:text-gray-800"
                title="Open Sidebar"
              >
                <i className="fas fa-bars text-lg"></i>
              </button>
            )}
            
            <div className="flex items-center gap-3">
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-800 truncate flex items-center gap-3">
                {activeTab === "open" && <><FontAwesomeIcon icon={faFolderOpen} className="text-blue-600" /> Open Complaints</>}
                {activeTab === "closed" && <><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> Closed Complaints</>}
                {activeTab === "explore" && <><FontAwesomeIcon icon={faMap} className="text-purple-600" /> Explore Map</>}
                {activeTab === "community" && <><FontAwesomeIcon icon={faUsers} className="text-orange-600" /> Community</>}
                {activeTab === "janawaaz" && <><FontAwesomeIcon icon={faTrophy} className="text-yellow-600" /> Janawaaz</>}
                {activeTab === "rewards" && <><FontAwesomeIcon icon={faGift} className="text-yellow-600" /> Rewards</>}
              </h1>
            </div>
          </div>

          {/* Notification and Profile Buttons */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <NotificationIcon token={token} />
            
            {/* Profile Button */}
            <div className="relative" data-profile-dropdown>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-full 
                           transition-all duration-200 w-10 h-10 flex items-center justify-center
                           hover:bg-gray-100 hover:text-gray-800"
              >
                <i className="fas fa-user-circle text-2xl"></i>
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg 
                               shadow-lg z-50 min-w-48 py-2">
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowChangePasswordModal(true);
                    }}
                    className="w-full px-4 py-3 bg-transparent border-none text-left cursor-pointer 
                              text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50"
                  >
                    <i className="fas fa-key text-sm text-gray-500 w-4"></i>
                    Change Password
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowEditDetailsModal(true);
                    }}
                    className="w-full px-4 py-3 bg-transparent border-none text-left cursor-pointer 
                              text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-50"
                  >
                    <i className="fas fa-edit text-sm text-gray-500 w-4"></i>
                    Edit Details
                  </button>

                  <div className="h-px bg-gray-200 my-2"></div>

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-3 bg-transparent border-none text-left cursor-pointer 
                              text-sm text-red-600 flex items-center gap-3 hover:bg-red-50"
                  >
                    <i className="fas fa-sign-out-alt text-sm text-red-500 w-4"></i>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 lg:p-6">
          {/* Tab Content */}
          {activeTab === "open" && (
            <div className="space-y-6">
              {openComplaints.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                  {openComplaints.map((complaint) => (
                    <ComplaintCard 
                      key={complaint._id} 
                      complaint={complaint} 
                      onClick={() => setSelectedComplaint(complaint)}
                      onChatClick={handleChatOpen}
                      token={token}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={<FontAwesomeIcon icon={faFolderOpen} className="text-blue-600" />}
                  title="No open complaints"
                  description="You haven't submitted any complaints yet."
                  actionButton={
                    <button
                      onClick={() => setShowComplaintForm(true)}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 
                                transition-colors font-medium"
                    >
                      Submit First Complaint
                    </button>
                  }
                />
              )}
            </div>
          )}

          {activeTab === "closed" && (
            <div className="space-y-6">
              {closedComplaints.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                  {closedComplaints.map((complaint) => (
                    <ComplaintCard 
                      key={complaint._id} 
                      complaint={complaint} 
                      onClick={() => setSelectedComplaint(complaint)}
                      variant={(complaint.status === "rejected" || complaint.status === "rejected_by_user" || complaint.status === "rejected_no_answer") ? "rejected" : "resolved"}
                      onChatClick={handleChatOpen}
                      token={token}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={<FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />}
                  title="No closed complaints"
                  description="No complaints have been resolved yet."
                />
              )}
            </div>
          )}

          {activeTab === "explore" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <ExploreComplaints token={token} />
            </div>
          )}

          {activeTab === "community" && (
            <div className="space-y-6">
              <CommunityComplaints token={token} />
            </div>
          )}

          {activeTab === "janawaaz" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-10rem)]">
              <Janawaaz token={token} />
            </div>
          )}

          {activeTab === "rewards" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto h-[calc(100vh-10rem)]">
              <Rewards />
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      {!showComplaintForm && (
        <button
          onClick={() => setShowComplaintForm(true)}
          className="fixed bottom-6 right-6 w-14 h-14 lg:w-16 lg:h-16 bg-blue-600 text-white 
                    rounded-full border-none text-2xl cursor-pointer shadow-lg z-40
                    transition-all duration-300 hover:bg-blue-700 hover:scale-110 hover:shadow-xl
                    flex items-center justify-center"
        >
          <i className="fas fa-plus"></i>
        </button>
      )}

      {/* Modals */}
      {selectedComplaint && (
        <ComplaintModal 
          complaint={selectedComplaint} 
          onClose={() => setSelectedComplaint(null)}
          onChatClick={handleChatOpen}
          token={token}
        />
      )}
      
      {showComplaintForm && (
        <ComplaintFormModal 
          token={token}
          setComplaints={setComplaints}
          onClose={() => setShowComplaintForm(false)}
        />
      )}
      
      {showChangePasswordModal && (
        <ChangePasswordModal 
          token={token}
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}
      
      {showEditDetailsModal && (
        <EditDetailsModal 
          token={token}
          userDetails={userDetails}
          setUserDetails={setUserDetails}
          onClose={() => setShowEditDetailsModal(false)}
        />
      )}
      
      {showChatModal && chatComplaint && (
        <ChatModal
          complaint={chatComplaint}
          onClose={handleChatClose}
          token={token}
          userRole="user"
        />
      )}
    </div>
    </>
  );
}

// Complaint Card Component
const ComplaintCard = ({ complaint, onClick, variant = "pending", onChatClick, token }) => {
  const isResolved = variant === "resolved";
  const isRejected = variant === "rejected";
  
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-lg p-4 shadow-sm border cursor-pointer 
        transition-all duration-300 hover:shadow-md hover:-translate-y-1
        ${isResolved ? 'border-l-4 border-l-green-500' : 
          isRejected ? 'border-l-4 border-l-red-500' :
          'border-gray-200 hover:border-blue-300'}
      `}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`
            px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide
            ${complaint.status === "pending" 
              ? 'bg-yellow-100 text-yellow-800' 
              : complaint.status === "in_progress"
                ? 'bg-green-100 text-green-800'
                : (complaint.status === "rejected" || complaint.status === "rejected_by_user" || complaint.status === "rejected_no_answer")
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
            }
          `}>
            {complaint.status === "in_progress" ? "🔄 IN PROGRESS" : 
             complaint.status === "pending" ? "⏳ PENDING" : 
             complaint.status === "rejected" ? "❌ REJECTED" :
             complaint.status === "resolved" ? "✅ RESOLVED" :
             complaint.status}
          </span>
          {complaint.priority && (
            <span className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${complaint.priority === "High" 
                ? 'bg-red-100 text-red-800' 
                : complaint.priority === "Medium" 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }
            `}>
              {complaint.priority}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {new Date(complaint.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })}
        </span>
      </div>

      {/* Image */}
      {complaint.imageUrl && (
        <div className="mb-3">
          <img 
            src={complaint.imageUrl} 
            alt="Complaint" 
            className="w-full h-32 object-cover rounded-md border border-gray-200"
          />
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-gray-700 line-clamp-3 mb-3 leading-relaxed">
        {complaint.description}
      </p>

      {/* Rejection Reason (only for rejected complaints) */}
      {complaint.status === "rejected" && complaint.rejectionReason && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <div className="flex items-center gap-2 text-red-700">
            <i className="fas fa-times-circle"></i>
            <strong>Rejection Reason:</strong> <span className="text-red-800">{complaint.rejectionReason}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <i className="fas fa-phone"></i>
          <span className="truncate">{complaint.phone}</span>
        </div>
        
        {/* Right side - Status and Chat */}
        <div className="flex items-center gap-2">
          {/* Chat Button for in_progress complaints only */}
          {(['in_progress'].includes(complaint.status)) && onChatClick && token && (
            <ChatButton
              complaint={complaint}
              onClick={() => onChatClick(complaint)}
              token={token}
              className="text-xs px-2 py-1"
            />
          )}
          
          {isResolved && (
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <i className="fas fa-check"></i>
              <span>Resolved</span>
            </div>
          )}
          {isRejected && (
            <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <i className="fas fa-times"></i>
              <span>Rejected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ icon, title, description, actionButton }) => (
  <div className="text-center py-12 px-4">
    <div className="text-6xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
    {actionButton}
  </div>
);

// Complaint Modal Component
const ComplaintModal = ({ complaint, onClose, onChatClick, token }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start lg:items-center justify-center 
                  z-50 p-4 pt-8 lg:pt-4 backdrop-blur-sm">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto shadow-xl">
      {/* Modal header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Complaint Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>
      
      {/* Modal content */}
      <div className="p-6 space-y-6">
        {/* Status and priority */}
        <div className="flex gap-2 flex-wrap">
          <span className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${complaint.status === "pending" 
              ? 'bg-yellow-100 text-yellow-800' 
              : complaint.status === "in_progress"
                ? 'bg-green-100 text-green-800'
                : complaint.status === "rejected"
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
            }
          `}>
            {complaint.status === "in_progress" ? "🔄 IN PROGRESS" : 
             complaint.status === "pending" ? "⏳ PENDING" : 
             complaint.status === "rejected" ? "❌ REJECTED" :
             complaint.status === "resolved" ? "✅ RESOLVED" :
             complaint.status}
          </span>
          {complaint.priority && (
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${complaint.priority === "High" 
                ? 'bg-red-100 text-red-800' 
                : complaint.priority === "Medium" 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }
            `}>
              {complaint.priority} Priority
            </span>
          )}
        </div>

        {/* Rejection Reason (for rejected complaints) */}
        {complaint.status === "rejected" && complaint.rejectionReason && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center gap-2">
              <i className="fas fa-times-circle text-red-600"></i>
              Rejection Reason
            </h3>
            <p className="text-gray-700 bg-red-50 p-4 rounded-lg border border-red-200">
              {complaint.rejectionReason}
            </p>
          </div>
        )}

        {/* Image */}
        {complaint.imageUrl && (
          <div>
            <img 
              src={complaint.imageUrl} 
              alt="Complaint" 
              className="w-full h-64 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}

        {/* Description */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Description</h3>
          <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border">
            {complaint.description}
          </p>
        </div>

        {/* Reason for Priority (only for pending complaints) */}
        {complaint.reason && complaint.status === "pending" && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center gap-2">
              <i className="fas fa-info-circle text-blue-600"></i>
              Priority Reason
            </h3>
            <p className="text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
              {complaint.reason}
            </p>
          </div>
        )}

        {/* Audio */}
        {(complaint.audio || complaint.audioUrl) && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center gap-2">
              <i className="fas fa-volume-up text-blue-600"></i>
              Voice Message
            </h3>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <audio controls className="w-full">
                <source src={complaint.audioUrl || complaint.audio} type="audio/mpeg" />
                <source src={complaint.audioUrl || complaint.audio} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-phone text-blue-600"></i>
              <span className="text-sm font-medium text-gray-600">Contact</span>
            </div>
            <p className="text-gray-800 font-medium">{complaint.phone}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-calendar text-blue-600"></i>
              <span className="text-sm font-medium text-gray-600">Date</span>
            </div>
            <p className="text-gray-800 font-medium">
              {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {complaint.location?.city && (
            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-map-marker-alt text-blue-600"></i>
                <span className="text-sm font-medium text-gray-600">Location</span>
              </div>
              <p className="text-gray-800">
                {complaint.location.address || `${complaint.location.city}, ${complaint.location.state}`}
              </p>
            </div>
          )}
        </div>

        {/* Chat Button for in_progress complaints only */}
        {(['in_progress'].includes(complaint.status)) && onChatClick && token && (
          <div className="mt-6 flex justify-center">
            <ChatButton
              complaint={complaint}
              onClick={() => onChatClick(complaint)}
              token={token}
              className="px-6 py-3 text-base"
            />
          </div>
        )}
      </div>
    </div>
  </div>
);

export default ResponsiveDashboard;