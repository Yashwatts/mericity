import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FilterControls from '../components/FilterControls';
import { useComplaintFilters } from '../components/useComplaintFilters';
import Graph from '../components/Graph';
import AdminMapView from '../components/AdminMapView';
import ChatModal from '../components/ChatModal';
import ChatButton from '../components/ChatButton';
import DepartmentAnalytics from '../components/DepartmentAnalytics';
import AdminWarningModal from '../components/AdminWarningModal';
import AdminBlacklistModal from '../components/AdminBlacklistModal';
import AdminCommunityComplaints from '../components/AdminCommunityComplaints';
import { 
  faBuilding, 
  faSignOutAlt, 
  faChartBar, 
  faClock, 
  faSpinner, 
  faCheckCircle, 
  faMapMarkerAlt, 
  faPhone, 
  faBolt, 
  faCalendarAlt, 
  faEye, 
  faMicrophone, 
  faFileText, 
  faHome, 
  faCity, 
  faMailBulk, 
  faTimes,
  faExclamationTriangle,
  faQuestionCircle,
  faImage,
  faUser,
  faUsers,
  faClipboardList,
  faChevronDown,
  faInfoCircle,
  faExclamationCircle,
  faBan
} from '@fortawesome/free-solid-svg-icons';

function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminInfo, setAdminInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatComplaint, setChatComplaint] = useState(null);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0, rejected: 0, total: 0, unassigned: 0, departmentAssigned: 0 });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState("home"); // Add state for page navigation
  const [isTransitioning, setIsTransitioning] = useState(false); // Add transition state
  
  // Modal states for warning and blacklisting
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [selectedUserPhone, setSelectedUserPhone] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState("");
  
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  // Use the custom filtering hook
  const {
    dateFilter,
    setDateFilter,
    priorityFilter,
    setPriorityFilter,
    getFilteredAndSortedComplaints
  } = useComplaintFilters(complaints);

  const fetchComplaints = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/admin/complaints`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setComplaints(data.complaints || []);
        setAdminInfo(prev => ({ ...prev, ...data.admin }));
        
        // Calculate stats with new workflow properties
        const allComplaints = data.complaints || [];
        
        const newStats = {
          pending: allComplaints.filter(c => c.status === "pending" || c.status === "rejected_by_department").length,
          in_progress: allComplaints.filter(c => c.status === "in_progress").length,
          resolved: allComplaints.filter(c => c.status === "resolved").length,
          rejected: allComplaints.filter(c => c.status === "rejected").length,
          total: allComplaints.length,
          awaiting_approval: allComplaints.filter(c => c.status === "pending" || c.status === "rejected_by_department").length,
          with_departments: allComplaints.filter(c => c.status === "in_progress" && c.assignedDepartment).length,
          unassigned_approved: allComplaints.filter(c => c.status === "in_progress" && !c.assignedDepartment).length,
        };
        setStats(newStats);
      } else {
        setError(data.error || "Failed to fetch complaints");
      }
    } catch (error) {
      console.error("Fetch complaints error:", error);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }

    const storedAdminInfo = localStorage.getItem("adminInfo");
    if (storedAdminInfo) {
      setAdminInfo(JSON.parse(storedAdminInfo));
    }

    fetchComplaints();
  }, [token, navigate, fetchComplaints]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown) {
        // Check if click is outside the dropdown container
        const dropdownContainer = event.target.closest('[data-profile-dropdown]');
        if (!dropdownContainer) {
          setShowProfileDropdown(false);
        }
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const approveComplaint = async (complaintId, comment = "") => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/admin/complaints/${complaintId}/approve`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ comment })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        setComplaints(prev => 
          prev.map(complaint => 
            complaint._id === complaintId 
              ? { ...complaint, status: "in_progress" }
              : complaint
          )
        );
        
        // Refresh stats
        fetchComplaints();
        
        alert(data.message || "Complaint approved successfully!");
        if (data.autoAssigned) {
          alert(`Complaint automatically assigned to ${data.complaint.assignedDepartment?.name || 'department'}!`);
        }
      } else {
        alert(data.error || "Failed to approve complaint");
      }
    } catch (error) {
      console.error("Approve complaint error:", error);
      alert("Network error");
    }
  };

  const rejectComplaint = async (complaintId, reason) => {
    if (!reason || reason.trim() === "") {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/admin/complaints/${complaintId}/reject`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Refresh the complaints list
        fetchComplaints();
        alert(data.message || "Complaint rejected successfully!");
      } else {
        alert(data.error || "Failed to reject complaint");
      }
    } catch (error) {
      console.error("Reject complaint error:", error);
      alert("Network error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminInfo");
    navigate("/admin");
  };

  // Warning and Blacklist Functions
  // New functions to trigger modals instead of prompts
  const handleOpenWarningModal = (phone, complaintId) => {
    setSelectedUserPhone(phone);
    setSelectedComplaintId(complaintId);
    setShowWarningModal(true);
  };

  const handleOpenBlacklistModal = (phone) => {
    setSelectedUserPhone(phone);
    setShowBlacklistModal(true);
  };

  // Updated warning function (now called from modal)
  const handleGiveWarning = async (phone, complaintId, reason, notes = '') => {
    try {
      // First, find the userId by phone number
      const adminToken = localStorage.getItem('adminToken');
      const regularToken = localStorage.getItem('token');
      const token = adminToken || regularToken;
      
      // Get user by phone
      const userResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/user-by-phone/${phone}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const userData = await userResponse.json();
      
      if (!userResponse.ok) {
        throw new Error(userData.error || 'Failed to find user');
      }

      const userId = userData.user._id;
      
      // Now give warning using userId
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
            notes: notes?.trim() || undefined
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(`Warning given successfully. User now has ${data.warningCount} warnings.`);
        fetchComplaints(); // Refresh complaints to show status change
        setShowWarningModal(false); // Close modal
      } else {
        throw new Error(data.error || 'Failed to give warning');
      }
    } catch (error) {
      console.error('Error giving warning:', error);
      alert(`Error giving warning: ${error.message}`);
    }
  };

  const handleBlacklistUser = async (phone, blacklistReason) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const regularToken = localStorage.getItem('token');
      const token = adminToken || regularToken;
      
      // First, find the userId by phone number
      const userResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/user-by-phone/${phone}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const userData = await userResponse.json();
      
      if (!userResponse.ok) {
        throw new Error(userData.error || 'Failed to find user');
      }

      const userId = userData.user._id;
      
      // Now blacklist using userId
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
        fetchComplaints(); // Refresh complaints to update any status changes
        setShowBlacklistModal(false); // Close modal
      } else {
        throw new Error(data.error || 'Failed to blacklist user');
      }
    } catch (error) {
      console.error('Error blacklisting user:', error);
      alert(`Error blacklisting user: ${error.message}`);
    }
  };

  // Page transition handler
  const handlePageChange = (newPage) => {
    if (newPage === currentPage) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 150);
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

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "#ffc107";
      case "in_progress": return "#17a2b8";
      case "resolved": return "#28a745";
      case "rejected": return "#dc3545";
      default: return "#6c757d";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending": return <FontAwesomeIcon icon={faClock} />;
      case "in_progress": return <FontAwesomeIcon icon={faSpinner} />;
      case "resolved": return <FontAwesomeIcon icon={faCheckCircle} />;
      case "rejected": return <FontAwesomeIcon icon={faTimes} />;
      default: return <FontAwesomeIcon icon={faQuestionCircle} />;
    }
  };

  // Home Page Content
  const renderHomePage = () => (
    <>
      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "25px"
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "1px solid #e9ecef",
          transition: "all 0.3s ease"
        }}>
          <h2 style={{ margin: "0", color: "#2c3e50", fontSize: "36px", fontWeight: "600" }}>{stats.total}</h2>
          <p style={{ margin: "8px 0 0 0", color: "#6c757d", fontSize: "14px", fontWeight: "500" }}>
            <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "6px", color: "#3498db" }} />Total City Complaints
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "1px solid #e9ecef",
          transition: "all 0.3s ease"
        }}>
          <h2 style={{ margin: "0", color: "#2c3e50", fontSize: "36px", fontWeight: "600" }}>{stats.awaiting_approval || 0}</h2>
          <p style={{ margin: "8px 0 0 0", color: "#6c757d", fontSize: "14px", fontWeight: "500" }}>
            <FontAwesomeIcon icon={faClock} style={{ marginRight: "6px", color: "#f39c12" }} />Awaiting Admin Approval
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "1px solid #e9ecef",
          transition: "all 0.3s ease"
        }}>
          <h2 style={{ margin: "0", color: "#2c3e50", fontSize: "36px", fontWeight: "600" }}>{stats.with_departments || 0}</h2>
          <p style={{ margin: "8px 0 0 0", color: "#6c757d", fontSize: "14px", fontWeight: "500" }}>
            <FontAwesomeIcon icon={faBuilding} style={{ marginRight: "6px", color: "#27ae60" }} />With Departments
          </p>
        </div>
      </div>
      
      {/* Status Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "20px",
        marginBottom: "30px"
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "1px solid #e9ecef"
        }}>
          <h2 style={{ margin: "0", color: "#2c3e50", fontSize: "32px", fontWeight: "600" }}>{stats.pending}</h2>
          <p style={{ margin: "5px 0 0 0", color: "#6c757d", fontSize: "14px" }}>
            <FontAwesomeIcon icon={faClock} style={{ marginRight: "5px", color: "#f39c12" }} />Pending
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "1px solid #e9ecef"
        }}>
          <h2 style={{ margin: "0", color: "#2c3e50", fontSize: "32px", fontWeight: "600" }}>{stats.in_progress}</h2>
          <p style={{ margin: "5px 0 0 0", color: "#6c757d", fontSize: "14px" }}>
            <FontAwesomeIcon icon={faSpinner} style={{ marginRight: "5px", color: "#3498db" }} />In Progress
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "1px solid #e9ecef"
        }}>
          <h2 style={{ margin: "0", color: "#2c3e50", fontSize: "32px", fontWeight: "600" }}>{stats.resolved}</h2>
          <p style={{ margin: "5px 0 0 0", color: "#6c757d", fontSize: "14px" }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: "5px", color: "#27ae60" }} />Resolved
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "1px solid #e9ecef"
        }}>
          <h2 style={{ margin: "0", color: "#2c3e50", fontSize: "32px", fontWeight: "600" }}>{stats.rejected}</h2>
          <p style={{ margin: "5px 0 0 0", color: "#6c757d", fontSize: "14px" }}>
            <FontAwesomeIcon icon={faTimes} style={{ marginRight: "5px", color: "#e74c3c" }} />Rejected
          </p>
        </div>
      </div>

      {/* Analytics Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        {/* Complaints Analytics Graph */}
        <Graph complaints={complaints} />
        
        {/* District Complaints Map */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0",
          maxHeight: "420px",
          overflow: "hidden"
        }}>
          <AdminMapView 
            complaints={complaints} 
            onComplaintSelect={setSelectedComplaint}
          />
        </div>
      </div>

      {/* Admin Workflow Overview Notice */}
     
    </>
  );

  // Complaints Page Content
  const renderComplaintsPage = () => (
    <>
      {/* Tabs */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "8px 8px 0 0",
        padding: "0",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
          {["pending", "in_progress", "resolved", "rejected"].map(status => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              style={{
                padding: "15px 25px",
                border: "none",
                backgroundColor: activeTab === status ? "#3498db" : "transparent",
                color: activeTab === status ? "white" : "#6c757d",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: activeTab === status ? "600" : "500",
                borderRadius: activeTab === status ? "8px 8px 0 0" : "0",
                transition: "all 0.3s"
              }}
            >
              {getStatusIcon(status)} {status.replace("_", " ").toUpperCase()} ({
                status === "pending" ? stats.pending :
                status === "in_progress" ? stats.in_progress :
                status === "resolved" ? stats.resolved :
                status === "rejected" ? stats.rejected :
                0
              })
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <FilterControls
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          filteredCount={getFilteredAndSortedComplaints(activeTab).length}
        />

        {/* Complaints List */}
        <div style={{ padding: "20px" }}>
          {getFilteredAndSortedComplaints(activeTab).length > 0 ? (
            <div style={{ display: "grid", gap: "16px" }}>
              {getFilteredAndSortedComplaints(activeTab).map(complaint => (
                <div
                  key={complaint._id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "16px",
                    backgroundColor: "white",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                    position: "relative",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.1)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.06)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Main Content Layout */}
                  <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                    {/* Left Section - Content */}
                    <div style={{ flex: "1", minWidth: "0" }}>
                      {/* Title */}
                      <h3 
                        style={{ 
                          margin: "0 0 6px 0", 
                          color: "#111827", 
                          fontSize: "16px", 
                          fontWeight: "600",
                          lineHeight: "1.3",
                          cursor: complaint.description.length > 80 ? "help" : "default"
                        }}
                        title={complaint.description.length > 80 ? `Complete Description: ${complaint.description}

Address: ${complaint.location?.detailedAddress || complaint.location?.address || `${complaint.location?.city}, ${complaint.location?.state}`}

Priority: ${complaint.priority || 'Not set'}${complaint.priorityReason ? ` (${complaint.priorityReason})` : ''}

Date: ${new Date(complaint.createdAt).toLocaleString()}

Phone: ${complaint.phone}` : ""}
                      >
                        {complaint.description.length > 80 ? `${complaint.description.substring(0, 80)}...` : complaint.description}
                      </h3>
                      
                      {/* Subtitle */}
                      <p style={{ 
                        margin: "0 0 8px 0", 
                        color: "#6b7280", 
                        fontSize: "13px", 
                        lineHeight: "1.4"
                      }}>
                        Infrastructure issue requiring municipal intervention for resolution.
                      </p>

                      {/* Location & Date in single row */}
                      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FontAwesomeIcon icon={faMapMarkerAlt} style={{ fontSize: "12px", color: "#6b7280" }} />
                          <span style={{ fontSize: "12px", color: "#374151", fontWeight: "500" }}>
                            {complaint.location?.address || 
                             (complaint.location?.city && complaint.location?.state ? 
                               `${complaint.location.city}, ${complaint.location.state}` : 
                               "Location not specified")
                            }
                          </span>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: "12px", color: "#6b7280" }} />
                          <span style={{ fontSize: "12px", color: "#374151", fontWeight: "500" }}>
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Badges & Image */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      {/* Priority & Status Badges */}
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {complaint.priority && (
                          <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "10px",
                            fontWeight: "600",
                            backgroundColor: complaint.priority === 'High' ? '#fee2e2' : 
                                           complaint.priority === 'Medium' ? '#fef3c7' : '#ecfdf5',
                            color: complaint.priority === 'High' ? '#dc2626' : 
                                  complaint.priority === 'Medium' ? '#d97706' : '#059669'
                          }}>
                            <FontAwesomeIcon 
                              icon={faExclamationTriangle} 
                              style={{ 
                                fontSize: "9px",
                                color: complaint.priority === 'High' ? '#dc2626' : 
                                      complaint.priority === 'Medium' ? '#d97706' : '#059669'
                              }} 
                            />
                            {complaint.priority}
                          </div>
                        )}
                        
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "11px",
                          fontWeight: "500",
                          backgroundColor: complaint.status === 'pending' ? '#fef3c7' : 
                                         complaint.status === 'rejected_by_department' ? '#fee2e2' :
                                         complaint.status === 'rejected' ? '#fee2e2' :
                                         complaint.status === 'resolved' ? '#d1fae5' :
                                         complaint.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
                          color: complaint.status === 'pending' ? '#92400e' : 
                                 complaint.status === 'rejected_by_department' ? '#dc2626' :
                                 complaint.status === 'rejected' ? '#dc2626' :
                                 complaint.status === 'resolved' ? '#065f46' :
                                 complaint.status === 'in_progress' ? '#1e40af' : '#6b7280'
                        }}>
                          <div style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: complaint.status === 'pending' ? '#f59e0b' : 
                                           complaint.status === 'rejected_by_department' ? '#ef4444' :
                                           complaint.status === 'rejected' ? '#ef4444' :
                                           complaint.status === 'resolved' ? '#10b981' :
                                           complaint.status === 'in_progress' ? '#3b82f6' : '#9ca3af'
                          }}></div>
                          {complaint.status === 'pending' ? 'Awaiting Review' :
                           complaint.status === 'rejected_by_department' ? 'Rejected by Department' :
                           complaint.status === 'rejected' ? 'Rejected' :
                           complaint.status === 'resolved' ? 'Resolved' :
                           complaint.status === 'in_progress' ? 'In Progress' : 'Unknown'}
                        </div>
                      </div>

                      {/* Compact Image */}
                      {complaint.imageUrl && (
                        <img
                          src={complaint.imageUrl}
                          alt="Complaint"
                          onClick={() => window.open(complaint.imageUrl, '_blank')}
                          style={{
                            width: "90px",
                            height: "60px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.opacity = "0.9";
                            e.target.style.transform = "scale(1.03)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.opacity = "1";
                            e.target.style.transform = "scale(1)";
                          }}
                          title="Click to view full size"
                        />
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      onClick={() => setSelectedComplaint(complaint)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        backgroundColor: "white",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                        e.target.style.borderColor = "#9ca3af";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = "white";
                        e.target.style.borderColor = "#d1d5db";
                      }}
                    >
                      <FontAwesomeIcon icon={faEye} style={{ fontSize: "12px" }} />
                      View Details
                    </button>

                    {/* Warning and Blacklist Buttons - Only show in pending section */}
                    {complaint.phone && activeTab === "pending" && (
                      <>
                        <button
                          onClick={() => handleOpenWarningModal(complaint.phone, complaint._id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 12px",
                            backgroundColor: "#f59e0b",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#d97706";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#f59e0b";
                          }}
                          title="Give warning to user"
                        >
                          <FontAwesomeIcon icon={faExclamationCircle} style={{ fontSize: "12px" }} />
                          Give Warning
                        </button>
                        
                        <button
                          onClick={() => handleOpenBlacklistModal(complaint.phone)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 12px",
                            backgroundColor: "#7c2d12",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#581c0c";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#7c2d12";
                          }}
                          title="Blacklist user"
                        >
                          <FontAwesomeIcon icon={faBan} style={{ fontSize: "12px" }} />
                          Blacklist User
                        </button>
                      </>
                    )}
                    
                    {(complaint.status === "pending" || complaint.status === "rejected_by_department") && complaint.canApprove && (
                      <>
                        <button
                          onClick={() => {
                            const comment = prompt("Add optional comment (or leave empty):");
                            approveComplaint(complaint._id, comment || "");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 12px",
                            backgroundColor: "#16a34a",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#15803d";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#16a34a";
                          }}
                        >
                          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: "12px" }} />
                          Approve
                        </button>
                        
                        <button
                          onClick={() => {
                            const reason = prompt("Enter reason for rejection:");
                            if (reason) {
                              rejectComplaint(complaint._id, reason);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 12px",
                            backgroundColor: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#b91c1c";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#dc2626";
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} style={{ fontSize: "12px" }} />
                          Reject
                        </button>
                      </>
                    )}

                    {/* Chat Button for in-progress complaints only */}
                    {complaint.status === "in_progress" && (
                      <ChatButton
                        complaint={complaint}
                        onClick={() => handleChatOpen(complaint)}
                        token={token}
                        userRole="admin"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 12px",
                          backgroundColor: "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                          textDecoration: "none",
                          transition: "all 0.2s ease"
                        }}
                      />
                    )}

                    {/* Status Indicators - Compact */}
                  

                    {complaint.status === "resolved" && (
                      <span style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 10px",
                        backgroundColor: "#d1fae5",
                        color: "#065f46",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "500",
                        border: "1px solid #a7f3d0"
                      }}>
                        <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: "10px" }} />
                        Resolved
                      </span>
                    )}

                    {complaint.status === "rejected" && (
                      <span style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 10px",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "500",
                        border: "1px solid #fecaca"
                      }}>
                        <FontAwesomeIcon icon={faTimes} style={{ fontSize: "10px" }} />
                        Rejected
                      </span>
                    )}

                    {/* Audio Section - Inline */}
                    {complaint.audioUrl && (
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "4px",
                        padding: "6px 10px",
                        backgroundColor: "#f3f4f6",
                        borderRadius: "6px",
                        fontSize: "11px", 
                        color: "#6b7280",
                        fontWeight: "500"
                      }}>
                        <FontAwesomeIcon icon={faMicrophone} style={{ fontSize: "10px" }} />
                        <span>Audio</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: "center",
              padding: "50px",
              color: "#666",
              fontSize: "18px"
            }}>
              {getStatusIcon(activeTab)} <span style={{ marginLeft: "10px" }}>
                {priorityFilter !== "all" ? 
                  `No ${activeTab.replace("_", " ")} complaints found with ${priorityFilter} priority` :
                  `No ${activeTab.replace("_", " ")} complaints found`
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Render page content based on current page
  const renderPageContent = () => {
    switch (currentPage) {
      case "home":
        return renderHomePage();
      case "complaints":
        return renderComplaintsPage();
      case "analytics":
        return <DepartmentAnalytics token={token} />;
      case "community":
        return <AdminCommunityComplaints token={token} adminInfo={adminInfo} />;
      default:
        return renderHomePage();
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        fontSize: "18px"
      }}>
        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: "10px" }} />Loading admin dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        flexDirection: "column",
        gap: "20px"
      }}>
        <p style={{ color: "red", fontSize: "18px" }}>
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: "10px" }} />{error}
        </p>
        <button onClick={() => window.location.reload()}>
          <FontAwesomeIcon icon={faSpinner} style={{ marginRight: "5px" }} />Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#f8f9fa",
        padding: "25px 25px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        marginBottom: "30px",
        borderBottom: "1px solid #e9ecef"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          {/* Logo/Brand */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <FontAwesomeIcon icon={faBuilding} style={{ fontSize: "24px", color: "#3498db", marginRight: "12px" }} />
            <h1 style={{ margin: "0", color: "#2c3e50", fontSize: "24px", fontWeight: "600" }}>
              Admin Dashboard
            </h1>
          </div>
          
          {/* Navigation Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            <button
              onClick={() => handlePageChange("home")}
              style={{
                padding: "14px 20px",
                backgroundColor: currentPage === "home" ? "#3498db" : "transparent",
                color: currentPage === "home" ? "white" : "#2c3e50",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease, transform 0.1s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transform: "scale(1)"
              }}
              onMouseOver={(e) => {
                if (currentPage !== "home") {
                  e.target.style.backgroundColor = "#f8f9fa";
                }
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                if (currentPage !== "home") {
                  e.target.style.backgroundColor = "transparent";
                }
                e.target.style.transform = "scale(1)";
              }}
              onMouseDown={(e) => {
                e.target.style.transform = "scale(0.95)";
              }}
              onMouseUp={(e) => {
                e.target.style.transform = "scale(1.05)";
              }}
            >
              <FontAwesomeIcon icon={faHome} />
              Home
            </button>
            
            <button
              onClick={() => handlePageChange("complaints")}
              style={{
                padding: "14px 20px",
                backgroundColor: currentPage === "complaints" ? "#3498db" : "transparent",
                color: currentPage === "complaints" ? "white" : "#2c3e50",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease, transform 0.1s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transform: "scale(1)"
              }}
              onMouseOver={(e) => {
                if (currentPage !== "complaints") {
                  e.target.style.backgroundColor = "#f8f9fa";
                }
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                if (currentPage !== "complaints") {
                  e.target.style.backgroundColor = "transparent";
                }
                e.target.style.transform = "scale(1)";
              }}
              onMouseDown={(e) => {
                e.target.style.transform = "scale(0.95)";
              }}
              onMouseUp={(e) => {
                e.target.style.transform = "scale(1.05)";
              }}
            >
              <FontAwesomeIcon icon={faClipboardList} />
              Complaints
            </button>
            
            <button
              onClick={() => handlePageChange("analytics")}
              style={{
                padding: "14px 20px",
                backgroundColor: currentPage === "analytics" ? "#3498db" : "transparent",
                color: currentPage === "analytics" ? "white" : "#2c3e50",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease, transform 0.1s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transform: "scale(1)"
              }}
              onMouseOver={(e) => {
                if (currentPage !== "analytics") {
                  e.target.style.backgroundColor = "#f8f9fa";
                }
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                if (currentPage !== "analytics") {
                  e.target.style.backgroundColor = "transparent";
                }
                e.target.style.transform = "scale(1)";
              }}
              onMouseDown={(e) => {
                e.target.style.transform = "scale(0.95)";
              }}
              onMouseUp={(e) => {
                e.target.style.transform = "scale(1.05)";
              }}
            >
              <FontAwesomeIcon icon={faChartBar} />
              Analytics
            </button>
            
            <button
              onClick={() => handlePageChange("community")}
              style={{
                padding: "14px 20px",
                backgroundColor: currentPage === "community" ? "#3498db" : "transparent",
                color: currentPage === "community" ? "white" : "#2c3e50",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease, transform 0.1s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transform: "scale(1)"
              }}
              onMouseOver={(e) => {
                if (currentPage !== "community") {
                  e.target.style.backgroundColor = "#f8f9fa";
                }
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                if (currentPage !== "community") {
                  e.target.style.backgroundColor = "transparent";
                }
                e.target.style.transform = "scale(1)";
              }}
              onMouseDown={(e) => {
                e.target.style.transform = "scale(0.95)";
              }}
              onMouseUp={(e) => {
                e.target.style.transform = "scale(1.05)";
              }}
            >
              <FontAwesomeIcon icon={faUsers} />
              Community
            </button>
          </div>
          
          {/* Profile Dropdown */}
          <div style={{ position: "relative" }} data-profile-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileDropdown(!showProfileDropdown);
              }}
              style={{
                padding: "14px 16px",
                backgroundColor: "#f8f9fa",
                color: "#2c3e50",
                border: "1px solid #e9ecef",
                borderRadius: "50px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#e9ecef";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#f8f9fa";
              }}
            >
              <FontAwesomeIcon icon={faUser} />
              {adminInfo?.name || 'Admin'}
              <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "12px" }} />
            </button>
            
            {/* Dropdown Menu */}
            {showProfileDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: "0",
                backgroundColor: "white",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 1000,
                minWidth: "200px",
                marginTop: "5px"
              }}>
                {adminInfo && (
                  <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #e9ecef",
                    fontSize: "12px",
                    color: "#6c757d"
                  }}>
                    <div style={{ fontWeight: "600", color: "#2c3e50", marginBottom: "4px" }}>
                      {adminInfo.name}
                    </div>
                    <div>
                      {adminInfo.city}, {adminInfo.state} Administrator
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    handleLogout();
                    setShowProfileDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    backgroundColor: "transparent",
                    color: "#dc3545",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "0 0 8px 8px",
                    transition: "background-color 0.3s ease"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "transparent";
                  }}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
        {/* Render content based on current page */}
        <div style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? "translateY(20px)" : "translateY(0px)",
          transition: "opacity 0.3s ease, transform 0.3s ease"
        }}>
          {renderPageContent()}
        </div>
      </div>

      {/* Complaint Details Modal */}
      {selectedComplaint && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "20px",
          boxSizing: "border-box",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "0",
            maxWidth: "800px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            border: "1px solid #e5e7eb"
          }}>
            {/* Header Section */}
            <div style={{
              padding: "24px 32px",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  backgroundColor: "#3b82f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <FontAwesomeIcon icon={faFileText} style={{ fontSize: "18px" }} />
                </div>
                <div>
                  <h2 style={{ 
                    margin: 0, 
                    color: "#1f2937", 
                    fontSize: "20px",
                    fontWeight: "600"
                  }}>
                    Complaint Details
                  </h2>
                  <p style={{ 
                    margin: "2px 0 0 0", 
                    color: "#6b7280", 
                    fontSize: "14px" 
                  }}>
                    ID: {selectedComplaint._id?.slice(-8) || 'N/A'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedComplaint(null)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "#f3f4f6",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#e5e7eb";
                  e.target.style.color = "#374151";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#f3f4f6";
                  e.target.style.color = "#6b7280";
                }}
              >
                <FontAwesomeIcon icon={faTimes} style={{ fontSize: "16px" }} />
              </button>
            </div>

            {/* Content Section */}
            <div style={{ 
              padding: "32px",
              maxHeight: "calc(90vh - 120px)",
              overflow: "auto"
            }}>
            
            {/* Description Section */}
            <div style={{ 
              marginBottom: "24px",
              padding: "20px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "12px",
                gap: "8px"
              }}>
                <FontAwesomeIcon 
                  icon={faFileText} 
                  style={{ 
                    color: "#3b82f6", 
                    fontSize: "16px" 
                  }} 
                />
                <h3 style={{ 
                  margin: 0, 
                  color: "#1f2937", 
                  fontSize: "16px",
                  fontWeight: "600"
                }}>
                  Description
                </h3>
              </div>
              <p style={{ 
                margin: 0, 
                padding: "16px", 
                backgroundColor: "white", 
                borderRadius: "8px",
                lineHeight: "1.6",
                color: "#374151",
                fontSize: "14px",
                border: "1px solid #e5e7eb"
              }}>
                {selectedComplaint.description}
              </p>
            </div>

            {/* Media Section */}
            {(selectedComplaint.imageUrl || selectedComplaint.audioUrl) && (
              <div style={{ 
                marginBottom: "24px",
                padding: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  marginBottom: "16px",
                  gap: "8px"
                }}>
                  <FontAwesomeIcon 
                    icon={faImage} 
                    style={{ 
                      color: "#8b5cf6", 
                      fontSize: "16px" 
                    }} 
                  />
                  <h3 style={{ 
                    margin: 0, 
                    color: "#1f2937", 
                    fontSize: "16px",
                    fontWeight: "600"
                  }}>
                    Media Attachments
                  </h3>
                </div>

                {selectedComplaint.imageUrl && (
                  <div style={{ marginBottom: selectedComplaint.audioUrl ? "20px" : "0" }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      marginBottom: "12px",
                      gap: "8px"
                    }}>
                      <FontAwesomeIcon 
                        icon={faImage} 
                        style={{ 
                          color: "#6b7280", 
                          fontSize: "14px" 
                        }} 
                      />
                      <span style={{ 
                        fontSize: "14px", 
                        fontWeight: "500",
                        color: "#374151"
                      }}>
                        Evidence Photo
                      </span>
                      <span style={{ 
                        fontSize: "12px", 
                        color: "#6b7280",
                        backgroundColor: "#e5e7eb",
                        padding: "2px 8px",
                        borderRadius: "10px"
                      }}>
                        Click to enlarge
                      </span>
                    </div>
                    <div style={{
                      padding: "12px",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <img
                        src={selectedComplaint.imageUrl}
                        alt="Complaint Evidence"
                        onClick={() => window.open(selectedComplaint.imageUrl, '_blank')}
                        style={{
                          width: "100%",
                          maxHeight: "300px",
                          objectFit: "contain",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = "scale(1.02)";
                          e.target.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = "scale(1)";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedComplaint.audioUrl && (
                  <div>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      marginBottom: "12px",
                      gap: "8px"
                    }}>
                      <FontAwesomeIcon 
                        icon={faMicrophone} 
                        style={{ 
                          color: "#6b7280", 
                          fontSize: "14px" 
                        }} 
                      />
                      <span style={{ 
                        fontSize: "14px", 
                        fontWeight: "500",
                        color: "#374151"
                      }}>
                        Voice Recording
                      </span>
                    </div>
                    <div style={{
                      padding: "12px",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <audio 
                        controls 
                        style={{ 
                          width: "100%",
                          height: "40px"
                        }}
                      >
                        <source src={selectedComplaint.audioUrl} type="audio/wav" />
                        <source src={selectedComplaint.audioUrl} type="audio/mp3" />
                      </audio>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Location & Details Section */}
            <div style={{ 
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px"
            }}>
              {/* Location Card */}
              <div style={{
                padding: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  marginBottom: "16px",
                  gap: "8px"
                }}>
                  <FontAwesomeIcon 
                    icon={faMapMarkerAlt} 
                    style={{ 
                      color: "#ef4444", 
                      fontSize: "16px" 
                    }} 
                  />
                  <h3 style={{ 
                    margin: 0, 
                    color: "#1f2937", 
                    fontSize: "16px",
                    fontWeight: "600"
                  }}>
                    Location Details
                  </h3>
                </div>
                
                <div style={{
                  padding: "16px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  marginBottom: "12px"
                }}>
                  <div style={{ 
                    fontSize: "14px", 
                    color: "#374151",
                    lineHeight: "1.5"
                  }}>
                    {selectedComplaint.location?.detailedAddress || 
                     selectedComplaint.location?.address || 
                     `${selectedComplaint.location?.city}, ${selectedComplaint.location?.state}`}
                  </div>
                </div>

                {/* Additional Location Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedComplaint.location?.streetAddress && (
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      fontSize: "13px"
                    }}>
                      <FontAwesomeIcon icon={faHome} style={{ color: "#6b7280", fontSize: "12px" }} />
                      <span style={{ color: "#6b7280", fontWeight: "500" }}>Street:</span>
                      <span style={{ color: "#374151" }}>{selectedComplaint.location.streetAddress}</span>
                    </div>
                  )}
                  {selectedComplaint.location?.sublocality && (
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      fontSize: "13px"
                    }}>
                      <FontAwesomeIcon icon={faCity} style={{ color: "#6b7280", fontSize: "12px" }} />
                      <span style={{ color: "#6b7280", fontWeight: "500" }}>Area:</span>
                      <span style={{ color: "#374151" }}>{selectedComplaint.location.sublocality}</span>
                    </div>
                  )}
                  {selectedComplaint.location?.postalCode && (
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      fontSize: "13px"
                    }}>
                      <FontAwesomeIcon icon={faMailBulk} style={{ color: "#6b7280", fontSize: "12px" }} />
                      <span style={{ color: "#6b7280", fontWeight: "500" }}>Postal:</span>
                      <span style={{ color: "#374151" }}>{selectedComplaint.location.postalCode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact & Status Card */}
              <div style={{
                padding: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  marginBottom: "16px",
                  gap: "8px"
                }}>
                  <FontAwesomeIcon 
                    icon={faInfoCircle} 
                    style={{ 
                      color: "#3b82f6", 
                      fontSize: "16px" 
                    }} 
                  />
                  <h3 style={{ 
                    margin: 0, 
                    color: "#1f2937", 
                    fontSize: "16px",
                    fontWeight: "600"
                  }}>
                    Contact & Status
                  </h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{
                    padding: "12px 16px",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FontAwesomeIcon icon={faPhone} style={{ color: "#6b7280", fontSize: "14px" }} />
                    <span style={{ color: "#6b7280", fontWeight: "500", fontSize: "13px" }}>Phone:</span>
                    <span style={{ color: "#374151", fontSize: "14px" }}>{selectedComplaint.phone}</span>
                  </div>

                  <div style={{
                    padding: "12px 16px",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FontAwesomeIcon 
                      icon={faChartBar} 
                      style={{ 
                        color: getStatusColor(selectedComplaint.status), 
                        fontSize: "14px" 
                      }} 
                    />
                    <span style={{ color: "#6b7280", fontWeight: "500", fontSize: "13px" }}>Status:</span>
                    <span style={{ 
                      color: getStatusColor(selectedComplaint.status), 
                      fontSize: "14px",
                      fontWeight: "600",
                      textTransform: "capitalize"
                    }}>
                      {selectedComplaint.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{
                    padding: "12px 16px",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FontAwesomeIcon icon={faCalendarAlt} style={{ color: "#6b7280", fontSize: "14px" }} />
                    <span style={{ color: "#6b7280", fontWeight: "500", fontSize: "13px" }}>Created:</span>
                    <span style={{ color: "#374151", fontSize: "14px" }}>
                      {new Date(selectedComplaint.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Section */}
            {selectedComplaint.priority && (
              <div style={{ 
                marginBottom: "24px",
                padding: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  marginBottom: "16px",
                  gap: "8px"
                }}>
                  <FontAwesomeIcon 
                    icon={faBolt} 
                    style={{ 
                      color: selectedComplaint.priority === 'High' ? '#ef4444' : 
                             selectedComplaint.priority === 'Medium' ? '#f59e0b' : '#10b981', 
                      fontSize: "16px" 
                    }} 
                  />
                  <h3 style={{ 
                    margin: 0, 
                    color: "#1f2937", 
                    fontSize: "16px",
                    fontWeight: "600"
                  }}>
                    Priority Assessment
                  </h3>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    backgroundColor: selectedComplaint.priority === 'High' ? '#fee2e2' : 
                                   selectedComplaint.priority === 'Medium' ? '#fef3c7' : '#ecfdf5',
                    color: selectedComplaint.priority === 'High' ? '#dc2626' : 
                          selectedComplaint.priority === 'Medium' ? '#d97706' : '#059669'
                  }}>
                    <FontAwesomeIcon 
                      icon={faBolt} 
                      style={{ 
                        fontSize: "10px",
                        color: selectedComplaint.priority === 'High' ? '#dc2626' : 
                              selectedComplaint.priority === 'Medium' ? '#d97706' : '#059669'
                      }} 
                    />
                    {selectedComplaint.priority}
                  </div>
                </div>

                <div style={{ 
                  padding: "16px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  {selectedComplaint.priorityReason && (
                    <div>
                      <span style={{ 
                        color: "#6b7280", 
                        fontWeight: "500", 
                        fontSize: "13px",
                        display: "block",
                        marginBottom: "4px"
                      }}>
                        Reason:
                      </span>
                      <span style={{ 
                        color: "#374151", 
                        fontSize: "14px",
                        lineHeight: "1.4"
                      }}>
                        {selectedComplaint.priorityReason}
                      </span>
                    </div>
                  )}
                  
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    {selectedComplaint.areaName && (
                      <div>
                        <span style={{ 
                          color: "#6b7280", 
                          fontWeight: "500", 
                          fontSize: "13px",
                          display: "block",
                          marginBottom: "2px"
                        }}>
                          Area:
                        </span>
                        <span style={{ color: "#374151", fontSize: "14px" }}>
                          {selectedComplaint.areaName}
                        </span>
                      </div>
                    )}
                    {selectedComplaint.highPriorityPlace && (
                      <div>
                        <span style={{ 
                          color: "#6b7280", 
                          fontWeight: "500", 
                          fontSize: "13px",
                          display: "block",
                          marginBottom: "2px"
                        }}>
                          Near:
                        </span>
                        <span style={{ color: "#374151", fontSize: "14px" }}>
                          {selectedComplaint.highPriorityPlace}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Information */}
            <div style={{ 
              marginBottom: "24px", 
              padding: "20px", 
              backgroundColor: "#f8fafc", 
              borderRadius: "12px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "16px",
                gap: "8px"
              }}>
                <FontAwesomeIcon 
                  icon={faBuilding} 
                  style={{ 
                    color: "#6366f1", 
                    fontSize: "16px" 
                  }} 
                />
                <h3 style={{ 
                  margin: 0, 
                  color: "#1f2937", 
                  fontSize: "16px",
                  fontWeight: "600"
                }}>
                  Status & Assignment
                </h3>
              </div>
              
              <div style={{
                padding: "16px",
                backgroundColor: "white",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
              }}>
                {selectedComplaint.status === 'pending' ? (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "12px",
                    padding: "12px 16px",
                    backgroundColor: "#fffbeb",
                    borderRadius: "8px",
                    border: "1px solid #fed7aa"
                  }}>
                    <FontAwesomeIcon 
                      icon={faClock} 
                      style={{ 
                        color: "#d97706", 
                        fontSize: "16px" 
                      }} 
                    />
                    <div>
                      <div style={{ 
                        color: "#92400e", 
                        fontWeight: "600", 
                        fontSize: "14px",
                        marginBottom: "4px"
                      }}>
                        Awaiting Admin Approval
                      </div>
                      <div style={{ 
                        color: "#78350f", 
                        fontSize: "13px",
                        lineHeight: "1.4"
                      }}>
                        This complaint is pending your approval. You can approve or reject it below.
                      </div>
                    </div>
                  </div>
                ) : selectedComplaint.status === 'in_progress' && selectedComplaint.assignedDepartment ? (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "12px",
                    padding: "12px 16px",
                    backgroundColor: "#f0f9ff",
                    borderRadius: "8px",
                    border: "1px solid #bae6fd"
                  }}>
                    <FontAwesomeIcon 
                      icon={faBuilding} 
                      style={{ 
                        color: "#0284c7", 
                        fontSize: "16px" 
                      }} 
                    />
                    <div>
                      <div style={{ 
                        color: "#0c4a6e", 
                        fontWeight: "600", 
                        fontSize: "14px",
                        marginBottom: "4px"
                      }}>
                        Assigned to Department
                      </div>
                      <div style={{ 
                        color: "#164e63", 
                        fontSize: "13px",
                        lineHeight: "1.4"
                      }}>
                        This complaint has been approved and assigned to <strong>{selectedComplaint.assignedDepartment?.name || 'a department'}</strong> for resolution.
                      </div>
                    </div>
                  </div>
                ) : selectedComplaint.status === 'resolved' ? (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "12px",
                    padding: "12px 16px",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0"
                  }}>
                    <FontAwesomeIcon 
                      icon={faCheckCircle} 
                      style={{ 
                        color: "#16a34a", 
                        fontSize: "16px" 
                      }} 
                    />
                    <div>
                      <div style={{ 
                        color: "#166534", 
                        fontWeight: "600", 
                        fontSize: "14px",
                        marginBottom: "4px"
                      }}>
                        Successfully Resolved
                      </div>
                      <div style={{ 
                        color: "#15803d", 
                        fontSize: "13px",
                        lineHeight: "1.4"
                      }}>
                        This complaint has been successfully resolved by the department.
                      </div>
                    </div>
                  </div>
                ) : selectedComplaint.status === 'rejected_by_department' ? (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    gap: "12px",
                    padding: "12px 16px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "8px",
                    border: "1px solid #fecaca"
                  }}>
                    <FontAwesomeIcon 
                      icon={faTimes} 
                      style={{ 
                        color: "#dc2626", 
                        fontSize: "16px",
                        marginTop: "2px"
                      }} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        color: "#dc2626", 
                        fontWeight: "600", 
                        fontSize: "14px",
                        marginBottom: "6px"
                      }}>
                        Rejected by Department
                      </div>
                      {selectedComplaint.departmentRejection && (
                        <div style={{ 
                          color: "#b91c1c", 
                          fontSize: "13px",
                          lineHeight: "1.4"
                        }}>
                          <div style={{ marginBottom: "4px" }}>
                            <strong>Reason:</strong> {selectedComplaint.departmentRejection.reason}
                          </div>
                          {selectedComplaint.departmentRejection.additionalNotes && (
                            <div style={{ marginBottom: "4px" }}>
                              <strong>Additional Notes:</strong> {selectedComplaint.departmentRejection.additionalNotes}
                            </div>
                          )}
                          <div style={{ fontSize: "12px", color: "#7f1d1d" }}>
                            Rejected on: {new Date(selectedComplaint.departmentRejection.rejectedAt).toLocaleString()}
                          </div>
                        </div>
                      )}
                      <div style={{ 
                        color: "#b91c1c", 
                        fontSize: "13px",
                        marginTop: "6px",
                        fontWeight: "500"
                      }}>
                        This complaint requires admin review and reassignment.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "12px",
                    padding: "12px 16px",
                    backgroundColor: "#faf5ff",
                    borderRadius: "8px",
                    border: "1px solid #d8b4fe"
                  }}>
                    <FontAwesomeIcon 
                      icon={faSpinner} 
                      style={{ 
                        color: "#9333ea", 
                        fontSize: "16px" 
                      }} 
                    />
                    <div>
                      <div style={{ 
                        color: "#6b21a8", 
                        fontWeight: "600", 
                        fontSize: "14px",
                        marginBottom: "4px"
                      }}>
                        Approved but Unassigned
                      </div>
                      <div style={{ 
                        color: "#7c3aed", 
                        fontSize: "13px",
                        lineHeight: "1.4"
                      }}>
                        This complaint has been approved but not yet assigned to a department.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {(selectedComplaint.status === "pending" || selectedComplaint.status === "rejected_by_department") && (
              <div style={{ 
                padding: "20px", 
                backgroundColor: "#f8fafc", 
                borderRadius: "12px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  marginBottom: "16px",
                  gap: "8px"
                }}>
                  <FontAwesomeIcon 
                    icon={faCheckCircle} 
                    style={{ 
                      color: "#10b981", 
                      fontSize: "16px" 
                    }} 
                  />
                  <h3 style={{ 
                    margin: 0, 
                    color: "#1f2937", 
                    fontSize: "16px",
                    fontWeight: "600"
                  }}>
                    Admin Actions
                  </h3>
                </div>
                
                <div style={{ 
                  display: "flex", 
                  gap: "12px", 
                  marginBottom: "12px",
                  flexWrap: "wrap"
                }}>
                  <button
                    onClick={() => {
                      const comment = prompt("Add optional comment (or leave empty):");
                      approveComplaint(selectedComplaint._id, comment || "");
                      setSelectedComplaint(null);
                    }}
                    style={{
                      flex: "1",
                      minWidth: "140px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "12px 24px",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#059669";
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "#10b981";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} style={{ animation: "spin 1s linear infinite" }} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faCheckCircle} />
                        Approve Complaint
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      const reason = prompt("Enter reason for rejection:");
                      if (reason) {
                        rejectComplaint(selectedComplaint._id, reason);
                        setSelectedComplaint(null);
                      }
                    }}
                    style={{
                      flex: "1",
                      minWidth: "140px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "12px 24px",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#dc2626";
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "#ef4444";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} style={{ animation: "spin 1s linear infinite" }} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faTimes} />
                        Reject Complaint
                      </>
                    )}
                  </button>
                </div>
                
                <div style={{ 
                  padding: "12px 16px",
                  backgroundColor: "#fffbeb",
                  borderRadius: "8px",
                  border: "1px solid #fed7aa"
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    fontSize: "13px", 
                    color: "#92400e",
                    lineHeight: "1.4"
                  }}>
                    <FontAwesomeIcon icon={faInfoCircle} style={{ color: "#d97706", fontSize: "12px" }} />
                    <strong>Note:</strong> Approval will automatically change status to "in progress" and route to appropriate department.
                  </div>
                </div>
              </div>
            )}

            {(selectedComplaint.status === "in_progress" || selectedComplaint.status === "pending" || selectedComplaint.status === "rejected_by_department") && (
              <>
                <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                  <strong>Chat Options:</strong>
                  <div style={{ marginTop: "10px" }}>
                    <ChatButton 
                      complaint={selectedComplaint}
                      onClick={() => handleChatOpen(selectedComplaint)}
                      token={token}
                      userRole="admin"
                    />
                  </div>
                </div>
                <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #dee2e6" }}>
                  <span style={{ color: "#495057" }}>
                    <FontAwesomeIcon icon={faSpinner} style={{ marginRight: "5px", color: "#3498db" }} /> <strong>Status:</strong> This complaint is approved and currently being processed by the assigned department.
                  </span>
                </div>
              </>
            )}            {selectedComplaint.status === "resolved" && (
              <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #dee2e6" }}>
                <span style={{ color: "#495057" }}>
                  <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: "5px", color: "#27ae60" }} /> <strong>Status:</strong> This complaint has been successfully resolved by the department.
                </span>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Modal */}
      {showChatModal && chatComplaint && (
        <ChatModal
          complaint={chatComplaint}
          onClose={handleChatClose}
          token={token}
          userRole="admin"
        />
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <AdminWarningModal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          onSubmit={(reason, notes) => {
            handleGiveWarning(selectedUserPhone, selectedComplaintId, reason, notes);
          }}
          userPhone={selectedUserPhone}
        />
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && (
        <AdminBlacklistModal
          isOpen={showBlacklistModal}
          onClose={() => setShowBlacklistModal(false)}
          onSubmit={(reason) => {
            handleBlacklistUser(selectedUserPhone, reason);
          }}
          userPhone={selectedUserPhone}
        />
      )}
    </div>
  );
}

export default AdminDashboard;