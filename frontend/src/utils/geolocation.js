// Geolocation utilities for nearby filtering functionality

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Get user's current location using browser geolocation API
 * @param {Object} options - Geolocation options
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = "Unable to get location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
          default:
            errorMessage = "An unknown error occurred while getting location";
            break;
        }

        reject(new Error(errorMessage));
      },
      defaultOptions
    );
  });
};

/**
 * Check if geolocation is supported and permissions
 * @returns {Promise<string>} Permission status: 'granted', 'denied', 'prompt', or 'unsupported'
 */
export const checkGeolocationPermission = async () => {
  if (!navigator.geolocation) {
    return "unsupported";
  }

  if (!navigator.permissions) {
    // Fallback for browsers that don't support permissions API
    return "unknown";
  }

  try {
    const permission = await navigator.permissions.query({
      name: "geolocation",
    });
    return permission.state; // 'granted', 'denied', or 'prompt'
  } catch {
    return "unknown";
  }
};

/**
 * Filter complaints by distance from user's location
 * @param {Array} complaints - Array of complaint objects
 * @param {Object} userLocation - User's coordinates {latitude, longitude}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Array} Filtered complaints within radius
 */
export const filterComplaintsByDistance = (
  complaints,
  userLocation,
  radiusKm
) => {
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    return complaints;
  }

  return complaints.filter((complaint) => {
    // Check if complaint has location data
    if (!complaint.location || !complaint.location.coordinates) {
      return false;
    }

    const [complaintLon, complaintLat] = complaint.location.coordinates;

    // Calculate distance
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      complaintLat,
      complaintLon
    );

    return distance <= radiusKm;
  });
};

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
};

/**
 * Get distance between user and complaint for display
 * @param {Object} userLocation - User's coordinates
 * @param {Object} complaint - Complaint object with location
 * @returns {string|null} Formatted distance or null if can't calculate
 */
export const getComplaintDistance = (userLocation, complaint) => {
  if (!userLocation || !complaint.location?.coordinates) {
    return null;
  }

  const [complaintLon, complaintLat] = complaint.location.coordinates;
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    complaintLat,
    complaintLon
  );

  return formatDistance(distance);
};
