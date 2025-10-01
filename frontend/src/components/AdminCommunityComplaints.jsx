import React, { useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faMapMarkerAlt, 
  faUsers, 
  faFilter, 
  faSpinner, 
  faExclamationTriangle,
  faThumbsUp,
  faThumbsDown,
  faComment,
  faTimes,
  faEye,
  faUserShield
} from "@fortawesome/free-solid-svg-icons";
import CommunityFilterControls from "./CommunityFilterControls";
import { useCommunityFilters } from "./useCommunityFilters";
import { getComplaintDistance } from "../utils/geolocation";

function AdminCommunityComplaints({ token }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [stats, setStats] = useState(null);
  const [userCity, setUserCity] = useState("");
  const [userState, setUserState] = useState("");

  // Initialize community filters
  const {
    sortBy,
    setSortBy,
    voteFilter,
    setVoteFilter,
    locationFilter,
    setLocationFilter,
    userLocation,
    handleLocationUpdate,
    getFilteredAndSortedComplaints,
    resetFilters,
    hasActiveFilters,
  } = useCommunityFilters(complaints);

  const fetchCommunityComplaints = useCallback(async (filterParams = {}) => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      console.log('[ADMIN-COMMUNITY-DEBUG] Fetching community complaints for admin...');
      
      // Build query string from filter parameters
      const queryParams = new URLSearchParams();
      if (filterParams.sortBy && filterParams.sortBy !== "latest") {
        queryParams.append("sortBy", filterParams.sortBy);
      }
      if (filterParams.voteFilter && filterParams.voteFilter !== "all") {
        queryParams.append("voteFilter", filterParams.voteFilter);
      }
      if (filterParams.locationFilter && filterParams.locationFilter !== "all") {
        queryParams.append("locationFilter", filterParams.locationFilter);
      }
      
      // Use the same community endpoint as regular users - admin will see same posts based on location
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/community${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      
      console.log('[ADMIN-COMMUNITY-DEBUG] Request URL:', url);
      
      const response = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`
        },
      });

      const data = await response.json();
      console.log('[ADMIN-COMMUNITY-DEBUG] Response:', data);

      if (response.ok) {
        const processedComplaints = data.complaints || [];
        setComplaints(processedComplaints);
        setUserCity(data.userCity || "");
        setUserState(data.userState || "");
        setStats(data.stats || null);
        setError(null);
        
        console.log('[ADMIN-COMMUNITY-DEBUG] Success! City:', data.userCity, 'Complaints:', processedComplaints.length);
        console.log('[ADMIN-COMMUNITY-DEBUG] First complaint sample:', processedComplaints[0]);
        
        // Debug statistics calculation
        if (processedComplaints.length > 0) {
          const sample = processedComplaints[0];
          console.log('[ADMIN-COMMUNITY-DEBUG] Sample complaint structure:', {
            id: sample._id,
            upvoteCount: sample.upvoteCount,
            upvotes: sample.upvotes,
            downvoteCount: sample.downvoteCount,
            comments: sample.comments,
            commentsLength: sample.comments?.length
          });
        }
        
        const highlyVoted = processedComplaints.filter(c => (c.upvoteCount || 0) >= 2);
        const activeDiscussions = processedComplaints.filter(c => (c.comments?.length || 0) >= 1);
        console.log('[ADMIN-COMMUNITY-DEBUG] Highly voted complaints (>=2):', highlyVoted.length);
        console.log('[ADMIN-COMMUNITY-DEBUG] Active discussions (>=1):', activeDiscussions.length);
      } else {
        setError(data.error || "Failed to load community complaints");
        setComplaints([]);
        console.error('[ADMIN-COMMUNITY-DEBUG] API Error:', data.error);
      }
    } catch (error) {
      console.error("[ADMIN-COMMUNITY-DEBUG] Error fetching admin community complaints:", error);
      setError("Failed to load community complaints");
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCommunityComplaints();
  }, [fetchCommunityComplaints]);

  // Refetch data when filters change
  useEffect(() => {
    if (token) {
      fetchCommunityComplaints({
        sortBy,
        voteFilter,
        locationFilter
      });
    }
  }, [sortBy, voteFilter, locationFilter, token, fetchCommunityComplaints]);

  const handleVote = async (complaintId, voteType) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/${complaintId}/${voteType}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Update the complaint in the list
        setComplaints(prev =>
          prev.map(complaint =>
            complaint._id === complaintId
              ? {
                  ...complaint,
                  upvoteCount: data.upvoteCount,
                  downvoteCount: data.downvoteCount,
                  hasUserUpvoted: data.hasUserUpvoted,
                  hasUserDownvoted: data.hasUserDownvoted,
                }
              : complaint
          )
        );

        // Update selected complaint if it's the same
        if (selectedComplaint && selectedComplaint._id === complaintId) {
          setSelectedComplaint(prev => ({
            ...prev,
            upvoteCount: data.upvoteCount,
            downvoteCount: data.downvoteCount,
            hasUserUpvoted: data.hasUserUpvoted,
            hasUserDownvoted: data.hasUserDownvoted,
          }));
        }
      }
    } catch (error) {
      console.error(`Error ${voteType}ing complaint:`, error);
    }
  };

  const handleAddComment = async (complaintId) => {
    if (!commentText.trim()) return;

    try {
      setAddingComment(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/${complaintId}/comment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: commentText.trim() }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Update the complaint in the list
        setComplaints(prev =>
          prev.map(complaint =>
            complaint._id === complaintId
              ? {
                  ...complaint,
                  comments: [...complaint.comments, data.comment],
                }
              : complaint
          )
        );

        // Update selected complaint if it's the same
        if (selectedComplaint && selectedComplaint._id === complaintId) {
          setSelectedComplaint(prev => ({
            ...prev,
            comments: [...prev.comments, data.comment],
          }));
        }

        setCommentText("");
      } else {
        alert(data.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: "32px", color: "#3498db", marginBottom: "16px" }} />
        <p style={{ color: "#5f6368", fontSize: "16px" }}>Loading community complaints...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: "32px", color: "#ea4335", marginBottom: "16px" }} />
        <p style={{ color: "#ea4335", fontSize: "16px", marginBottom: "16px" }}>{error}</p>
        <button
          onClick={() => fetchCommunityComplaints({ sortBy, voteFilter, locationFilter })}
          style={{
            padding: "12px 24px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Use client-side filtering as backup
  const filteredComplaints = getFilteredAndSortedComplaints;

  return (
    <>
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: "24px", color: "#3498db", marginRight: "12px" }} />
          <h3 style={{ margin: "0", fontSize: "28px", fontWeight: "500", color: "#202124" }}>
            Community Complaints Dashboard
          </h3>
        </div>
        <p style={{ color: "#5f6368", fontSize: "16px", margin: "0" }}>
          Admin view of community complaints in {userCity || 'your assigned city'}{userState ? `, ${userState}` : ''}
        </p>
        {stats && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            marginTop: "16px",
            flexWrap: "wrap"
          }}>
            <div style={{
              backgroundColor: "#f8f9fa",
              padding: "12px 20px",
              borderRadius: "8px",
              border: "1px solid #e9ecef"
            }}>
              <strong>Total: {stats.total || complaints.length}</strong>
            </div>
            <div style={{
              backgroundColor: "#e8f5e8",
              padding: "12px 20px",
              borderRadius: "8px",
              border: "1px solid #c3e6c3"
            }}>
              <strong>Highly Voted: {complaints.filter(c => (c.upvoteCount || 0) >= 2).length}</strong>
            </div>
            <div style={{
              backgroundColor: "#fff3cd",
              padding: "12px 20px",
              borderRadius: "8px",
              border: "1px solid #ffeaa7"
            }}>
              <strong>Active Discussions: {complaints.filter(c => (c.comments?.length || 0) >= 1).length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      {complaints.length > 0 && (
        <CommunityFilterControls
          sortBy={sortBy}
          setSortBy={setSortBy}
          voteFilter={voteFilter}
          setVoteFilter={setVoteFilter}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          onLocationUpdate={handleLocationUpdate}
          filteredCount={filteredComplaints.length}
          totalCount={complaints.length}
          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}
        />
      )}

      {filteredComplaints.length > 0 ? (
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px"
        }}>
          {filteredComplaints.map((complaint, index) => (
            <div
              key={complaint._id}
              style={{
                backgroundColor: "white",
                marginBottom: "12px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e0e0e0",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onClick={() => setSelectedComplaint(complaint)}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            >
              {/* Compact Content */}
              <div style={{ padding: "16px" }}>
                <div style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start"
                }}>
                  {/* Image - smaller and left side */}
                  {complaint.imageUrl && (
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={complaint.imageUrl}
                        alt="Complaint"
                        style={{
                          width: "120px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid #e0e0e0"
                        }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header with badges and date */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{
                          backgroundColor: "#f1f3f4",
                          color: "#5f6368",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "600"
                        }}>
                          #{index + 1}
                        </span>
                        <span style={{
                          backgroundColor: complaint.status === "pending" ? "#fff3cd" : 
                                         complaint.status === "in_progress" ? "#d4edda" : "#d1ecf1",
                          color: complaint.status === "pending" ? "#856404" : 
                               complaint.status === "in_progress" ? "#155724" : "#0c5460",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "600",
                          textTransform: "uppercase"
                        }}>
                          {complaint.status === "in_progress" ? "🔄 IN PROGRESS" : 
                           complaint.status === "pending" ? "⏳ PENDING" : 
                           complaint.status}
                        </span>
                        {/* Admin badge */}
                        <span style={{
                          backgroundColor: "#e8f0fe",
                          color: "#3498db",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          fontSize: "10px",
                          fontWeight: "500"
                        }}>
                          <FontAwesomeIcon icon={faUserShield} /> ADMIN VIEW
                        </span>
                        {/* Show voting badges for highly voted complaints */}
                        {(complaint.upvoteCount || 0) >= 2 && (
                          <span style={{
                            backgroundColor: "#e8f5e8",
                            color: "#34a853",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontSize: "10px",
                            fontWeight: "500"
                          }}>
                            🔥 Popular
                          </span>
                        )}
                        {(complaint.comments?.length || 0) >= 1 && (
                          <span style={{
                            backgroundColor: "#fff8e1",
                            color: "#f57f17",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontSize: "10px",
                            fontWeight: "500"
                          }}>
                            💬 Active Discussion
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "12px", color: "#5f6368", flexShrink: 0 }}>
                        {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Description */}
                    <h3 style={{
                      margin: "0 0 6px 0",
                      fontSize: "15px",
                      fontWeight: "500",
                      color: "#202124",
                      display: "-webkit-box",
                      WebkitLineClamp: "2",
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {complaint.description}
                    </h3>

                    {/* Location */}
                    <p style={{
                      margin: "0 0 8px 0",
                      fontSize: "13px",
                      color: "#5f6368",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: "#ea4335", fontSize: "12px" }} />
                      <span style={{
                        display: "-webkit-box",
                        WebkitLineClamp: "1",
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {complaint.location?.detailedAddress || complaint.location?.address || 
                         `${complaint.location?.city}, ${complaint.location?.state}`}
                      </span>
                      {/* Show distance if nearby filtering is active and we have user location */}
                      {locationFilter === 'nearby' && userLocation && (() => {
                        const distance = getComplaintDistance(userLocation, complaint);
                        return distance ? (
                          <span style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            padding: "2px 6px",
                            borderRadius: "8px",
                            fontSize: "10px",
                            fontWeight: "600",
                            marginLeft: "4px"
                          }}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} /> {distance}
                          </span>
                        ) : null;
                      })()}
                    </p>

                    {/* Posted by and Actions */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <p style={{
                        margin: "0",
                        fontSize: "12px",
                        color: "#5f6368",
                        fontStyle: "italic"
                      }}>
                        by: <strong>{complaint.userId?.name || "Anonymous"}</strong>
                        {complaint.userId?.phone && (
                          <span style={{ marginLeft: "8px", fontSize: "11px" }}>
                            ({complaint.userId.phone})
                          </span>
                        )}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(complaint._id, "upvote");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            backgroundColor: complaint.hasUserUpvoted ? "#34a853" : "transparent",
                            color: complaint.hasUserUpvoted ? "white" : "#34a853",
                            border: "1px solid #34a853",
                            borderRadius: "14px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}
                        >
                          <FontAwesomeIcon icon={faThumbsUp} style={{ fontSize: "11px" }} />
                          <span>{complaint.upvoteCount || 0}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(complaint._id, "downvote");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            backgroundColor: complaint.hasUserDownvoted ? "#ea4335" : "transparent",
                            color: complaint.hasUserDownvoted ? "white" : "#ea4335",
                            border: "1px solid #ea4335",
                            borderRadius: "14px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}
                        >
                          <FontAwesomeIcon icon={faThumbsDown} style={{ fontSize: "11px" }} />
                          <span>{complaint.downvoteCount || 0}</span>
                        </button>

                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#5f6368"
                        }}>
                          <FontAwesomeIcon icon={faComment} style={{ fontSize: "12px" }} />
                          <span style={{ fontSize: "12px" }}>
                            {complaint.comments?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : complaints.length > 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <FontAwesomeIcon icon={faFilter} style={{ fontSize: "48px", color: "#dadce0", marginBottom: "16px" }} />
          <h3 style={{ color: "#5f6368", margin: "0 0 8px 0", fontSize: "18px" }}>No Results Found</h3>
          <p style={{ color: "#5f6368", margin: "0 0 16px 0", fontSize: "14px" }}>
            No complaints match your current filter criteria. Try adjusting the filters to see more results.
          </p>
          <button
            onClick={resetFilters}
            style={{
              padding: "12px 24px",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: "48px", color: "#dadce0", marginBottom: "16px" }} />
          <h3 style={{ color: "#5f6368", margin: "0 0 8px 0", fontSize: "18px" }}>No Community Complaints</h3>
          <p style={{ color: "#5f6368", margin: "0", fontSize: "14px" }}>
            {userCity
              ? `No community complaints found in ${userCity}${userState ? `, ${userState}` : ''}.`
              : "No community complaints found in your assigned area."
            }
          </p>
        </div>
      )}

      {/* Modal for Complaint Details - Enhanced for Admin */}
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
              maxWidth: window.innerWidth <= 768 ? "100%" : "750px",
              width: "100%",
              maxHeight: window.innerWidth <= 768 ? "95vh" : "90vh",
              overflow: "auto",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Admin Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  backgroundColor: selectedComplaint.status === "pending" ? "#fff3cd" : 
                                 selectedComplaint.status === "in_progress" ? "#d4edda" : "#d1ecf1",
                  color: selectedComplaint.status === "pending" ? "#856404" : 
                       selectedComplaint.status === "in_progress" ? "#155724" : "#0c5460",
                  padding: "6px 16px",
                  borderRadius: "24px",
                  fontSize: "14px",
                  fontWeight: "600",
                  textTransform: "uppercase"
                }}>
                  {selectedComplaint.status === "in_progress" ? "🔄 IN PROGRESS" : 
                   selectedComplaint.status === "pending" ? "⏳ PENDING" : 
                   selectedComplaint.status}
                </span>
                <span style={{
                  backgroundColor: "#e8f0fe",
                  color: "#3498db",
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  <FontAwesomeIcon icon={faUserShield} /> ADMIN VIEW
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                    justifyContent: "center"
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>

            {/* Rest of modal content - same as regular community complaints but with admin context */}
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
              <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "500", color: "#202124" }}>
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

            {/* Admin Info Section */}
            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "500", color: "#202124" }}>
                Admin Information
              </h4>
              <div style={{
                padding: "16px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e8eaed"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span><strong>User:</strong> {selectedComplaint.userId?.name || "Anonymous"}</span>
                  <span><strong>Phone:</strong> {selectedComplaint.userId?.phone || "N/A"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span><strong>Email:</strong> {selectedComplaint.userId?.email || "N/A"}</span>
                  <span><strong>ID:</strong> {selectedComplaint._id}</span>
                </div>
                <div>
                  <span><strong>Location:</strong> {selectedComplaint.location?.city}, {selectedComplaint.location?.state}</span>
                </div>
              </div>
            </div>

            {/* Voting Section */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              padding: "16px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              marginBottom: "24px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => handleVote(selectedComplaint._id, "upvote")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    backgroundColor: selectedComplaint.hasUserUpvoted ? "#34a853" : "white",
                    color: selectedComplaint.hasUserUpvoted ? "white" : "#34a853",
                    border: `1px solid #34a853`,
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s ease"
                  }}
                >
                  <FontAwesomeIcon icon={faThumbsUp} />
                  <span>{selectedComplaint.upvoteCount || 0}</span>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => handleVote(selectedComplaint._id, "downvote")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    backgroundColor: selectedComplaint.hasUserDownvoted ? "#ea4335" : "white",
                    color: selectedComplaint.hasUserDownvoted ? "white" : "#ea4335",
                    border: `1px solid #ea4335`,
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s ease"
                  }}
                >
                  <FontAwesomeIcon icon={faThumbsDown} />
                  <span>{selectedComplaint.downvoteCount || 0}</span>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "500", color: "#202124" }}>
                Comments ({selectedComplaint.comments?.length || 0})
              </h3>

              {/* Add Comment */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add an admin comment..."
                    maxLength={500}
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: "1px solid #dadce0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      resize: "vertical",
                      minHeight: "80px",
                      fontFamily: "inherit"
                    }}
                  />
                  <button
                    onClick={() => handleAddComment(selectedComplaint._id)}
                    disabled={!commentText.trim() || addingComment}
                    style={{
                      padding: "12px 20px",
                      backgroundColor: commentText.trim() && !addingComment ? "#3498db" : "#dadce0",
                      color: commentText.trim() && !addingComment ? "white" : "#5f6368",
                      border: "none",
                      borderRadius: "8px",
                      cursor: commentText.trim() && !addingComment ? "pointer" : "not-allowed",
                      fontSize: "14px",
                      fontWeight: "500",
                      minWidth: "80px"
                    }}
                  >
                    {addingComment ? "..." : "Post"}
                  </button>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#5f6368", textAlign: "right" }}>
                  {commentText.length}/500
                </p>
              </div>

              {/* Comments List */}
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {selectedComplaint.comments && selectedComplaint.comments.length > 0 ? (
                  selectedComplaint.comments.map((comment) => (
                    <div
                      key={comment._id}
                      style={{
                        padding: "16px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "8px",
                        marginBottom: "12px",
                        border: "1px solid #e8eaed"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div>
                          <p style={{ margin: "0", fontSize: "14px", fontWeight: "500", color: "#202124" }}>
                            {comment.userId?.name || "Anonymous"}
                            {comment.userId?.email && (
                              <span style={{ fontSize: "12px", color: "#5f6368", marginLeft: "8px" }}>
                                ({comment.userId.email})
                              </span>
                            )}
                          </p>
                          <p style={{ margin: "0", fontSize: "12px", color: "#5f6368" }}>
                            {new Date(comment.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <p style={{ margin: "0", fontSize: "14px", lineHeight: "1.4", color: "#202124" }}>
                        {comment.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <FontAwesomeIcon icon={faComment} style={{ fontSize: "32px", color: "#dadce0", marginBottom: "12px" }} />
                    <p style={{ color: "#5f6368", margin: "0", fontSize: "14px" }}>
                      No comments yet. Be the first to comment!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminCommunityComplaints;