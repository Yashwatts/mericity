import { useState, useMemo } from "react";
import { filterComplaintsByDistance } from "../utils/geolocation";

export const useCommunityFilters = (complaints) => {
  const [sortBy, setSortBy] = useState("latest"); // 'latest', 'oldest', 'most-upvoted', 'most-downvoted'
  const [voteFilter, setVoteFilter] = useState("all"); // 'all', 'upvoted-only', 'downvoted-only', 'no-votes'
  const [locationFilter, setLocationFilter] = useState("all"); // 'all', 'nearby', 'same-area'
  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);

  // Filter and sort complaints based on votes, location, and date
  const getFilteredAndSortedComplaints = useMemo(() => {
    let filtered = [...complaints];

    // Apply vote filter
    if (voteFilter === "upvoted-only") {
      filtered = filtered.filter(
        (complaint) => (complaint.upvoteCount || 0) > 0
      );
    } else if (voteFilter === "downvoted-only") {
      filtered = filtered.filter(
        (complaint) => (complaint.downvoteCount || 0) > 0
      );
    } else if (voteFilter === "no-votes") {
      filtered = filtered.filter(
        (complaint) =>
          (complaint.upvoteCount || 0) === 0 &&
          (complaint.downvoteCount || 0) === 0
      );
    }

    // Apply location filter
    if (locationFilter === "nearby") {
      // Use geolocation-based filtering
      if (userLocation) {
        filtered = filterComplaintsByDistance(filtered, userLocation, radiusKm);
      } else {
        // If no user location, show empty array or all (depending on UX preference)
        filtered = [];
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "latest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "most-upvoted":
          return (b.upvoteCount || 0) - (a.upvoteCount || 0);
        case "most-downvoted":
          return (b.downvoteCount || 0) - (a.downvoteCount || 0);
        case "most-discussed":
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return filtered;
  }, [complaints, sortBy, voteFilter, locationFilter, userLocation, radiusKm]);

  // Handle location updates from LocationFilter component
  const handleLocationUpdate = (location, radius) => {
    setUserLocation(location);
    setRadiusKm(radius);
  };

  const resetFilters = () => {
    setSortBy("latest");
    setVoteFilter("all");
    setLocationFilter("all");
    setUserLocation(null);
    setRadiusKm(5);
  };

  const hasActiveFilters =
    sortBy !== "latest" || voteFilter !== "all" || locationFilter !== "all";

  return {
    sortBy,
    setSortBy,
    voteFilter,
    setVoteFilter,
    locationFilter,
    setLocationFilter,
    userLocation,
    radiusKm,
    handleLocationUpdate,
    getFilteredAndSortedComplaints,
    resetFilters,
    hasActiveFilters,
  };
};
