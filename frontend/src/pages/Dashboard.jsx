import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap } from "@fortawesome/free-solid-svg-icons";
import ComplaintForm from "../components/ComplaintForm";
import ExploreComplaints from "../components/ExploreComplaints";
import CommunityComplaints from "../components/CommunityComplaints";
import Janawaaz from "../components/Janawaaz";
import Rewards from "../components/Rewards";
import WarningNotification from "../components/WarningNotification";
import { api, APIError } from "../utils/api";

function Dashboard() {
  const [complaints, setComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState("open"); // open | closed | explore | community | janawaaz | rewards
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [userDetails, setUserDetails] = useState({});
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Manual refresh function for testing
  const handleManualRefresh = () => {
    console.log('[DASHBOARD-MANUAL] Manual refresh triggered...');
    setLoading(true);
    api.getComplaints(token)
      .then((data) => {
        console.log('[DASHBOARD-MANUAL] Manual refresh - got data:', data.complaints?.length || 0, 'complaints');
        if (data.complaints) {
          const rejectedComplaints = data.complaints.filter(c => c.status === 'rejected');
          console.log('[DASHBOARD-MANUAL] Manual refresh - rejected complaints:', rejectedComplaints.length);
          console.log('[DASHBOARD-MANUAL] Manual refresh - warning-given complaints:', 
            data.complaints.filter(c => c.status === 'rejected' && c.rejectionReason === 'Warning Given').length);
        }
        setComplaints(data.complaints || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error in manual refresh:", error);
        setLoading(false);
      });
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

  useEffect(() => {
    if (token) {
      // Fetch complaints using API utility
      api.getComplaints(token)
        .then((data) => {
          console.log('[DASHBOARD-DEBUG] API Response:', data);
          console.log('[DASHBOARD-DEBUG] Complaints data:', data.complaints);
          console.log('[DASHBOARD-DEBUG] Number of complaints:', data.complaints?.length || 0);
          if (data.complaints && data.complaints.length > 0) {
            console.log('[DASHBOARD-DEBUG] First complaint audio data:', {
              audio: data.complaints[0].audio,
              audioUrl: data.complaints[0].audioUrl
            });
            console.log('[DASHBOARD-DEBUG] All complaint statuses:', data.complaints.map(c => ({ id: c._id, status: c.status, rejectionReason: c.rejectionReason })));
            console.log('[DASHBOARD-DEBUG] Rejected complaints:', data.complaints.filter(c => c.status === 'rejected'));
            console.log('[DASHBOARD-DEBUG] Warning-given complaints:', data.complaints.filter(c => c.status === 'rejected' && c.rejectionReason === 'Warning Given'));
          } else {
            console.log('[DASHBOARD-DEBUG] No complaints found in response');
          }
          setComplaints(data.complaints || []);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching complaints:", error);
          if (error instanceof APIError) {
            setError(`Failed to load complaints: ${error.message}`);
          } else {
            setError("Failed to load complaints");
          }
          setComplaints([]);
          setLoading(false);
        });

      // Fetch user details using API utility
      api.getUserProfile(token)
        .then((data) => {
          console.log('User profile API response:', data);
          if (data.user) {
            console.log('Setting user details:', data.user);
            setUserDetails(data.user);
          } else {
            console.log('No user data in response:', data);
          }
        })
        .catch((error) => {
          console.error("Error fetching user details:", error);
          // Don't show error for user details as it's not critical
        });
    }
  }, [token]);

  // Periodic refresh to catch status updates from admin actions
  useEffect(() => {
    if (!token) return;
    
    const refreshInterval = setInterval(() => {
      console.log('[DASHBOARD-REFRESH] Refreshing complaints data...');
      api.getComplaints(token)
        .then((data) => {
          console.log('[DASHBOARD-REFRESH] Refreshed data received:', data.complaints?.length || 0, 'complaints');
          if (data.complaints) {
            const rejectedComplaints = data.complaints.filter(c => c.status === 'rejected');
            console.log('[DASHBOARD-REFRESH] Rejected complaints after refresh:', rejectedComplaints.length);
            console.log('[DASHBOARD-REFRESH] Warning-given complaints after refresh:', 
              data.complaints.filter(c => c.status === 'rejected' && c.rejectionReason === 'Warning Given').length);
          }
          setComplaints(data.complaints || []);
        })
        .catch((error) => {
          console.error("Error refreshing complaints:", error);
        });
    }, 5000); // Refresh every 5 seconds for testing

    return () => clearInterval(refreshInterval);
  }, [token]);

  // Filter complaints by status (handle case where complaints might not be loaded yet)
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

  // Debug closed complaints
  console.log('[DASHBOARD-DEBUG] Total complaints:', complaints.length);
  console.log('[DASHBOARD-DEBUG] Closed complaints count:', closedComplaints.length);
  console.log('[DASHBOARD-DEBUG] Closed complaints:', closedComplaints.map(c => ({ id: c._id, status: c.status, rejectionReason: c.rejectionReason })));

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <p style={{ color: "red" }}>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
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
          className="fixed inset-0 bg-black bg-opacity-50 z-[999] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-screen bg-white text-gray-800 z-[1000]
          transition-all duration-300 ease-in-out overflow-hidden
          border-r border-gray-200
          ${sidebarOpen 
            ? 'w-72 shadow-lg' 
            : 'w-0'
          }
          ${!sidebarOpen ? 'md:transform-none transform -translate-x-full' : 'transform-none'}
        `}
      >
        <div className="py-6 w-72">
          {/* Sidebar Header with Menu Button */}
          <div className="px-4 pb-6 border-b border-gray-200 mb-4 flex items-center gap-3">
            {/* Menu Button in Sidebar */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-full 
                         transition-all duration-200 w-8 h-8 flex items-center justify-center
                         hover:bg-gray-100 hover:text-gray-800"
            >
              <i className="fas fa-bars text-sm"></i>
            </button>
            <h2 className="m-0 text-gray-800 text-xl font-normal tracking-tight">
              MeriCity
            </h2>
          </div>
          
          {/* Navigation Items */}
          <div className="px-3">
            <button
              onClick={() => setActiveTab("open")}
              className={`
                w-full py-3 px-5 border-none rounded-lg cursor-pointer text-left mb-1 
                text-sm transition-all duration-200 flex items-center gap-3
                ${activeTab === "open" 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'bg-transparent text-gray-500 font-normal hover:bg-gray-100 hover:text-gray-800'
                }
              `}
            >
              <i className="fas fa-folder-open text-base"></i>
              <span>Open Complaints</span>
            </button>
            
            <button
              onClick={() => setActiveTab("closed")}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: activeTab === "closed" ? "#e8f0fe" : "transparent",
                color: activeTab === "closed" ? "#1a73e8" : "#5f6368",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "closed" ? "500" : "400",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
              onMouseOver={(e) => {
                if (activeTab !== "closed") {
                  e.target.style.backgroundColor = "#f1f3f4";
                  e.target.style.color = "#202124";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== "closed") {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#5f6368";
                }
              }}
            >
              <i className="fas fa-check-circle" style={{ fontSize: "16px" }}></i>
              <span>Closed Complaints</span>
            </button>
            
            {/* Manual Refresh Button for Testing */}
            <button
              onClick={handleManualRefresh}
              style={{
                width: "100%",
                padding: "8px 20px",
                backgroundColor: "#f8f9fa",
                color: "#28a745",
                border: "1px solid #28a745",
                borderRadius: "6px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "8px",
                fontSize: "12px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#28a745";
                e.target.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#f8f9fa";
                e.target.style.color = "#28a745";
              }}
            >
              <i className="fas fa-sync-alt" style={{ fontSize: "12px" }}></i>
              <span>Refresh Data</span>
            </button>
            
            <button
              onClick={() => setActiveTab("explore")}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: activeTab === "explore" ? "#e8f0fe" : "transparent",
                color: activeTab === "explore" ? "#1a73e8" : "#5f6368",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "explore" ? "500" : "400",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
              onMouseOver={(e) => {
                if (activeTab !== "explore") {
                  e.target.style.backgroundColor = "#f1f3f4";
                  e.target.style.color = "#202124";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== "explore") {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#5f6368";
                }
              }}
            >
              <i className="fas fa-map-marked-alt" style={{ fontSize: "16px" }}></i>
              <span>Explore Map</span>
            </button>
            
            <button
              onClick={() => setActiveTab("community")}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: activeTab === "community" ? "#e8f0fe" : "transparent",
                color: activeTab === "community" ? "#1a73e8" : "#5f6368",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "community" ? "500" : "400",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
              onMouseOver={(e) => {
                if (activeTab !== "community") {
                  e.target.style.backgroundColor = "#f1f3f4";
                  e.target.style.color = "#202124";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== "community") {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#5f6368";
                }
              }}
            >
              <i className="fas fa-users" style={{ fontSize: "16px" }}></i>
              <span>Community</span>
            </button>
            
            <button
              onClick={() => setActiveTab("janawaaz")}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: activeTab === "janawaaz" ? "#fef7e0" : "transparent",
                color: activeTab === "janawaaz" ? "#f57f17" : "#5f6368",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "janawaaz" ? "500" : "400",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
              onMouseOver={(e) => {
                if (activeTab !== "janawaaz") {
                  e.target.style.backgroundColor = "#f1f3f4";
                  e.target.style.color = "#202124";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== "janawaaz") {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#5f6368";
                }
              }}
            >
              <i className="fas fa-trophy" style={{ fontSize: "16px" }}></i>
              <span>Janawaaz</span>
            </button>
            
            <button
              onClick={() => setActiveTab("rewards")}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: activeTab === "rewards" ? "#fef7e0" : "transparent",
                color: activeTab === "rewards" ? "#f57f17" : "#5f6368",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "rewards" ? "500" : "400",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
              onMouseOver={(e) => {
                if (activeTab !== "rewards") {
                  e.target.style.backgroundColor = "#f1f3f4";
                  e.target.style.color = "#202124";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== "rewards") {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#5f6368";
                }
              }}
            >
              <i className="fas fa-gift" style={{ fontSize: "16px" }}></i>
              <span>Rewards</span>
            </button>
          </div>
          
          {/* Logout Button */}
          <div style={{ 
            position: "absolute", 
            bottom: "24px", 
            left: "12px", 
            right: "12px",
            borderTop: "1px solid #e8eaed",
            paddingTop: "16px"
          }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: "transparent",
                color: "#d93025",
                border: "1px solid #e8eaed",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#fce8e6";
                e.target.style.borderColor = "#d93025";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.borderColor = "#e8eaed";
              }}
            >
              <i className="fas fa-sign-out-alt" style={{ fontSize: "14px" }}></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          marginLeft: window.innerWidth > 768 && sidebarOpen ? "280px" : "0",
          transition: "margin-left 0.3s ease",
          position: "relative",
          backgroundColor: "#fafafa",
          minHeight: "100vh",
          width: window.innerWidth <= 768 ? "100%" : "auto"
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#ffffff",
            color: "#202124",
            padding: window.innerWidth <= 768 ? "16px 16px" : "20px 24px",
            minHeight: "64px",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
            borderBottom: "1px solid #e8eaed"
          }}
        >
          {/* Show hamburger menu only when sidebar is closed */}
          {!sidebarOpen && (
            <>
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#5f6368",
                  cursor: "pointer",
                  padding: "8px",
                  marginRight: "20px",
                  borderRadius: "50%",
                  transition: "all 0.2s ease",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#f1f3f4";
                  e.target.style.color = "#202124";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#5f6368";
                }}
              >
                <i className="fas fa-bars" style={{ fontSize: "20px" }}></i>
              </button>
              <h1 style={{ 
                margin: 0, 
                fontSize: "24px", 
                fontWeight: "500", 
                color: "#202124",
                letterSpacing: "-0.5px",
                lineHeight: "1.2"
              }}>
                MeriCity
              </h1>
            </>
          )}

          {/* Profile Button - Always visible */}
          <div style={{ marginLeft: "auto", position: "relative" }} data-profile-dropdown>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              style={{
                background: "none",
                border: "none",
                color: "#5f6368",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "50%",
                transition: "all 0.2s ease",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f1f3f4";
                e.target.style.color = "#202124";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#5f6368";
              }}
            >
              <i className="fas fa-user-circle" style={{ fontSize: "24px" }}></i>
            </button>

            {/* Profile Dropdown */}
            {showProfileDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: "0",
                backgroundColor: "#ffffff",
                border: "1px solid #e8eaed",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 1001,
                minWidth: "200px",
                marginTop: "8px"
              }}>
                <div style={{ padding: "8px 0" }}>
                  {/* Change Password */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowChangePasswordModal(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      backgroundColor: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#202124",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <i className="fas fa-key" style={{ fontSize: "14px", color: "#5f6368" }}></i>
                    Change Password
                  </button>

                  {/* Edit Details */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      console.log('Opening Edit Details modal. Current userDetails:', userDetails);
                      setShowEditDetailsModal(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      backgroundColor: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#202124",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <i className="fas fa-edit" style={{ fontSize: "14px", color: "#5f6368" }}></i>
                    Edit Details
                  </button>

                  {/* Divider */}
                  <div style={{ height: "1px", backgroundColor: "#e8eaed", margin: "8px 0" }}></div>

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleLogout();
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      backgroundColor: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#d93025",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#fce8e6";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <i className="fas fa-sign-out-alt" style={{ fontSize: "14px", color: "#d93025" }}></i>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ 
          padding: window.innerWidth <= 768 ? "12px" : "20px", 
          textAlign: "center" 
        }}>

          {/* Tab Content */}
          {activeTab === "open" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                <i className="fas fa-folder-open" style={{ fontSize: "24px", color: "#1a73e8", marginRight: "12px" }}></i>
                <h3 style={{ margin: "0", fontSize: "28px", fontWeight: "500", color: "#202124" }}>Open Complaints</h3>
              </div>
              {openComplaints.length > 0 ? (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: window.innerWidth <= 480 
                    ? "1fr" 
                    : window.innerWidth <= 768 
                      ? "repeat(auto-fill, minmax(280px, 1fr))"
                      : "repeat(auto-fill, minmax(320px, 1fr))", 
                  gap: window.innerWidth <= 768 ? "12px" : "16px", 
                  maxWidth: "1600px", 
                  margin: "0 auto", 
                  padding: window.innerWidth <= 768 ? "0 12px" : "0 20px"
                }}>
                  {openComplaints.map((c) => (
                    <div key={c._id} className="complaint-card" style={{ 
                      backgroundColor: "#ffffff",
                      borderRadius: "12px", 
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
                      border: "1px solid #e8eaed",
                      cursor: "pointer",
                      position: "relative"
                    }}
                    onClick={() => setSelectedComplaint(c)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                      e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.1)";
                      e.currentTarget.style.borderColor = "#1a73e8";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)";
                      e.currentTarget.style.borderColor = "#e8eaed";
                    }}
                    >
                      {/* Card Image - Always at top */}
                      {c.imageUrl ? (
                        <div style={{ position: "relative" }}>
                          <img 
                            src={c.imageUrl} 
                            alt="Complaint" 
                            style={{ 
                              width: "100%", 
                              height: "180px", 
                              objectFit: "cover",
                              display: "block"
                            }}
                          />
                          {/* Status overlay on image */}
                          <div style={{
                            position: "absolute",
                            top: "12px",
                            left: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(8px)",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                          }}>
                            <i className={`fas ${c.status === "pending" ? "fa-clock" : 
                                            c.status === "in_progress" ? "fa-sync-alt" :
                                            c.status === "resolved" ? "fa-check-circle" :
                                            c.status === "rejected" && c.rejectionReason === "Warning Given" ? "fa-exclamation-triangle" :
                                            c.status === "rejected" ? "fa-times-circle" : "fa-question-circle"}`} style={{
                              fontSize: "12px",
                              color: c.status === "pending" ? "#f57c00" : 
                                     c.status === "in_progress" ? "#1976d2" :
                                     c.status === "resolved" ? "#4caf50" :
                                     c.status === "rejected" && c.rejectionReason === "Warning Given" ? "#ff9800" :
                                     c.status === "rejected" ? "#f44336" : "#757575",
                              animation: c.status === "in_progress" ? "spin 2s linear infinite" : "none"
                            }}></i>
                            <span style={{
                              color: c.status === "pending" ? "#f57c00" : 
                                     c.status === "in_progress" ? "#1976d2" :
                                     c.status === "resolved" ? "#4caf50" :
                                     c.status === "rejected" && c.rejectionReason === "Warning Given" ? "#ff9800" :
                                     c.status === "rejected" ? "#f44336" : "#757575",
                              fontSize: "11px",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px"
                            }}>
                              {c.status === "pending" ? "PENDING" :
                               c.status === "in_progress" ? "IN PROGRESS" :
                               c.status === "resolved" ? "RESOLVED" :
                               c.status === "rejected" && c.rejectionReason === "Warning Given" ? "WARNING GIVEN" :
                               c.status === "rejected" ? "REJECTED" : c.status.toUpperCase()}
                            </span>
                          </div>
                          {/* Priority badge on image */}
                          {c.priority && (
                            <div className={c.priority === "High" ? "priority-high" : ""} style={{
                              position: "absolute",
                              top: "12px",
                              right: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: c.priority === "High" ? "rgba(244, 67, 54, 0.95)" : 
                                             c.priority === "Medium" ? "rgba(255, 152, 0, 0.95)" : "rgba(76, 175, 80, 0.95)",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                              fontWeight: "600"
                            }}>
                              <i className={`fas ${c.priority === "High" ? "fa-exclamation-triangle" : 
                                                  c.priority === "Medium" ? "fa-exclamation-circle" : 
                                                  "fa-info-circle"}`} style={{ fontSize: "10px" }}></i>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                textTransform: "uppercase"
                              }}>
                                {c.priority}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          height: "120px",
                          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative"
                        }}>
                          <i className="fas fa-image" style={{ fontSize: "32px", color: "#9e9e9e", opacity: "0.6" }}></i>
                          {/* Status and priority for cards without image */}
                          <div style={{
                            position: "absolute",
                            top: "12px",
                            left: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            backdropFilter: "blur(4px)",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                          }}>
                            <i className={`fas ${c.status === "pending" ? "fa-clock" : 
                                            c.status === "in_progress" ? "fa-sync-alt" :
                                            c.status === "resolved" ? "fa-check-circle" :
                                            c.status === "rejected" ? "fa-times-circle" : "fa-question-circle"}`} style={{
                              fontSize: "12px",
                              color: c.status === "pending" ? "#f57c00" : 
                                     c.status === "in_progress" ? "#1976d2" :
                                     c.status === "resolved" ? "#4caf50" :
                                     c.status === "rejected" ? "#f44336" : "#757575",
                              animation: c.status === "in_progress" ? "spin 2s linear infinite" : "none"
                            }}></i>
                            <span style={{
                              color: c.status === "pending" ? "#f57c00" : 
                                     c.status === "in_progress" ? "#1976d2" :
                                     c.status === "resolved" ? "#4caf50" :
                                     c.status === "rejected" ? "#f44336" : "#757575",
                              fontSize: "11px",
                              fontWeight: "600",
                              textTransform: "uppercase"
                            }}>
                              {c.status === "pending" ? "PENDING" :
                               c.status === "in_progress" ? "IN PROGRESS" :
                               c.status === "resolved" ? "RESOLVED" :
                               c.status === "rejected" ? "REJECTED" : c.status.toUpperCase()}
                            </span>
                          </div>
                          {c.priority && (
                            <div className={c.priority === "High" ? "priority-high" : ""} style={{
                              position: "absolute",
                              top: "12px",
                              right: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: c.priority === "High" ? "rgba(244, 67, 54, 0.9)" : 
                                             c.priority === "Medium" ? "rgba(255, 152, 0, 0.9)" : "rgba(76, 175, 80, 0.9)",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                              fontWeight: "600"
                            }}>
                              <i className={`fas ${c.priority === "High" ? "fa-exclamation-triangle" : 
                                                  c.priority === "Medium" ? "fa-exclamation-circle" : 
                                                  "fa-info-circle"}`} style={{ fontSize: "10px" }}></i>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                textTransform: "uppercase"
                              }}>
                                {c.priority}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Content */}
                      <div style={{ padding: "16px" }}>
                        {/* Date */}
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "flex-end",
                          marginBottom: "12px" 
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#6b7280",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}>
                            <i className="fas fa-calendar-alt" style={{ fontSize: "11px" }}></i>
                            <span>
                              {new Date(c.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: new Date(c.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Expandable content - shown on hover/click */}
                        <div style={{ 
                          opacity: "0",
                          maxHeight: "0",
                          overflow: "hidden",
                          transition: "all 0.3s ease",
                          pointerEvents: "none"
                        }} className="card-details">
                          {/* Description */}
                          <div style={{ marginBottom: "12px" }}>
                            <p style={{ 
                              margin: "0", 
                              fontSize: "14px", 
                              lineHeight: "1.5", 
                              color: "#374151",
                              fontWeight: "400"
                            }}>
                              {c.description}
                            </p>
                          </div>

                          {/* Contact and Actions */}
                          <div style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "space-between",
                            paddingTop: "12px",
                            borderTop: "1px solid #f3f4f6"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <i className="fas fa-phone" style={{ fontSize: "12px", color: "#6b7280" }}></i>
                              <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>{c.phone}</span>
                            </div>
                            
                            {/* Chat button for department-assigned complaints */}
                    
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <i className="fas fa-inbox" style={{ fontSize: "48px", color: "#dadce0", marginBottom: "16px" }}></i>
                  <p style={{ fontSize: "18px", color: "#5f6368", margin: "0" }}>No open complaints found</p>
                </div>
              )}
            </>
          )}

          {activeTab === "closed" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                <i className="fas fa-check-circle" style={{ fontSize: "24px", color: "#34a853", marginRight: "12px" }}></i>
                <h3 style={{ margin: "0", fontSize: "28px", fontWeight: "500", color: "#202124" }}>
                  Closed Complaints ({closedComplaints.length})
                </h3>
              </div>
              
              {/* Temporary debug info */}
              {closedComplaints.length > 0 && (
                <div style={{
                  marginBottom: "20px",
                  padding: "10px",
                  backgroundColor: "#f0f0f0",
                  borderRadius: "5px",
                  fontSize: "12px",
                  color: "#666"
                }}>
                  <strong>Debug Info:</strong>{' '}
                  Resolved: {closedComplaints.filter(c => c.status === "resolved").length},{' '}
                  Rejected: {closedComplaints.filter(c => c.status === "rejected").length},{' '}
                  Closed: {closedComplaints.filter(c => c.status === "closed").length}
                </div>
              )}
              {closedComplaints.length > 0 ? (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: window.innerWidth <= 480 
                    ? "1fr" 
                    : window.innerWidth <= 768 
                      ? "repeat(auto-fill, minmax(280px, 1fr))"
                      : "repeat(auto-fill, minmax(320px, 1fr))", 
                  gap: window.innerWidth <= 768 ? "12px" : "16px", 
                  maxWidth: "1600px", 
                  margin: "0 auto", 
                  padding: window.innerWidth <= 768 ? "0 12px" : "0 20px"
                }}>
                  {closedComplaints.map((c) => (
                    <div key={c._id} className="complaint-card" style={{ 
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
                      border: "1px solid #e8eaed",
                      borderLeft: `4px solid ${(c.status === "rejected" || c.status === "rejected_by_user" || c.status === "rejected_no_answer") ? "#f44336" : "#34a853"}`,
                      cursor: "pointer",
                      position: "relative",
                      opacity: "0.95"
                    }}
                    onClick={() => setSelectedComplaint(c)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px) scale(1.01)";
                      e.currentTarget.style.boxShadow = (c.status === "rejected" || c.status === "rejected_by_user" || c.status === "rejected_no_answer")
                        ? "0 8px 25px rgba(244, 67, 54, 0.15), 0 3px 10px rgba(0,0,0,0.1)"
                        : "0 8px 25px rgba(52, 168, 83, 0.15), 0 3px 10px rgba(0,0,0,0.1)";
                      e.currentTarget.style.borderLeftColor = (c.status === "rejected" || c.status === "rejected_by_user" || c.status === "rejected_no_answer") ? "#d32f2f" : "#2e7d32";
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)";
                      e.currentTarget.style.borderLeftColor = (c.status === "rejected" || c.status === "rejected_by_user" || c.status === "rejected_no_answer") ? "#f44336" : "#34a853";
                      e.currentTarget.style.opacity = "0.95";
                    }}
                    >
                      {/* Card Image - Always at top */}
                      {c.imageUrl ? (
                        <div style={{ position: "relative" }}>
                          <img 
                            src={c.imageUrl} 
                            alt="Complaint" 
                            style={{ 
                              width: "100%", 
                              height: "180px", 
                              objectFit: "cover",
                              display: "block",
                              filter: "grayscale(0.2) brightness(0.9)"
                            }}
                          />
                          {/* Resolved overlay on image */}
                          <div style={{
                            position: "absolute",
                            top: "12px",
                            left: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: c.status === "rejected" ? "rgba(244, 67, 54, 0.95)" : "rgba(76, 175, 80, 0.95)",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            boxShadow: c.status === "rejected" ? "0 2px 8px rgba(244, 67, 54, 0.4)" : "0 2px 8px rgba(76, 175, 80, 0.4)"
                          }}>
                            <i className={`fas ${c.status === "rejected" ? "fa-times-circle" : "fa-check-circle"}`} style={{ fontSize: "12px" }}></i>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px"
                            }}>
                              {c.status === "rejected" ? "REJECTED" : "RESOLVED"}
                            </span>
                          </div>
                          {/* Priority badge on image */}
                          {c.priority && (
                            <div style={{
                              position: "absolute",
                              top: "12px",
                              right: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: c.priority === "High" ? "rgba(244, 67, 54, 0.8)" : 
                                             c.priority === "Medium" ? "rgba(255, 152, 0, 0.8)" : "rgba(76, 175, 80, 0.8)",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                              opacity: "0.8"
                            }}>
                              <i className={`fas ${c.priority === "High" ? "fa-exclamation-triangle" : 
                                                  c.priority === "Medium" ? "fa-exclamation-circle" : 
                                                  "fa-info-circle"}`} style={{ fontSize: "10px" }}></i>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                textTransform: "uppercase"
                              }}>
                                {c.priority}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          height: "120px",
                          background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative"
                        }}>
                          <i className="fas fa-image" style={{ fontSize: "32px", color: "#81c784", opacity: "0.6" }}></i>
                          {/* Status for cards without image */}
                          <div style={{
                            position: "absolute",
                            top: "12px",
                            left: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: c.status === "rejected" ? "rgba(244, 67, 54, 0.9)" : "rgba(76, 175, 80, 0.9)",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            boxShadow: c.status === "rejected" ? "0 2px 6px rgba(244, 67, 54, 0.3)" : "0 2px 6px rgba(76, 175, 80, 0.3)"
                          }}>
                            <i className={`fas ${c.status === "rejected" ? "fa-times-circle" : "fa-check-circle"}`} style={{ fontSize: "12px" }}></i>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              textTransform: "uppercase"
                            }}>
                              {c.status === "rejected" ? "REJECTED" : "RESOLVED"}
                            </span>
                          </div>
                          {c.priority && (
                            <div style={{
                              position: "absolute",
                              top: "12px",
                              right: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: c.priority === "High" ? "rgba(244, 67, 54, 0.8)" : 
                                             c.priority === "Medium" ? "rgba(255, 152, 0, 0.8)" : "rgba(76, 175, 80, 0.8)",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                              opacity: "0.8"
                            }}>
                              <i className={`fas ${c.priority === "High" ? "fa-exclamation-triangle" : 
                                                  c.priority === "Medium" ? "fa-exclamation-circle" : 
                                                  "fa-info-circle"}`} style={{ fontSize: "10px" }}></i>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                textTransform: "uppercase"
                              }}>
                                {c.priority}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Content */}
                      <div style={{ padding: "16px" }}>
                        {/* Date */}
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px" 
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: (c.status === "rejected" || c.status === "rejected_by_user" || c.status === "rejected_no_answer") ? "#fef2f2" : "#e8f5e9",
                            color: (c.status === "rejected" || c.status === "rejected_by_user" || c.status === "rejected_no_answer") ? "#dc2626" : "#2e7d32",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "10px",
                            fontWeight: "600"
                          }}>
                            <i className={`fas ${(c.status === "rejected" || c.status === "rejected_by_user" || c.status === "rejected_no_answer") ? "fa-times" : "fa-check"}`} style={{ fontSize: "9px" }}></i>
                            <span>{(c.status === "rejected" || c.status === "rejected_by_user" || c.status === "rejected_no_answer") ? "REJECTED" : "COMPLETED"}</span>
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#6b7280",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}>
                            <i className="fas fa-calendar-alt" style={{ fontSize: "11px" }}></i>
                            <span>
                              {new Date(c.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: new Date(c.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Expandable content - shown on hover/click */}
                        <div style={{ 
                          opacity: "0",
                          maxHeight: "0",
                          overflow: "hidden",
                          transition: "all 0.3s ease",
                          pointerEvents: "none"
                        }} className="card-details">
                          {/* Description */}
                          <div style={{ marginBottom: "12px" }}>
                            <p style={{ 
                              margin: "0", 
                              fontSize: "14px", 
                              lineHeight: "1.5", 
                              color: "#374151",
                              fontWeight: "400"
                            }}>
                              {c.description}
                            </p>
                            
                            {/* Rejection Reason - Only show for rejected complaints */}
                            {c.status === "rejected" && c.rejectionReason && (
                              <div style={{
                                marginTop: "12px",
                                padding: "12px",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: "6px"
                              }}>
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  marginBottom: "6px"
                                }}>
                                  <i className="fas fa-exclamation-triangle" style={{ 
                                    fontSize: "12px", 
                                    color: "#dc2626" 
                                  }}></i>
                                  <span style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#dc2626",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px"
                                  }}>
                                    Rejection Reason
                                  </span>
                                </div>
                                <p style={{
                                  margin: "0",
                                  fontSize: "13px",
                                  color: "#991b1b",
                                  fontStyle: "italic",
                                  lineHeight: "1.4"
                                }}>
                                  {c.rejectionReason}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Contact and Actions */}
                          <div style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "space-between",
                            paddingTop: "12px",
                            borderTop: "1px solid #f3f4f6"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <i className="fas fa-phone" style={{ fontSize: "12px", color: "#6b7280" }}></i>
                              <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>{c.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <i className="fas fa-check-circle" style={{ fontSize: "48px", color: "#dadce0", marginBottom: "16px" }}></i>
                  <p style={{ fontSize: "18px", color: "#5f6368", margin: "0" }}>No closed complaints found</p>
                </div>
              )}
            </>
          )}

          {activeTab === "explore" && (
            <>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faMap} style={{ color: '#1a73e8' }} /> 
                Explore Pending Complaints
              </h3>
              <ExploreComplaints token={token} />
            </>
          )}

          {activeTab === "community" && (
            <CommunityComplaints token={token} />
          )}

          {activeTab === "janawaaz" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                <i className="fas fa-trophy" style={{ fontSize: "24px", color: "#f57f17", marginRight: "12px" }}></i>
                <h3 style={{ margin: "0", fontSize: "28px", fontWeight: "500", color: "#202124" }}>Janawaaz - Public Recognition</h3>
              </div>
              <div style={{ 
                backgroundColor: "white", 
                borderRadius: "8px", 
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e8eaed",
                height: "calc(100vh - 200px)",
                overflow: "hidden"
              }}>
                <Janawaaz token={token} />
              </div>
            </>
          )}

          {activeTab === "rewards" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                <i className="fas fa-gift" style={{ fontSize: "24px", color: "#f57f17", marginRight: "12px" }}></i>
                <h3 style={{ margin: "0", fontSize: "28px", fontWeight: "500", color: "#202124" }}>Rewards Center</h3>
              </div>
              <div style={{ 
                backgroundColor: "white", 
                borderRadius: "8px", 
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e8eaed",
                height: "calc(100vh - 200px)",
                overflow: "auto"
              }}>
                <Rewards />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal for Complaint Details */}
      {selectedComplaint && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: window.innerWidth <= 768 ? "flex-start" : "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: window.innerWidth <= 768 ? "10px" : "20px",
            paddingTop: window.innerWidth <= 768 ? "20px" : "20px"
          }}
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: window.innerWidth <= 768 ? "12px" : "16px",
              padding: window.innerWidth <= 768 ? "20px" : "32px",
              maxWidth: window.innerWidth <= 768 ? "100%" : "600px",
              width: "100%",
              maxHeight: window.innerWidth <= 768 ? "95vh" : "90vh",
              overflow: "auto",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              transform: selectedComplaint ? "scale(1)" : "scale(0.9)",
              transition: "all 0.3s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  backgroundColor: selectedComplaint.status === "pending" ? "#fff3cd" : 
                                   selectedComplaint.status === "in_progress" ? "#cce5ff" :
                                   selectedComplaint.status === "resolved" ? "#d4edda" :
                                   selectedComplaint.status === "rejected" ? "#f8d7da" :
                                   selectedComplaint.status === "rejected_by_user" ? "#f8d7da" :
                                   selectedComplaint.status === "rejected_no_answer" ? "#f8d7da" : "#e2e3e5",
                  color: selectedComplaint.status === "pending" ? "#856404" : 
                         selectedComplaint.status === "in_progress" ? "#004085" :
                         selectedComplaint.status === "resolved" ? "#155724" :
                         selectedComplaint.status === "rejected" ? "#721c24" :
                         selectedComplaint.status === "rejected_by_user" ? "#721c24" :
                         selectedComplaint.status === "rejected_no_answer" ? "#721c24" : "#495057",
                  padding: "6px 16px",
                  borderRadius: "24px",
                  fontSize: "14px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <i className={`fas ${
                    selectedComplaint.status === "pending" ? "fa-clock" : 
                    selectedComplaint.status === "in_progress" ? "fa-sync-alt" : 
                    selectedComplaint.status === "resolved" ? "fa-check-circle" :
                    selectedComplaint.status === "rejected" ? "fa-times-circle" : "fa-question-circle"
                  }`} style={{ 
                    fontSize: "12px",
                    animation: selectedComplaint.status === "in_progress" ? "spin 2s linear infinite" : "none"
                  }}></i>
                  {selectedComplaint.status.replace("_", " ").toUpperCase()}
                </span>
                {selectedComplaint.priority && (
                  <span style={{
                    backgroundColor: selectedComplaint.priority === "High" ? "#f8d7da" : selectedComplaint.priority === "Medium" ? "#fff3cd" : "#d4edda",
                    color: selectedComplaint.priority === "High" ? "#721c24" : selectedComplaint.priority === "Medium" ? "#856404" : "#155724",
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}>
                    {selectedComplaint.priority} Priority
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#5f6368",
                  padding: "8px",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#f1f3f4";
                  e.target.style.color = "#202124";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#5f6368";
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Image */}
            {selectedComplaint.imageUrl && (
              <div style={{ marginBottom: "24px" }}>
                <img 
                  src={selectedComplaint.imageUrl} 
                  alt="Complaint" 
                  style={{ 
                    width: "100%", 
                    height: "300px", 
                    objectFit: "cover", 
                    borderRadius: "12px",
                    border: "1px solid #e8eaed"
                  }}
                />
              </div>
            )}

            {/* Description */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "500", color: "#202124" }}>
                Description
              </h3>
              <p style={{ 
                margin: "0", 
                fontSize: "16px", 
                lineHeight: "1.6", 
                color: "#5f6368",
                padding: "16px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e8eaed"
              }}>
                {selectedComplaint.description}
              </p>
            </div>

            {/* Rejection Reason Section - Only show for rejected complaints */}
            {selectedComplaint.status === "rejected" && selectedComplaint.rejectionReason && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "500", color: "#d32f2f" }}>
                  <i className="fas fa-times-circle" style={{ marginRight: "8px", color: "#d32f2f" }}></i>
                  Rejection Reason
                </h3>
                <p style={{ 
                  margin: "0", 
                  fontSize: "15px", 
                  lineHeight: "1.5", 
                  color: "#721c24",
                  padding: "12px",
                  backgroundColor: "#f8d7da",
                  borderRadius: "8px",
                  border: "1px solid #f5c6cb"
                }}>
                  {selectedComplaint.rejectionReason}
                </p>
              </div>
            )}

            {/* Reason Section - Only show for pending complaints */}
            {selectedComplaint.reason && selectedComplaint.status === "pending" && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "500", color: "#202124" }}>
                  Reason
                </h3>
                <p style={{ 
                  margin: "0", 
                  fontSize: "15px", 
                  lineHeight: "1.5", 
                  color: "#5f6368",
                  padding: "12px",
                  backgroundColor: "#fff3cd",
                  borderRadius: "8px",
                  border: "1px solid #ffeaa7"
                }}>
                  {selectedComplaint.reason}
                </p>
              </div>
            )}

            {/* Audio Section */}
            {(selectedComplaint.audio || selectedComplaint.audioUrl) && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "500", color: "#202124" }}>
                  <i className="fas fa-volume-up" style={{ marginRight: "8px", color: "#1a73e8" }}></i>
                  Voice Message
                </h3>
                <div style={{ 
                  padding: "16px",
                  backgroundColor: "#fef7e0",
                  borderRadius: "8px",
                  border: "1px solid #f9c74f"
                }}>
                  <div style={{ marginBottom: "8px", fontSize: "12px", color: "#856404" }}>
                    <strong>Audio file:</strong> {selectedComplaint.audioUrl || selectedComplaint.audio || 'No audio path found'}
                  </div>
                  <audio 
                    controls 
                    style={{ width: "100%" }} 
                    preload="metadata"
                    onError={(e) => {
                      console.error('Audio load error:', e);
                      console.error('Audio source:', selectedComplaint.audioUrl || selectedComplaint.audio);
                    }}
                    onLoadStart={() => console.log('Audio loading started')}
                    onCanPlay={() => console.log('Audio can play')}
                    onLoadedData={() => console.log('Audio data loaded')}
                  >
                    <source src={selectedComplaint.audioUrl || selectedComplaint.audio} type="audio/mpeg" />
                    <source src={selectedComplaint.audioUrl || selectedComplaint.audio} type="audio/wav" />
                    <source src={selectedComplaint.audioUrl || selectedComplaint.audio} type="audio/ogg" />
                    <source src={selectedComplaint.audioUrl || selectedComplaint.audio} type="audio/webm" />
                    <source src={selectedComplaint.audioUrl || selectedComplaint.audio} type="audio/mp4" />
                    <div style={{ margin: "8px 0 0 0" }}>
                      <p style={{ margin: "0 0 8px 0", color: "#bf360c", fontStyle: "italic" }}>
                        Your browser cannot play this audio file. 
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <a 
                          href={selectedComplaint.audioUrl || selectedComplaint.audio} 
                          download 
                          style={{ color: "#1a73e8", textDecoration: "underline" }}
                        >
                          Download Audio File
                        </a>
                        <button
                          onClick={() => {
                            const audioUrl = selectedComplaint.audioUrl || selectedComplaint.audio;
                            console.log('Testing audio URL:', audioUrl);
                            fetch(audioUrl)
                              .then(response => {
                                console.log('Audio file response:', response.status, response.statusText);
                                console.log('Response headers:', response.headers);
                                return response.blob();
                              })
                              .then(blob => {
                                console.log('Audio blob:', blob.type, blob.size);
                              })
                              .catch(error => {
                                console.error('Audio fetch error:', error);
                              });
                          }}
                          style={{
                            backgroundColor: "#1a73e8",
                            color: "white",
                            border: "none",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          Test Audio URL
                        </button>
                      </div>
                    </div>
                  </audio>
                </div>
              </div>
            )}

            {/* Contact & Basic Info */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
              gap: "16px",
              marginBottom: "24px"
            }}>
              {/* Always show phone since it's required */}
              {selectedComplaint.phone && (
                <div style={{ 
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e8eaed"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <i className="fas fa-phone" style={{ fontSize: "16px", color: "#1a73e8" }}></i>
                    <span style={{ fontSize: "14px", color: "#5f6368", fontWeight: "500" }}>Contact Number</span>
                  </div>
                  <p style={{ margin: "0", fontSize: "16px", color: "#202124", fontWeight: "500" }}>
                    {selectedComplaint.phone}
                  </p>
                </div>
              )}

              {/* Show priority only if it exists */}
              {selectedComplaint.priority && (
                <div style={{ 
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e8eaed"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <i className="fas fa-flag" style={{ fontSize: "16px", color: "#1a73e8" }}></i>
                    <span style={{ fontSize: "14px", color: "#5f6368", fontWeight: "500" }}>Priority Level</span>
                  </div>
                  <span style={{
                    backgroundColor: selectedComplaint.priority === "High" ? "#f8d7da" : selectedComplaint.priority === "Medium" ? "#fff3cd" : "#d4edda",
                    color: selectedComplaint.priority === "High" ? "#721c24" : selectedComplaint.priority === "Medium" ? "#856404" : "#155724",
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}>
                    {selectedComplaint.priority}
                  </span>
                </div>
              )}

              {/* Show status if it exists */}
              {selectedComplaint.status && (
                <div style={{ 
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e8eaed"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <i className="fas fa-info-circle" style={{ fontSize: "16px", color: "#1a73e8" }}></i>
                    <span style={{ fontSize: "14px", color: "#5f6368", fontWeight: "500" }}>Status</span>
                  </div>
                  <span style={{
                    backgroundColor: selectedComplaint.status === "Resolved" ? "#d4edda" : selectedComplaint.status === "In Progress" ? "#fff3cd" : "#f8d7da",
                    color: selectedComplaint.status === "Resolved" ? "#155724" : selectedComplaint.status === "In Progress" ? "#856404" : "#721c24",
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}>
                    {selectedComplaint.status}
                  </span>
                </div>
              )}

              {/* Show reason/category if it exists - Only for pending complaints */}
              {selectedComplaint.reason && selectedComplaint.status === "pending" && (
                <div style={{ 
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e8eaed"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <i className="fas fa-tag" style={{ fontSize: "16px", color: "#1a73e8" }}></i>
                    <span style={{ fontSize: "14px", color: "#5f6368", fontWeight: "500" }}>Category</span>
                  </div>
                  <p style={{ margin: "0", fontSize: "16px", color: "#202124", fontWeight: "500" }}>
                    {selectedComplaint.reason}
                  </p>
                </div>
              )}

              {/* Always show creation date */}
              {selectedComplaint.createdAt && (
                <div style={{ 
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e8eaed"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <i className="fas fa-calendar" style={{ fontSize: "16px", color: "#1a73e8" }}></i>
                    <span style={{ fontSize: "14px", color: "#5f6368", fontWeight: "500" }}>Date Submitted</span>
                  </div>
                  <p style={{ margin: "0", fontSize: "16px", color: "#202124", fontWeight: "500" }}>
                    {new Date(selectedComplaint.createdAt).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {/* Always show creation time */}
              {selectedComplaint.createdAt && (
                <div style={{ 
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e8eaed"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <i className="fas fa-clock" style={{ fontSize: "16px", color: "#1a73e8" }}></i>
                    <span style={{ fontSize: "14px", color: "#5f6368", fontWeight: "500" }}>Time Submitted</span>
                  </div>
                  <p style={{ margin: "0", fontSize: "16px", color: "#202124", fontWeight: "500" }}>
                    {new Date(selectedComplaint.createdAt).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Location Information */}
            {selectedComplaint.location && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "500", color: "#202124" }}>
                  Location Details
                </h3>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
                  gap: "16px"
                }}>
                  {selectedComplaint.location.address && (
                    <div style={{ 
                      padding: "16px",
                      backgroundColor: "#e8f5e9",
                      borderRadius: "8px",
                      border: "1px solid #c8e6c9"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <i className="fas fa-map-marker-alt" style={{ fontSize: "16px", color: "#2e7d32" }}></i>
                        <span style={{ fontSize: "14px", color: "#2e7d32", fontWeight: "500" }}>Address</span>
                      </div>
                      <p style={{ margin: "0", fontSize: "15px", color: "#1b5e20", lineHeight: "1.4" }}>
                        {selectedComplaint.location.address}
                      </p>
                    </div>
                  )}

                  {selectedComplaint.location.city && (
                    <div style={{ 
                      padding: "16px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "8px",
                      border: "1px solid #bbdefb"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <i className="fas fa-city" style={{ fontSize: "16px", color: "#1565c0" }}></i>
                        <span style={{ fontSize: "14px", color: "#1565c0", fontWeight: "500" }}>City</span>
                      </div>
                      <p style={{ margin: "0", fontSize: "16px", color: "#0d47a1", fontWeight: "500" }}>
                        {selectedComplaint.location.city}
                      </p>
                    </div>
                  )}

                  {selectedComplaint.location.state && (
                    <div style={{ 
                      padding: "16px",
                      backgroundColor: "#fce4ec",
                      borderRadius: "8px",
                      border: "1px solid #f8bbd9"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <i className="fas fa-map" style={{ fontSize: "16px", color: "#c2185b" }}></i>
                        <span style={{ fontSize: "14px", color: "#c2185b", fontWeight: "500" }}>State</span>
                      </div>
                      <p style={{ margin: "0", fontSize: "16px", color: "#880e4f", fontWeight: "500" }}>
                        {selectedComplaint.location.state}
                      </p>
                    </div>
                  )}

                  {(selectedComplaint.location.lat && selectedComplaint.location.lng) && (
                    <div style={{ 
                      padding: "16px",
                      backgroundColor: "#fff3e0",
                      borderRadius: "8px",
                      border: "1px solid #ffcc02"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <i className="fas fa-crosshairs" style={{ fontSize: "16px", color: "#ef6c00" }}></i>
                        <span style={{ fontSize: "14px", color: "#ef6c00", fontWeight: "500" }}>Coordinates</span>
                      </div>
                      <p style={{ margin: "0", fontSize: "14px", color: "#e65100", fontWeight: "500" }}>
                        Lat: {selectedComplaint.location.lat?.toFixed(6)}<br/>
                        Lng: {selectedComplaint.location.lng?.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Administrative Info */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "500", color: "#202124" }}>
                Administrative Details
              </h3>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
                gap: "16px"
              }}>
                {/* Always show complaint ID */}
                {selectedComplaint._id && (
                  <div style={{ 
                    padding: "16px",
                    backgroundColor: "#f3e5f5",
                    borderRadius: "8px",
                    border: "1px solid #e1bee7"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <i className="fas fa-id-card" style={{ fontSize: "16px", color: "#7b1fa2" }}></i>
                      <span style={{ fontSize: "14px", color: "#7b1fa2", fontWeight: "500" }}>Complaint ID</span>
                    </div>
                    <p style={{ margin: "0", fontSize: "14px", color: "#4a148c", fontFamily: "monospace" }}>
                      {selectedComplaint._id}
                    </p>
                  </div>
                )}

                {/* Show assigned admin only if exists */}
                {selectedComplaint.assignedAdmin && (
                  <div style={{ 
                    padding: "16px",
                    backgroundColor: "#e8f5e9",
                    borderRadius: "8px",
                    border: "1px solid #c8e6c9"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <i className="fas fa-user-tie" style={{ fontSize: "16px", color: "#2e7d32" }}></i>
                      <span style={{ fontSize: "14px", color: "#2e7d32", fontWeight: "500" }}>Assigned Admin</span>
                    </div>
                    <p style={{ margin: "0", fontSize: "16px", color: "#1b5e20", fontWeight: "500" }}>
                      {selectedComplaint.assignedAdmin}
                    </p>
                  </div>
                )}

                {/* Show update time only if it exists and is different from creation time */}
                {selectedComplaint.updatedAt && selectedComplaint.updatedAt !== selectedComplaint.createdAt && (
                  <div style={{ 
                    padding: "16px",
                    backgroundColor: "#e0f2f1",
                    borderRadius: "8px",
                    border: "1px solid #b2dfdb"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <i className="fas fa-edit" style={{ fontSize: "16px", color: "#00695c" }}></i>
                      <span style={{ fontSize: "14px", color: "#00695c", fontWeight: "500" }}>Last Updated</span>
                    </div>
                    <p style={{ margin: "0", fontSize: "15px", color: "#004d40", fontWeight: "500" }}>
                      {new Date(selectedComplaint.updatedAt).toLocaleDateString('en-US', { 
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      {!showComplaintForm && (
        <button
          onClick={() => setShowComplaintForm(true)}
          style={{
            position: "fixed",
            bottom: window.innerWidth <= 768 ? "20px" : "30px",
            right: window.innerWidth <= 768 ? "20px" : "30px",
            width: window.innerWidth <= 768 ? "56px" : "60px",
            height: window.innerWidth <= 768 ? "56px" : "60px",
            borderRadius: "50%",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            fontSize: window.innerWidth <= 768 ? "20px" : "24px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(52, 152, 219, 0.4)",
            transition: "all 0.3s ease",
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#2980b9";
            e.target.style.transform = "scale(1.1)";
            e.target.style.boxShadow = "0 6px 16px rgba(52, 152, 219, 0.6)";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#3498db";
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0 4px 12px rgba(52, 152, 219, 0.4)";
          }}
        >
          +
        </button>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: window.innerWidth <= 768 ? "flex-start" : "center",
          justifyContent: "center",
          zIndex: 2000,
          backdropFilter: "blur(4px)",
          padding: window.innerWidth <= 768 ? "10px" : "20px",
          paddingTop: window.innerWidth <= 768 ? "50px" : "20px"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: window.innerWidth <= 768 ? "8px" : "12px",
            padding: window.innerWidth <= 768 ? "20px" : "32px",
            maxWidth: window.innerWidth <= 768 ? "100%" : "500px",
            width: window.innerWidth <= 768 ? "100%" : "90%",
            maxHeight: window.innerWidth <= 768 ? "95vh" : "90vh",
            overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#202124" }}>
                <i className="fas fa-key" style={{ marginRight: "12px", color: "#1a73e8" }}></i>
                Change Password
              </h2>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#5f6368",
                  padding: "8px",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ×
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

              // Handle password change
              fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/user/change-password`, {
                method: "PUT",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  currentPassword,
                  newPassword
                })
              })
              .then(res => res.json())
              .then(data => {
                if (data.error) {
                  alert(data.error);
                } else {
                  alert('Password changed successfully!');
                  setShowChangePasswordModal(false);
                }
              })
              .catch(error => {
                console.error('Error changing password:', error);
                alert('Failed to change password. Please try again.');
              });
            }}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #dadce0",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  minLength="6"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #dadce0",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength="6"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #dadce0",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#f8f9fa",
                    color: "#202124",
                    border: "1px solid #dadce0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#1a73e8",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {showEditDetailsModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: window.innerWidth <= 768 ? "flex-start" : "center",
          justifyContent: "center",
          zIndex: 2000,
          backdropFilter: "blur(4px)",
          padding: window.innerWidth <= 768 ? "10px" : "20px",
          paddingTop: window.innerWidth <= 768 ? "30px" : "20px"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: window.innerWidth <= 768 ? "8px" : "12px",
            padding: window.innerWidth <= 768 ? "20px" : "32px",
            maxWidth: window.innerWidth <= 768 ? "100%" : "600px",
            width: window.innerWidth <= 768 ? "100%" : "90%",
            maxHeight: window.innerWidth <= 768 ? "95vh" : "90vh",
            overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#202124" }}>
                <i className="fas fa-edit" style={{ marginRight: "12px", color: "#1a73e8" }}></i>
                Edit Profile Details
              </h2>
              <button
                onClick={() => setShowEditDetailsModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#5f6368",
                  padding: "8px",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ×
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
              
              // Handle profile update
              fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/user/profile`, {
                method: "PUT",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedDetails)
              })
              .then(res => {
                if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
                }
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                  throw new Error('Server returned non-JSON response. Please check if the server is running correctly.');
                }
                return res.json();
              })
              .then(data => {
                if (data.error) {
                  alert(data.error);
                } else {
                  alert('Profile updated successfully!');
                  setUserDetails({...userDetails, ...updatedDetails});
                  setShowEditDetailsModal(false);
                }
              })
              .catch(error => {
                console.error('Error updating profile:', error);
                if (error.message.includes('non-JSON response')) {
                  alert('Server error: The server is not responding correctly. Please check if the backend is running.');
                } else {
                  alert('Failed to update profile. Please try again.');
                }
              });
            }}>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: window.innerWidth <= 768 ? "1fr" : "1fr 1fr", 
                gap: window.innerWidth <= 768 ? "16px" : "20px", 
                marginBottom: "20px" 
              }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={userDetails.name || ''}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "1px solid #dadce0",
                      borderRadius: "8px",
                      fontSize: "16px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={userDetails.email || ''}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "1px solid #dadce0",
                      borderRadius: "8px",
                      fontSize: "16px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: window.innerWidth <= 768 ? "1fr" : "1fr 1fr", 
                gap: window.innerWidth <= 768 ? "16px" : "20px", 
                marginBottom: "20px" 
              }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={userDetails.city || ''}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "1px solid #dadce0",
                      borderRadius: "8px",
                      fontSize: "16px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    defaultValue={userDetails.state || ''}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "1px solid #dadce0",
                      borderRadius: "8px",
                      fontSize: "16px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={userDetails.phone || ''}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #dadce0",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowEditDetailsModal(false)}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#f8f9fa",
                    color: "#202124",
                    border: "1px solid #dadce0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#1a73e8",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Form Modal */}
      {showComplaintForm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(5px)",
          display: "flex",
          alignItems: window.innerWidth <= 768 ? "flex-start" : "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: window.innerWidth <= 768 ? "10px" : "20px",
          paddingTop: window.innerWidth <= 768 ? "10px" : "20px"
        }}
        onClick={() => setShowComplaintForm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: window.innerWidth <= 768 ? "12px" : "16px",
              padding: "0",
              maxWidth: window.innerWidth <= 768 ? "100%" : "900px",
              width: "100%",
              maxHeight: window.innerWidth <= 768 ? "98vh" : "90vh",
              overflow: "auto",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              transform: showComplaintForm ? "scale(1)" : "scale(0.9)",
              transition: "all 0.3s ease",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowComplaintForm(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #e8eaed",
                fontSize: "20px",
                cursor: "pointer",
                color: "#5f6368",
                padding: "8px",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                zIndex: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f1f3f4";
                e.target.style.color = "#202124";
                e.target.style.transform = "scale(1.1)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
                e.target.style.color = "#5f6368";
                e.target.style.transform = "scale(1)";
              }}
            >
              <i className="fas fa-times"></i>
            </button>

            {/* Modal Content */}
            <div style={{ padding: "0" }}>
              <ComplaintForm 
                token={token} 
                setComplaints={setComplaints} 
                onClose={() => setShowComplaintForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      
    </div>
    </>
  );
}

export default Dashboard;
