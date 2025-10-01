import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FilterControls from '../components/FilterControls';
import { useComplaintFilters } from '../components/useComplaintFilters';
import Graph from '../components/Graph';
import AdminMapView from '../components/AdminMapView';
import ChatModal from '../components/ChatModal';
import DepartmentChatButton from '../components/DepartmentChatButton';
import DepartmentRejectButton from '../components/DepartmentRejectButton';
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
  faMicrophone, 
  faHome, 
  faCity, 
  faMailBulk, 
  faTimes,
  faExclamationTriangle,
  faImage,
  faFire,
  faShieldAlt,
  faTint,
  faWrench,
  faFilter,
  faLeaf,
  faLightbulb,
  faUser,
  faClipboardList,
  faChevronDown,
  faCommentDots,
  faUserShield
} from '@fortawesome/free-solid-svg-icons';

function DepartmentDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("in_progress");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [stats, setStats] = useState({ in_progress: 0, resolved: 0, total: 0 });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState("home"); // Add state for page navigation
  
  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatComplaint, setChatComplaint] = useState(null);
  const [chatUserType, setChatUserType] = useState(null); // 'user' or 'admin'
  
  const navigate = useNavigate();
  const token = localStorage.getItem("departmentToken");

  // Use the custom filtering hook
  const {
    dateFilter,
    setDateFilter,
    priorityFilter,
    setPriorityFilter,
    getFilteredAndSortedComplaints
  } = useComplaintFilters(complaints);

  // Department type to icon mapping
  const getDepartmentIcon = (departmentType) => {
    switch (departmentType?.toLowerCase()) {
      case 'fire': return faFire;
      case 'police': return faShieldAlt;
      case 'water': return faTint;
      case 'maintenance': return faWrench;
      case 'sanitation': return faLeaf;
      case 'electricity': return faLightbulb;
      default: return faBuilding;
    }
  };

  // Department type to color mapping
  const getDepartmentColor = (departmentType) => {
    switch (departmentType?.toLowerCase()) {
      case 'fire': return '#dc3545';
      case 'police': return '#007bff';
      case 'water': return '#17a2b8';
      case 'maintenance': return '#6c757d';
      case 'sanitation': return '#28a745';
      case 'electricity': return '#ffc107';
      default: return '#6f42c1';
    }
  };

  const fetchComplaints = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/department/my-complaints`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setComplaints(data.complaints || []);
        setDepartmentInfo(prev => ({ ...prev, ...data.department }));
        
        // Calculate stats
        const newStats = {
          in_progress: data.complaints.filter(c => c.status === "in_progress").length,
          resolved: data.complaints.filter(c => c.status === "resolved").length,
          total: data.complaints.length
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

  const resolveComplaint = async (complaintId, departmentComment = "") => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/department/${complaintId}/status`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          status: "resolved",
          departmentComment: departmentComment 
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        setComplaints(prev => 
          prev.map(complaint => 
            complaint._id === complaintId 
              ? { ...complaint, status: "resolved", departmentComment }
              : complaint
          )
        );
        
        // Refresh data
        fetchComplaints();
        
        alert("Complaint resolved successfully!");
        
        // Close modal if open
        if (selectedComplaint && selectedComplaint._id === complaintId) {
          setSelectedComplaint(null);
        }
      } else {
        alert(data.error || "Failed to resolve complaint");
      }
    } catch (error) {
      console.error("Error resolving complaint:", error);
      alert("Network error. Please try again.");
    }
  };

  // Chat handlers
  const handleChatOpen = (complaint, userType) => {
    setChatComplaint(complaint);
    setChatUserType(userType);
    setShowChatModal(true);
  };

  const handleChatClose = () => {
    setShowChatModal(false);
    setChatComplaint(null);
    setChatUserType(null);
    // Refresh complaints immediately to update unread counts
    fetchComplaints();
  };

  const handleLogout = () => {
    localStorage.removeItem("departmentToken");
    localStorage.removeItem("departmentInfo");
    navigate("/department");
  };

  // Handle page changes with smooth transition
  const handlePageChange = (page) => {
    if (currentPage !== page) {
      setCurrentPage(page);
    }
  };

  // Fetch complaints when component mounts
  useEffect(() => {
    if (token) {
      fetchComplaints();
    } else {
      navigate("/department");
    }
  }, [token, fetchComplaints, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('[data-profile-dropdown]')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileDropdown]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "#ffc107";
      case "in_progress": return "#17a2b8";
      case "resolved": return "#28a745";
      default: return "#6c757d";
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
        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: "10px" }} />Loading department dashboard...
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

  const departmentColor = getDepartmentColor(departmentInfo?.departmentType);
  const departmentIcon = getDepartmentIcon(departmentInfo?.departmentType);

  // Home Page Content (Analytics and Overview)
  const renderHomePage = () => (
    <>
      {/* Stats Cards - Linear 1x4 Layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: "24px",
        marginBottom: "32px"
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          textAlign: "center",
          border: "1px solid #e5e7eb",
          transition: "transform 0.2s ease, box-shadow 0.2s ease"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        }}>
          <h2 style={{ margin: "0", color: "#000000", fontSize: "32px", fontWeight: "600" }}>{stats.total}</h2>
          <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>
            <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "6px", color: "#3b82f6" }} />
            Total {departmentInfo?.departmentType || 'Department'} Complaints
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          textAlign: "center",
          border: "1px solid #e5e7eb",
          transition: "transform 0.2s ease, box-shadow 0.2s ease"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        }}>
          <h2 style={{ margin: "0", color: "#000000", fontSize: "32px", fontWeight: "600" }}>{stats.in_progress}</h2>
          <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>
            <FontAwesomeIcon icon={faSpinner} style={{ marginRight: "6px", color: "#3b82f6" }} />
            In Progress
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          textAlign: "center",
          border: "1px solid #e5e7eb",
          transition: "transform 0.2s ease, box-shadow 0.2s ease"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        }}>
          <h2 style={{ margin: "0", color: "#000000", fontSize: "32px", fontWeight: "600" }}>{stats.resolved}</h2>
          <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: "6px", color: "#10b981" }} />
            Resolved
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          textAlign: "center",
          border: "1px solid #e5e7eb",
          transition: "transform 0.2s ease, box-shadow 0.2s ease"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        }}>
          <h2 style={{ margin: "0", color: "#000000", fontSize: "32px", fontWeight: "600" }}>
            {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
          </h2>
          <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>
            <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "6px", color: "#ef4444" }} />
            Success Rate
          </p>
        </div>
      </div>

      {/* Analytics Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
        marginBottom: "32px"
      }}>
        {/* Complaints Analytics Graph */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
          overflow: "hidden"
        }}>
          <Graph complaints={complaints} />
        </div>
        
        {/* District Complaints Map */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
          overflow: "hidden"
        }}>
          <AdminMapView 
            complaints={complaints} 
            onComplaintSelect={setSelectedComplaint}
          />
        </div>
      </div>

      {/* Department Notice */}
      
    </>
  );

  // Complaints Page Content
  const renderComplaintsPage = () => (
    <div style={{ 
      backgroundColor: "#f8fafc", 
      minHeight: "100vh",
      padding: "0"
    }}>
      {/* Header Section */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
        marginBottom: "24px",
        overflow: "hidden"
      }}>
        {/* Status Navigation Tabs */}
        <div style={{ 
          display: "flex", 
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          justifyContent: "flex-start",
          gap: "20px",
          padding: "0 20px"
        }}>
          {["in_progress", "resolved"].map((status) => {
            const statusLabels = {
              "in_progress": "Active Complaints",
              "resolved": "Resolved Complaints"
            };
            const statusCounts = {
              "in_progress": stats.in_progress,
              "resolved": stats.resolved
            };
            const statusColors = {
              "in_progress": "#3b82f6",
              "resolved": "#10b981"
            };
            
            return (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                style={{
                  minWidth: "180px",
                  maxWidth: "220px",
                  padding: "12px 16px",
                  border: "none",
                  backgroundColor: activeTab === status ? statusColors[status] : "transparent",
                  color: activeTab === status ? "white" : "#6c757d",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  borderRadius: activeTab === status ? "6px 6px 0 0" : "0",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  borderBottom: "none"
                }}
                onMouseOver={(e) => {
                  if (activeTab !== status) {
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.color = "#495057";
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== status) {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#6c757d";
                  }
                }}
              >
                {status === "in_progress" && <FontAwesomeIcon icon={faSpinner} />}
                {status === "resolved" && <FontAwesomeIcon icon={faCheckCircle} />}
                {statusLabels[status]} ({statusCounts[status]})
              </button>
            );
          })}
        </div>

        {/* Filter Controls - Admin Style */}
        <div style={{
          padding: "16px 24px",
          backgroundColor: "white",
          borderTop: "1px solid #e5e7eb",
          borderBottom: "none"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <FontAwesomeIcon icon={faFilter} style={{ color: "#6c757d", fontSize: "14px" }} />
              <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Filters:</span>
            </div>
            
            {/* Date Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "14px", color: "#6c757d", minWidth: "40px" }}>Date:</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  fontSize: "14px",
                  color: "#374151",
                  minWidth: "120px"
                }}
              >
                <option value="all">Latest First</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            
            {/* Priority Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "14px", color: "#6c757d", minWidth: "60px" }}>Priority:</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  fontSize: "14px",
                  color: "#374151",
                  minWidth: "120px"
                }}
              >
                <option value="all">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
            
            {/* Results Count */}
            <div style={{
              marginLeft: "auto",
              fontSize: "14px",
              color: "#6c757d",
              backgroundColor: "#f8f9fa",
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #e9ecef"
            }}>
              Showing: <strong>{getFilteredAndSortedComplaints(activeTab).length}</strong> complaint(s)
            </div>
          </div>
        </div>

        {/* Content Area - Card Style */}
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "20px",
          borderRadius: "0 0 8px 8px"
        }}>
          {getFilteredAndSortedComplaints(activeTab).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {getFilteredAndSortedComplaints(activeTab).map((complaint) => (
                <div
                  key={complaint._id}
                  style={{
                    padding: "24px",
                    marginBottom: "16px",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    transition: "box-shadow 0.2s ease",
                    cursor: "pointer",
                    minHeight: "120px"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                  }}
                  onClick={() => setSelectedComplaint(complaint)}
                >
                  {/* Main Content Row */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    gap: "20px"
                  }}>
                    {/* Left Side - Complaint Details */}
                    <div style={{ flex: 1 }}>
                      {/* Title and Badges Row */}
                      <div style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "12px"
                      }}>
                        <h3 style={{
                          margin: "0",
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "#111827",
                          lineHeight: "1.4",
                          flex: 1
                        }}>
                          {complaint.description.length > 80 
                            ? `${complaint.description.substring(0, 80)}...` 
                            : complaint.description}
                        </h3>
                        
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                          {/* Priority Badge */}
                          {complaint.priority && (
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "600",
                              backgroundColor: complaint.priority === 'High' ? '#fee2e2' : complaint.priority === 'Medium' ? '#fef3c7' : '#f0fdf4',
                              color: complaint.priority === 'High' ? '#dc2626' : complaint.priority === 'Medium' ? '#d97706' : '#16a34a',
                              textTransform: "uppercase"
                            }}>
                              ⚠ {complaint.priority}
                            </span>
                          )}
                          
                          {/* Status Badge */}
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: "#e0f2fe",
                            color: "#0277bd",
                            textTransform: "uppercase"
                          }}>
                            ● In Progress
                          </span>
                        </div>
                      </div>
                  
                      
                      {/* Location and Date Row */}
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center",
                        gap: "24px",
                        fontSize: "14px",
                        color: "#6b7280",
                        marginBottom: "16px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: "#6b7280", fontSize: "12px" }} />
                          <span>{complaint.location?.detailedAddress || complaint.location?.address || `${complaint.location?.city}, ${complaint.location?.state}`}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FontAwesomeIcon icon={faCalendarAlt} style={{ color: "#6b7280", fontSize: "12px" }} />
                          <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div style={{ 
                        display: "flex", 
                        gap: "8px",
                        flexWrap: "wrap"
                      }}>
                        {/* Chat buttons - Only show in in_progress section */}
                        {activeTab === "in_progress" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatOpen(complaint, 'user');
                              }}
                              style={{
                                padding: "10px 18px",
                                backgroundColor: "white",
                                color: "#374151",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.2s ease",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                                textTransform: "none"
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = "#f8fafc";
                                e.target.style.borderColor = "#cbd5e1";
                                e.target.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = "white";
                                e.target.style.borderColor = "#e5e7eb";
                                e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                              }}
                            >
                              <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: "16px", color: "#3b82f6" }} />
                              Chat with User
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatOpen(complaint, 'admin');
                              }}
                              style={{
                                padding: "10px 18px",
                                backgroundColor: "white",
                                color: "#374151",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.2s ease",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                                textTransform: "none"
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = "#f8fafc";
                                e.target.style.borderColor = "#cbd5e1";
                                e.target.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = "white";
                                e.target.style.borderColor = "#e5e7eb";
                                e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                              }}
                            >
                              <FontAwesomeIcon icon={faUserShield} style={{ fontSize: "16px", color: "#8b5cf6" }} />
                              Chat with Admin
                            </button>
                          </>
                        )}
                        
                        {complaint.status === "in_progress" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const comment = prompt("Enter resolution comment (optional):");
                              if (comment !== null) {
                                resolveComplaint(complaint._id, comment);
                              }
                            }}
                            style={{
                              padding: "10px 18px",
                              backgroundColor: "#22c55e",
                              color: "white",
                              border: "1px solid #22c55e",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: "500",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                              textTransform: "none"
                            }}
                            onMouseOver={(e) => {
                              e.target.style.backgroundColor = "#16a34a";
                              e.target.style.borderColor = "#16a34a";
                              e.target.style.boxShadow = "0 2px 6px rgba(34, 197, 94, 0.2)";
                            }}
                            onMouseOut={(e) => {
                              e.target.style.backgroundColor = "#22c55e";
                              e.target.style.borderColor = "#22c55e";
                              e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                            }}
                          >
                            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: "16px" }} />
                            Resolve
                          </button>
                        )}
                        
                        {/* Department Reject Button - Only show in in_progress section */}
                        {activeTab === "in_progress" && (
                          <DepartmentRejectButton 
                            complaint={complaint}
                            onReject={(complaintId, data) => {
                              // Refresh complaints list after rejection
                              setComplaints(prev => 
                                prev.map(c => 
                                  c._id === complaintId 
                                    ? { ...c, status: 'rejected_by_department' }
                                    : c
                                )
                              );
                            }}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Right Side - Image */}
                    <div style={{ 
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0
                    }}>
                      {complaint.imageUrl ? (
                        <div style={{ position: "relative" }}>
                          <img
                            src={complaint.imageUrl}
                            alt="Complaint"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(complaint.imageUrl, '_blank');
                            }}
                            style={{
                              width: "120px",
                              height: "90px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              cursor: "pointer",
                              transition: "transform 0.2s ease"
                            }}
                            onMouseOver={(e) => {
                              e.target.style.transform = "scale(1.02)";
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = "scale(1)";
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: "120px",
                          height: "90px",
                          backgroundColor: "#f3f4f6",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#9ca3af"
                        }}>
                          <span style={{ fontSize: "12px" }}>No Image</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#9ca3af",
              fontSize: "16px"
            }}>
              <FontAwesomeIcon 
                icon={activeTab === "resolved" ? faCheckCircle : faSpinner} 
                style={{ fontSize: "48px", marginBottom: "16px", color: "#d1d5db" }} 
              />
              <p style={{ margin: "0", fontWeight: "500" }}>
                {priorityFilter !== "all" ? 
                  `No ${activeTab.replace("_", " ")} ${departmentInfo?.departmentType || 'department'} complaints found with ${priorityFilter} priority` :
                  `No ${activeTab.replace("_", " ")} ${departmentInfo?.departmentType || 'department'} complaints found`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Analytics Page Content (More detailed analytics)
  const renderAnalyticsPage = () => (
    <>
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

      {/* Detailed Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "30px"
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: `3px solid ${departmentColor}`
        }}>
          <h2 style={{ margin: "0", color: "#000000", fontSize: "32px" }}>{stats.total}</h2>
          <p style={{ margin: "5px 0 0 0", color: "#666" }}>
            <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "5px" }} />
            Total {departmentInfo?.departmentType || 'Department'} Complaints
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "3px solid #17a2b8"
        }}>
          <h2 style={{ margin: "0", color: "#000000", fontSize: "32px" }}>{stats.in_progress}</h2>
          <p style={{ margin: "5px 0 0 0", color: "#666" }}>
            <FontAwesomeIcon icon={faSpinner} style={{ marginRight: "5px" }} />In Progress
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "3px solid #28a745"
        }}>
          <h2 style={{ margin: "0", color: "#000000", fontSize: "32px" }}>{stats.resolved}</h2>
          <p style={{ margin: "5px 0 0 0", color: "#666" }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: "5px" }} />Resolved
          </p>
        </div>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          textAlign: "center",
          border: "3px solid #ffc107"
        }}>
          <h2 style={{ margin: "0", color: "#000000", fontSize: "32px" }}>
            {Math.round((stats.resolved / (stats.total || 1)) * 100)}%
          </h2>
          <p style={{ margin: "5px 0 0 0", color: "#666" }}>
            <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "5px" }} />Resolution Rate
          </p>
        </div>
      </div>
    </>
  );

  // Render current page content
  const renderCurrentPage = () => {
    switch (currentPage) {
      case "complaints":
        return renderComplaintsPage();
      case "analytics":
        return renderAnalyticsPage();
      default:
        return renderHomePage();
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#f9fafb",
        padding: "25px 25px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: "32px",
        borderBottom: "1px solid #e5e7eb"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          {/* Logo/Brand */}
          <div style={{ display: "flex", alignItems: "center", flex: "1" }}>
            <FontAwesomeIcon 
              icon={departmentIcon} 
              style={{ fontSize: "24px", color: "#64748b", marginRight: "12px" }} 
            />
            <h1 style={{ margin: "0", color: "#1e293b", fontSize: "24px", fontWeight: "600" }}>
              {departmentInfo?.name || 'Department'} Dashboard
            </h1>
          </div>
          
          {/* Navigation Buttons - Centered */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            flex: "1",
            justifyContent: "center"
          }}>
            <button
              onClick={() => handlePageChange("home")}
              style={{
                padding: "12px 24px",
                backgroundColor: currentPage === "home" ? "#3b82f6" : "#f8fafc",
                color: currentPage === "home" ? "white" : "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "25px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: currentPage === "home" ? "0 2px 8px rgba(59, 130, 246, 0.2)" : "none"
              }}
              onMouseOver={(e) => {
                if (currentPage !== "home") {
                  e.target.style.backgroundColor = "#f1f5f9";
                  e.target.style.borderColor = "#cbd5e1";
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== "home") {
                  e.target.style.backgroundColor = "#f8fafc";
                  e.target.style.borderColor = "#e2e8f0";
                }
              }}
            >
              <FontAwesomeIcon 
                icon={faHome} 
                style={{ 
                  fontSize: "14px",
                  color: currentPage === "home" ? "white" : "#64748b"
                }} 
              />
              Home
            </button>
            
            <button
              onClick={() => handlePageChange("complaints")}
              style={{
                padding: "12px 24px",
                backgroundColor: currentPage === "complaints" ? "#3b82f6" : "#f8fafc",
                color: currentPage === "complaints" ? "white" : "#334155",
                border: "1px solid #e2e8f0",
                borderRadius: "25px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: currentPage === "complaints" ? "0 2px 8px rgba(59, 130, 246, 0.2)" : "none"
              }}
              onMouseOver={(e) => {
                if (currentPage !== "complaints") {
                  e.target.style.backgroundColor = "#f1f5f9";
                  e.target.style.borderColor = "#cbd5e1";
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== "complaints") {
                  e.target.style.backgroundColor = "#f8fafc";
                  e.target.style.borderColor = "#e2e8f0";
                }
              }}
            >
              <FontAwesomeIcon 
                icon={faClipboardList} 
                style={{ 
                  fontSize: "14px",
                  color: currentPage === "complaints" ? "white !important" : "#334155 !important"
                }} 
              />
              Complaints
            </button>
          </div>
          
          {/* Profile Dropdown */}
          <div style={{ position: "relative", flex: "1", display: "flex", justifyContent: "flex-end" }} data-profile-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileDropdown(!showProfileDropdown);
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "white",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "25px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                minWidth: "140px"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f8fafc";
                e.target.style.borderColor = "#cbd5e1";
                e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "white";
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
              }}
            >
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: showProfileDropdown ? "#1e293b" : "#3b82f6",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                <FontAwesomeIcon icon={faUser} />
              </div>
              <span style={{ color: "#1e293b", fontWeight: "500" }}>
                {departmentInfo?.departmentId || 'Admin'}
              </span>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                style={{ 
                  fontSize: "12px", 
                  transition: "transform 0.2s ease",
                  transform: showProfileDropdown ? "rotate(180deg)" : "rotate(0deg)",
                  color: "#94a3b8"
                }} 
              />
            </button>
            
            {showProfileDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: "0",
                marginTop: "8px",
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                border: "1px solid #e9ecef",
                minWidth: "200px",
                zIndex: 1000,
                overflow: "hidden"
              }}>
                {/* Profile Info */}
                <div style={{
                  padding: "16px",
                  borderBottom: "1px solid #e9ecef",
                  backgroundColor: "#f8f9fa"
                }}>
                  <div style={{ fontWeight: "600", color: "#2c3e50", marginBottom: "4px" }}>
                    {departmentInfo?.name || 'Department'}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d", marginBottom: "2px" }}>
                    ID: {departmentInfo?.departmentId}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d", marginBottom: "2px" }}>
                    Type: {departmentInfo?.departmentType}
                  </div>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    handleLogout();
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    backgroundColor: "white",
                    color: "#dc3545",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "white";
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
        {/* Render current page content */}
        {renderCurrentPage()}
      </div>

    {/* Complaint Details Modal */}
{selectedComplaint && (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
    boxSizing: "border-box",
    backdropFilter: "blur(4px)"
  }}>
    <div style={{
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      padding: "0",
      maxWidth: "750px",
      width: "100%",
      maxHeight: "90vh",
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      border: "1px solid rgba(229, 231, 235, 0.8)"
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 32px",
        borderBottom: "1px solid #f1f5f9",
        backgroundColor: "#fafbfc",
        position: "relative"
      }}>
        <button
          onClick={() => setSelectedComplaint(null)}
          style={{
            position: "absolute",
            top: "20px",
            right: "24px",
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#64748b",
            padding: "8px",
            borderRadius: "50%",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#f1f5f9";
            e.target.style.color = "#334155";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "transparent";
            e.target.style.color = "#64748b";
          }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px",
          paddingRight: "60px"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            backgroundColor: departmentColor || "#3b82f6",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white"
          }}>
            <FontAwesomeIcon 
              icon={departmentIcon} 
              style={{ fontSize: "20px" }} 
            />
          </div>
          <div>
            <h2 style={{ 
              margin: 0, 
              color: "#1e293b",
              fontSize: "20px",
              fontWeight: "600",
              lineHeight: "1.2"
            }}>
              {departmentInfo?.departmentType || 'Department'} Complaint
            </h2>
            <p style={{
              margin: "4px 0 0 0",
              color: "#64748b",
              fontSize: "14px"
            }}>
              ID: #{selectedComplaint._id?.slice(-8) || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding: "32px",
        maxHeight: "calc(90vh - 140px)",
        overflow: "auto"
      }}>
        {/* Description */}
        <div style={{ marginBottom: "32px" }}>
          <label style={{ 
            display: "block",
            fontSize: "14px", 
            fontWeight: "600", 
            color: "#374151",
            marginBottom: "8px"
          }}>
            Description
          </label>
          <div style={{
            padding: "16px",
            backgroundColor: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            color: "#475569",
            fontSize: "15px",
            lineHeight: "1.6"
          }}>
            {selectedComplaint.description}
          </div>
        </div>

        {/* Media Content */}
        {(selectedComplaint.imageUrl || selectedComplaint.audioUrl) && (
          <div style={{ marginBottom: "32px" }}>
            <label style={{ 
              display: "block",
              fontSize: "14px", 
              fontWeight: "600", 
              color: "#374151",
              marginBottom: "12px"
            }}>
              Attachments
            </label>
            
            {selectedComplaint.imageUrl && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    marginBottom: "12px",
                    color: "#64748b",
                    fontSize: "13px"
                  }}>
                    <FontAwesomeIcon icon={faImage} />
                    <span>Click image to view full size</span>
                  </div>
                  <img
                    src={selectedComplaint.imageUrl}
                    alt="Complaint"
                    onClick={() => window.open(selectedComplaint.imageUrl, '_blank')}
                    style={{
                      width: "100%",
                      maxHeight: "200px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      border: "1px solid #e2e8f0"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = "scale(1.02)";
                      e.target.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
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
              <div style={{
                padding: "16px",
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  marginBottom: "12px",
                  color: "#64748b",
                  fontSize: "13px"
                }}>
                  <FontAwesomeIcon icon={faMicrophone} />
                  <span>Audio Message</span>
                </div>
                <audio controls style={{ 
                  width: "100%", 
                  height: "40px",
                  borderRadius: "6px"
                }}>
                  <source src={selectedComplaint.audioUrl} type="audio/wav" />
                  <source src={selectedComplaint.audioUrl} type="audio/mp3" />
                </audio>
              </div>
            )}
          </div>
        )}

        {/* Location & Details Grid */}
        <div style={{ marginBottom: "32px" }}>
          <label style={{ 
            display: "block",
            fontSize: "14px", 
            fontWeight: "600", 
            color: "#374151",
            marginBottom: "12px"
          }}>
            Location & Details
          </label>
          
          <div style={{
            padding: "20px",
            backgroundColor: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0"
          }}>
            {/* Address */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                marginBottom: "8px"
              }}>
                <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: "#ef4444", fontSize: "14px" }} />
                <span style={{ fontWeight: "500", color: "#374151", fontSize: "14px" }}>Address</span>
              </div>
              <p style={{ 
                margin: "0 0 8px 22px", 
                color: "#475569",
                fontSize: "14px",
                lineHeight: "1.5"
              }}>
                {selectedComplaint.location?.detailedAddress || selectedComplaint.location?.address || `${selectedComplaint.location?.city}, ${selectedComplaint.location?.state}`}
              </p>
              
              {/* Additional location details */}
              <div style={{ marginLeft: "22px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {selectedComplaint.location?.streetAddress && (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Street: {selectedComplaint.location.streetAddress}
                  </span>
                )}
                {selectedComplaint.location?.sublocality && (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Area: {selectedComplaint.location.sublocality}
                  </span>
                )}
                {selectedComplaint.location?.postalCode && (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Postal Code: {selectedComplaint.location.postalCode}
                  </span>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "16px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FontAwesomeIcon icon={faPhone} style={{ color: "#8b5cf6", fontSize: "14px" }} />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>Phone</span>
                  <span style={{ fontSize: "14px", color: "#374151", fontWeight: "500" }}>
                    {selectedComplaint.phone ? `******${selectedComplaint.phone.slice(-4)}` : 'N/A'}
                  </span>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FontAwesomeIcon icon={faChartBar} style={{ color: "#10b981", fontSize: "14px" }} />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>Status</span>
                  <span style={{ 
                    fontSize: "14px", 
                    fontWeight: "600",
                    color: getStatusColor(selectedComplaint.status),
                    textTransform: "capitalize"
                  }}>
                    {selectedComplaint.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FontAwesomeIcon icon={faCalendarAlt} style={{ color: "#f59e0b", fontSize: "14px" }} />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>Created</span>
                  <span style={{ fontSize: "14px", color: "#374151", fontWeight: "500" }}>
                    {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Section */}
        {selectedComplaint.priority && (
          <div style={{ marginBottom: "32px" }}>
            <label style={{ 
              display: "block",
              fontSize: "14px", 
              fontWeight: "600", 
              color: "#374151",
              marginBottom: "12px"
            }}>
              Priority Information
            </label>
            
            <div style={{
              padding: "20px",
              borderRadius: "10px",
              backgroundColor: selectedComplaint.priority === 'High' ? '#fef2f2' : selectedComplaint.priority === 'Medium' ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${selectedComplaint.priority === 'High' ? '#fecaca' : selectedComplaint.priority === 'Medium' ? '#fed7aa' : '#bbf7d0'}`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: selectedComplaint.priority === 'High' ? '#dc2626' : selectedComplaint.priority === 'Medium' ? '#f59e0b' : '#10b981',
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <FontAwesomeIcon 
                    icon={faBolt} 
                    style={{ color: "white", fontSize: "14px" }}
                  />
                </div>
                <div>
                  <div style={{ 
                    fontSize: "16px", 
                    fontWeight: "600", 
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    {selectedComplaint.priority === 'High' ? '🚨' : selectedComplaint.priority === 'Medium' ? '⚠️' : '📝'}
                    {selectedComplaint.priority} Priority
                  </div>
                  {selectedComplaint.priorityReason && (
                    <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
                      {selectedComplaint.priorityReason}
                    </div>
                  )}
                </div>
              </div>
              
              {(selectedComplaint.areaName || selectedComplaint.highPriorityPlace) && (
                <div style={{ 
                  paddingTop: "12px", 
                  borderTop: "1px solid rgba(0,0,0,0.1)",
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap"
                }}>
                  {selectedComplaint.areaName && (
                    <span style={{ fontSize: "13px", color: "#64748b" }}>
                      <strong>Area:</strong> {selectedComplaint.areaName}
                    </span>
                  )}
                  {selectedComplaint.highPriorityPlace && (
                    <span style={{ fontSize: "13px", color: "#64748b" }}>
                      <strong>Near:</strong> {selectedComplaint.highPriorityPlace}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        

        {/* Status Messages */}
        {selectedComplaint.status === "pending" && (
          <div style={{
            padding: "16px",
            backgroundColor: "#fffbeb",
            borderRadius: "10px",
            border: "1px solid #fed7aa",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#f59e0b",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <FontAwesomeIcon icon={faClock} style={{ color: "white", fontSize: "14px" }} />
            </div>
            <div style={{ color: "#92400e", fontSize: "14px", lineHeight: "1.5" }}>
              <strong>Pending Approval</strong><br />
              This complaint is waiting for admin approval before processing.
            </div>
          </div>
        )}
        
        {selectedComplaint.status === "resolved" && (
          <div style={{
            padding: "16px",
            backgroundColor: "#f0fdf4",
            borderRadius: "10px",
            border: "1px solid #bbf7d0",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#10b981",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <FontAwesomeIcon icon={faCheckCircle} style={{ color: "white", fontSize: "14px" }} />
            </div>
            <div style={{ color: "#065f46", fontSize: "14px", lineHeight: "1.5" }}>
              <div style={{ fontWeight: "600", marginBottom: "4px" }}>Complaint Resolved</div>
              <div>This complaint has been successfully resolved.</div>
              {selectedComplaint.departmentComment && (
                <div style={{ 
                  marginTop: "12px", 
                  padding: "12px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  borderRadius: "6px",
                  borderLeft: "3px solid #10b981"
                }}>
                  <strong>Resolution Comment:</strong><br />
                  {selectedComplaint.departmentComment}
                </div>
              )}
            </div>
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
          userRole="department"
          chatWith={chatUserType} // 'user' or 'admin'
        />
      )}
    </div>
  );
}

export default DepartmentDashboard;