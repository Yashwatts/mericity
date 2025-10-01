import React, { useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import CommunityFilterControls from "./CommunityFilterControls";
import { useCommunityFilters } from "./useCommunityFilters";
import { getComplaintDistance } from "../utils/geolocation";

function CommunityComplaints({ token }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCity, setUserCity] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [_stats, setStats] = useState(null);

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
      
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/community${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setComplaints(data.complaints || []);
        setUserCity(data.userCity || "");
        setStats(data.stats || null);
        setError(null);
      } else {
        setError(data.error || "Failed to load community complaints");
        setComplaints([]);
      }
    } catch (error) {
      console.error("Error fetching community complaints:", error);
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
      <div className="text-center py-12 px-4">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
        <p className="text-gray-600 text-base">Loading community complaints...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
        <p className="text-red-500 text-base mb-4">{error}</p>
        <button
          onClick={() => fetchCommunityComplaints({ sortBy, voteFilter, locationFilter })}
          className="px-6 py-3 bg-blue-600 text-white border-none rounded-lg cursor-pointer 
                     text-sm font-medium hover:bg-blue-700 transition-colors"
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
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center mb-4">
          <i className="fas fa-users text-2xl text-blue-600 mr-3"></i>
          <h3 className="text-2xl lg:text-3xl font-medium text-gray-800 m-0">
            Community Complaints
          </h3>
        </div>
        {userCity && (
          <p className="text-gray-600 text-base m-0">
            Showing complaints from <strong>{userCity}</strong>
          </p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredComplaints.map((complaint, index) => (
            <div
              key={complaint._id}
              className="bg-white mb-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer 
                         transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
              onClick={() => setSelectedComplaint(complaint)}
            >
              {/* Mobile-First Responsive Content */}
              <div className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Image - responsive sizing */}
                  {complaint.imageUrl && (
                    <div className="flex-shrink-0 w-full sm:w-32 md:w-40">
                      <img
                        src={complaint.imageUrl}
                        alt="Complaint"
                        className="w-full h-48 sm:h-20 md:h-24 object-cover rounded-md border border-gray-200"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header with badges and date - responsive layout */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">
                          #{index + 1}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                          complaint.status === "pending" ? "bg-yellow-100 text-yellow-800" : 
                          complaint.status === "in_progress" ? "bg-green-100 text-green-800" : 
                          "bg-blue-100 text-blue-800"
                        }`}>
                          {complaint.status === "in_progress" ? "🔄 IN PROGRESS" : 
                           complaint.status === "pending" ? "⏳ PENDING" : 
                           complaint.status}
                        </span>
                        {complaint.isOwnComplaint && (
                          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                            Your Post
                          </span>
                        )}
                        {/* Show voting badges for highly voted complaints */}
                        {(complaint.upvoteCount || 0) >= 5 && (
                          <span className="bg-green-50 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                            🔥 Popular
                          </span>
                        )}
                        {(complaint.comments?.length || 0) >= 3 && (
                          <span className="bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full text-xs font-medium">
                            💬 Active Discussion
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Description - responsive text sizing */}
                    <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2 line-clamp-2">
                      {complaint.description}
                    </h3>

                    {/* Location - responsive layout */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-1">
                      <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 min-w-0 flex-1">
                        <i className="fas fa-map-marker-alt text-red-500 flex-shrink-0"></i>
                        <span className="truncate">
                          {complaint.location?.detailedAddress || complaint.location?.address || 
                           `${complaint.location?.city}, ${complaint.location?.state}`}
                        </span>
                        {/* Show distance if nearby filtering is active and we have user location */}
                        {locationFilter === 'nearby' && userLocation && (() => {
                          const distance = getComplaintDistance(userLocation, complaint);
                          return distance ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold flex-shrink-0">
                              <FontAwesomeIcon icon={faMapMarkerAlt} /> {distance}
                            </span>
                          ) : null;
                        })()}
                      </p>
                      {complaint.location?.lat && complaint.location?.lng && (
                        <a 
                          href={`https://www.google.com/maps?q=${complaint.location.lat},${complaint.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 text-xs hover:text-blue-700 flex-shrink-0 mt-1 sm:mt-0"
                        >
                          <i className="fas fa-map mr-1"></i>View Map
                        </a>
                      )}
                    </div>

                    {/* Posted by and Actions - responsive layout */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <p className="text-xs text-gray-500 italic">
                        by: <strong>{complaint.userId?.name || "Anonymous"}</strong>
                      </p>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(complaint._id, "upvote");
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium transition-colors ${
                            complaint.hasUserUpvoted 
                              ? "bg-green-500 text-white border-green-500" 
                              : "bg-transparent text-green-600 border-green-500 hover:bg-green-50"
                          }`}
                        >
                          <i className="fas fa-thumbs-up"></i>
                          <span>{complaint.upvoteCount || 0}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(complaint._id, "downvote");
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium transition-colors ${
                            complaint.hasUserDownvoted 
                              ? "bg-red-500 text-white border-red-500" 
                              : "bg-transparent text-red-600 border-red-500 hover:bg-red-50"
                          }`}
                        >
                          <i className="fas fa-thumbs-down"></i>
                          <span>{complaint.downvoteCount || 0}</span>
                        </button>

                        <div className="flex items-center gap-1 text-gray-500">
                          <i className="fas fa-comment text-xs"></i>
                          <span className="text-xs">
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
        <div className="text-center py-16 px-4">
          <i className="fas fa-filter text-5xl text-gray-300 mb-4"></i>
          <h3 className="text-gray-600 text-lg mb-2">No Results Found</h3>
          <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
            No complaints match your current filter criteria. Try adjusting the filters to see more results.
          </p>
          <button
            onClick={resetFilters}
            className="px-6 py-3 bg-blue-600 text-white border-none rounded-lg cursor-pointer 
                       text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="text-center py-16 px-4">
          <i className="fas fa-users text-5xl text-gray-300 mb-4"></i>
          <h3 className="text-gray-600 text-lg mb-2">No Community Complaints</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {userCity
              ? `No complaints found in ${userCity}. Be the first to report an issue!`
              : "Please complete your profile with city information to see community complaints."
            }
          </p>
        </div>
      )}

      {/* Responsive Modal for Complaint Details */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-start sm:items-center 
                     justify-center z-50 p-4 pt-8 sm:pt-4 overflow-y-auto"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - responsive */}
            <div className="flex justify-between items-start p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-2 rounded-full text-sm font-semibold uppercase ${
                  selectedComplaint.status === "pending" ? "bg-yellow-100 text-yellow-800" : 
                  selectedComplaint.status === "in_progress" ? "bg-green-100 text-green-800" : 
                  "bg-blue-100 text-blue-800"
                }`}>
                  {selectedComplaint.status === "in_progress" ? "🔄 IN PROGRESS" : 
                   selectedComplaint.status === "pending" ? "⏳ PENDING" : 
                   selectedComplaint.status}
                </span>
                {selectedComplaint.isOwnComplaint && (
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                    Your Post
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <i className="fas fa-times text-gray-500 text-xl"></i>
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {/* Image - responsive */}
              {selectedComplaint.imageUrl && (
                <div className="mb-6">
                  <img
                    src={selectedComplaint.imageUrl}
                    alt="Complaint"
                    className="w-full h-48 sm:h-64 md:h-72 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Posted by and location - responsive */}
              <div className="mb-6 flex flex-col sm:flex-row sm:justify-between gap-2">
                <p className="text-sm text-gray-600">
                  Posted by: <strong>{selectedComplaint.userId?.name || "Anonymous"}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  {selectedComplaint.location?.city}, {selectedComplaint.location?.state}
                </p>
              </div>

              {/* Voting Section - responsive */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-50 rounded-lg mb-6">
                <button
                  onClick={() => handleVote(selectedComplaint._id, "upvote")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors flex-1 sm:flex-none justify-center ${
                    selectedComplaint.hasUserUpvoted 
                      ? "bg-green-500 text-white" 
                      : "bg-white text-green-600 border border-green-500 hover:bg-green-50"
                  }`}
                >
                  <i className="fas fa-thumbs-up"></i>
                  <span>{selectedComplaint.upvoteCount || 0} Upvotes</span>
                </button>

                <button
                  onClick={() => handleVote(selectedComplaint._id, "downvote")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors flex-1 sm:flex-none justify-center ${
                    selectedComplaint.hasUserDownvoted 
                      ? "bg-red-500 text-white" 
                      : "bg-white text-red-600 border border-red-500 hover:bg-red-50"
                  }`}
                >
                  <i className="fas fa-thumbs-down"></i>
                  <span>{selectedComplaint.downvoteCount || 0} Downvotes</span>
                </button>
              </div>

              {/* Comments Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Comments ({selectedComplaint.comments?.length || 0})
                </h3>

                {/* Add Comment - responsive */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      maxLength={500}
                      className="flex-1 p-3 border border-gray-300 rounded-lg text-sm resize-vertical 
                               min-h-20 font-sans focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleAddComment(selectedComplaint._id)}
                      disabled={!commentText.trim() || addingComment}
                      className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors self-start ${
                        commentText.trim() && !addingComment 
                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {addingComment ? "Posting..." : "Post"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-1">
                    {commentText.length}/500
                  </p>
                </div>

                {/* Comments List - responsive */}
                <div className="max-h-80 overflow-y-auto space-y-3">
                  {selectedComplaint.comments && selectedComplaint.comments.length > 0 ? (
                    selectedComplaint.comments.map((comment) => (
                      <div
                        key={comment._id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {comment.userId?.name || "Anonymous"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {comment.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <i className="fas fa-comments text-4xl text-gray-300 mb-3"></i>
                      <p className="text-gray-500 text-sm">
                        No comments yet. Be the first to comment!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CommunityComplaints;