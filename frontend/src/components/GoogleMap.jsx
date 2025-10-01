import React, { useEffect, useRef } from "react";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";

const render = (status) => {
  switch (status) {
    case Status.LOADING:
      return <div>Loading map...</div>;
    case Status.FAILURE:
      return <div>Error loading map</div>;
    case Status.SUCCESS:
      return null;
  }
};

const MapComponent = ({ center, zoom = 15, onLocationChange, isDraggable = false }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const centerOverlay = useRef(null);

  useEffect(() => {
    if (mapRef.current && center.lat && center.lng && !mapInstance.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        draggable: true,
        gestureHandling: 'greedy',
        disableDefaultUI: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          }
        ]
      });

      mapInstance.current = map;

      if (isDraggable) {
        // Create fixed center pin overlay for smooth performance
        if (!centerOverlay.current) {
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 30px;
            height: 40px;
            margin-top: -40px;
            margin-left: -15px;
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGRyb3Atc2hhZG93IGR4PSIwIiBkeT0iMiIgc3RkRGV2aWF0aW9uPSIyIiBmbG9vZC1vcGFjaXR5PSIwLjMiLz4KPHBhdGggZD0iTTE1IDNDMTAuMDI5NCAzIDYgNy4wMjk0IDYgMTJDNiAxOS41IDE1IDM3IDE1IDM3QzE1IDM3IDI0IDE5LjUgMjQgMTJDMjQgNy4wMjk0IDE5Ljk3MDYgMyAxNSAzWiIgZmlsbD0iIzM0N0FGRiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxMiIgcj0iNCIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4K');
            background-size: contain;
            background-repeat: no-repeat;
            pointer-events: none;
            z-index: 1000;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          `;
          mapRef.current.appendChild(overlay);
          centerOverlay.current = overlay;
        }

        let updateTimeout = null;

        // Throttled update function for smooth performance
        const updateLocation = () => {
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          updateTimeout = setTimeout(() => {
            const mapCenter = map.getCenter();
            if (mapCenter && onLocationChange) {
              onLocationChange({ 
                lat: mapCenter.lat(), 
                lon: mapCenter.lng() 
              });
            }
          }, 100); // Throttled updates for smoothness
        };

        // Listen to map events
        map.addListener('drag', updateLocation);
        map.addListener('dragend', updateLocation);
        map.addListener('zoom_changed', updateLocation);

      } else {
        // Static marker for view-only mode
        new window.google.maps.Marker({
          position: { lat: center.lat, lng: center.lng },
          map,
          title: "Location",
          draggable: false,
          icon: {
            url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGRyb3Atc2hhZG93IGR4PSIwIiBkeT0iMiIgc3RkRGV2aWF0aW9uPSIyIiBmbG9vZC1vcGFjaXR5PSIwLjMiLz4KPHBhdGggZD0iTTE1IDNDMTAuMDI5NCAzIDYgNy4wMjk0IDYgMTJDNiAxOS41IDE1IDM3IDE1IDM3QzE1IDM3IDI0IDE5LjUgMjQgMTJDMjQgNy4wMjk0IDE5Ljk3MDYgMyAxNSAzWiIgZmlsbD0iIzM0N0FGRiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxMiIgcj0iNCIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4K",
            scaledSize: new window.google.maps.Size(30, 40),
            anchor: new window.google.maps.Point(15, 40),
          },
        });
      }
    }
  }, [center.lat, center.lng, isDraggable, onLocationChange, zoom]);

  // Update map center when external location changes
  useEffect(() => {
    if (mapInstance.current && center.lat && center.lng) {
      mapInstance.current.setCenter({ lat: center.lat, lng: center.lng });
    }
  }, [center.lat, center.lng]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: "300px", 
        width: "100%", 
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #e0e0e0",
        position: "relative",
        background: "#f5f5f5"
      }} 
    />
  );
};

const GoogleMap = ({ location, onLocationChange, isDraggable = false }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div style={{ 
        height: "300px", 
        width: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "8px"
      }}>
        <p>Please add your Google Maps API key to .env file</p>
      </div>
    );
  }

  if (!location.lat || !location.lng) {
    return (
      <div style={{ 
        height: "300px", 
        width: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "8px"
      }}>
        <p><FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-600" /> Getting your location...</p>
      </div>
    );
  }

  return (
    <Wrapper apiKey={apiKey} render={render}>
      <MapComponent 
        center={{ lat: location.lat, lng: location.lng }} 
        zoom={15}
        onLocationChange={onLocationChange}
        isDraggable={isDraggable}
      />
    </Wrapper>
  );
};

export default GoogleMap;