import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faCheckCircle, faExclamationTriangle, faSpinner, faTimes, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { 
  getCurrentLocation, 
  checkGeolocationPermission 
} from "../utils/geolocation";

const LocationFilter = ({ 
  locationFilter, 
  setLocationFilter, 
  onLocationUpdate,
  disabled = false 
}) => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5); // Default 5km radius
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  // Check permission on component mount
  useEffect(() => {
    checkGeolocationPermission().then(setLocationPermission);
  }, []);

  // Handle location filter change
  const handleLocationFilterChange = async (value) => {
    setLocationFilter(value);
    setLocationError(null);

    if (value === 'nearby') {
      if (!userLocation) {
        await requestLocation();
      }
      setShowRadiusSelector(true);
      onLocationUpdate(userLocation, radiusKm);
    } else {
      setShowRadiusSelector(false);
      onLocationUpdate(null, radiusKm);
    }
  };

  // Request user location
  const requestLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setLocationPermission('granted');
      onLocationUpdate(location, radiusKm);
    } catch (error) {
      setLocationError(error.message);
      setLocationPermission('denied');
      setLocationFilter('all');
      setShowRadiusSelector(false);
      onLocationUpdate(null, radiusKm);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle radius change
  const handleRadiusChange = (newRadius) => {
    setRadiusKm(newRadius);
    if (userLocation) {
      onLocationUpdate(userLocation, newRadius);
    }
  };

  const getLocationStatus = () => {
    if (isGettingLocation) return <><FontAwesomeIcon icon={faSpinner} className="text-blue-600 fa-spin" /> Getting location...</>;
    if (locationError) return <><FontAwesomeIcon icon={faTimes} className="text-red-600" /> Location unavailable</>;
    if (userLocation) return <><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> Location ready</>;
    return <><FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-600" /> Location needed</>;
  };

  const canUseNearby = locationPermission === 'granted' || locationPermission === 'prompt';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
      {/* Main Location Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-sm text-gray-600 font-medium min-w-max">
          Area:
        </label>
        <select 
          value={locationFilter} 
          onChange={(e) => handleLocationFilterChange(e.target.value)}
          disabled={disabled}
          className={`
            px-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors min-w-48
            ${disabled 
              ? 'cursor-not-allowed bg-gray-100 text-gray-400 opacity-60' 
              : 'cursor-pointer bg-white text-gray-800 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }
          `}
        >
          <option value="all">All Areas</option>
          <option value="nearby" disabled={!canUseNearby}>
            Nearby {!canUseNearby ? "(Location Required)" : ""}
          </option>
        </select>
      </div>

      {/* Location Status */}
      {locationFilter === 'nearby' && (
        <div className={`
          flex items-center gap-2 text-xs
          ${locationError ? 'text-red-500' : 'text-gray-600'}
        `}>
          <span className="whitespace-nowrap">{getLocationStatus()}</span>
          {locationError && !isGettingLocation && (
            <button
              onClick={requestLocation}
              className="px-2 py-1 text-xs bg-blue-600 text-white border-none rounded 
                        cursor-pointer font-medium hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Radius Selector */}
      {showRadiusSelector && locationFilter === 'nearby' && !locationError && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 
                        rounded-lg border border-gray-200">
          <label className="text-xs text-gray-600 font-medium min-w-max">
            Within:
          </label>
          <select
            value={radiusKm}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer 
                      bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      transition-colors"
          >
            <option value={1}>1 km</option>
            <option value={2}>2 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
          </select>
        </div>
      )}

      {/* Location Permission Info */}
      {locationPermission === 'denied' && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 
                        max-w-full sm:max-w-xs flex items-center gap-2">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          Location access required for nearby filtering. Please enable location in your browser settings.
        </div>
      )}

      {locationPermission === 'unsupported' && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 flex items-center gap-2">
          <FontAwesomeIcon icon={faTimes} />
          Geolocation not supported by your browser
        </div>
      )}
    </div>
  );
};

export default LocationFilter;