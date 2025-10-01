import React, { useState, useEffect, useCallback } from "react";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap, faMapMarkerAlt, faPhone, faBolt, faComments } from "@fortawesome/free-solid-svg-icons";

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

const ExploreMapComponent = ({ complaints }) => {
  const mapRef = useCallback((node) => {
    if (node && complaints.length > 0) {
      // Calculate center of all complaints
      const validComplaints = complaints.filter(c => c.location && c.location.lat && c.location.lng);
      
      console.log("Total complaints:", complaints.length);
      console.log("Valid complaints with coordinates:", validComplaints.length);
      console.log("Valid complaints:", validComplaints);
      
      if (validComplaints.length === 0) {
        console.log("No valid complaints with coordinates found");
        return;
      }

      const avgLat = validComplaints.reduce((sum, c) => sum + c.location.lat, 0) / validComplaints.length;
      const avgLng = validComplaints.reduce((sum, c) => sum + c.location.lng, 0) / validComplaints.length;

      console.log("Map center calculated:", { lat: avgLat, lng: avgLng });

      const map = new window.google.maps.Map(node, {
        center: { lat: avgLat, lng: avgLng },
        zoom: validComplaints.length === 1 ? 15 : 12,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      // Add markers for each complaint
      validComplaints.forEach((complaint, index) => {
        // Create a more reliable marker icon
        const priorityColor = complaint.priority === "High" ? "#FF0000" : 
                             complaint.priority === "Medium" ? "#FFA500" : 
                             complaint.priority === "Low" ? "#32CD32" : "#FF4444";
        
        const marker = new window.google.maps.Marker({
          position: { lat: complaint.location.lat, lng: complaint.location.lng },
          map,
          title: `Complaint: ${complaint.description.substring(0, 50)}...`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: priorityColor,
            fillOpacity: 0.8,
            strokeColor: "#FFFFFF",
            strokeWeight: 3,
          },
          label: {
            text: "!",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold"
          },
          animation: window.google.maps.Animation.DROP
        });
        
        console.log(`Created marker ${index + 1}:`, {
          position: { lat: complaint.location.lat, lng: complaint.location.lng },
          priority: complaint.priority,
          color: priorityColor
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="max-width: 200px;">
              <h4 style="margin: 0 0 8px 0; color: #333;">Complaint #${index + 1}</h4>
              <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Description:</strong> ${complaint.description.substring(0, 100)}...</p>
              <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Phone:</strong> ${complaint.phone}</p>
              <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Status:</strong> <span style="
                background-color: ${complaint.status === "pending" ? "#fff3cd" : 
                                  complaint.status === "in_progress" ? "#d4edda" : "#d1ecf1"};
                color: ${complaint.status === "pending" ? "#856404" : 
                        complaint.status === "in_progress" ? "#155724" : "#0c5460"};
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
              ">
                ${complaint.status === "in_progress" ? "🔄 IN PROGRESS" : 
                  complaint.status === "pending" ? "⏳ PENDING" : 
                  complaint.status}
              </span></p>
              ${complaint.priority ? `<p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Priority:</strong> ${complaint.priority}</p>` : ''}
              <p style="margin: 0; font-size: 11px; color: #666;"><strong>Date:</strong> ${new Date(complaint.createdAt).toLocaleDateString()}</p>
              <button onclick="window.viewComplaintDetails('${complaint._id}')" style="margin-top: 8px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">View Details</button>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });
    }
  }, [complaints]);

  return <div ref={mapRef} style={{ height: "500px", width: "100%" }} />;
};

const ExploreComplaints = ({ token }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 });

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Fetch all pending complaints from all users
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/explore`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const pendingComplaints = data.complaints || [];
        
        setComplaints(pendingComplaints);
        
        // Calculate stats
        const stats = {
          total: pendingComplaints.length,
          pending: pendingComplaints.filter(c => c.status === "pending").length,
          inProgress: pendingComplaints.filter(c => c.status === "in_progress").length,
          high: pendingComplaints.filter(c => c.priority === "High").length,
          medium: pendingComplaints.filter(c => c.priority === "Medium").length,
          low: pendingComplaints.filter(c => c.priority === "Low").length
        };
        setStats(stats);
        
      } catch (error) {
        console.error("Error fetching complaints:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchComplaints();
    }
  }, [token]);

  // Make viewComplaintDetails available globally for info window
  useEffect(() => {
    window.viewComplaintDetails = (complaintId) => {
      const complaint = complaints.find(c => c._id === complaintId);
      if (complaint) {
        setSelectedComplaint(complaint);
      }
    };

    return () => {
      delete window.viewComplaintDetails;
    };
  }, [complaints]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <p>Loading pending complaints...</p>
      </div>
    );
  }

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "50px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #ddd",
        borderRadius: "8px",
        margin: "20px"
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FontAwesomeIcon icon={faMap} style={{ color: '#ef4444' }} />
          Map View Unavailable
        </h3>
        <p>Please add your Google Maps API key to view complaints on the map.</p>
        
        {/* Debug: Show complaints without map */}
        {complaints.length > 0 && (
          <div style={{ marginTop: "20px", textAlign: "left" }}>
            <h4>Debug: Available Complaints ({complaints.length})</h4>
            {complaints.map((complaint, index) => (
              <div key={complaint._id || index} style={{ 
                border: "1px solid #ccc", 
                padding: "10px", 
                margin: "5px 0",
                backgroundColor: "white"
              }}>
                <p><strong>Description:</strong> {complaint.description?.substring(0, 100)}...</p>
                <p><strong>Coordinates:</strong> {complaint.location?.lat}, {complaint.location?.lng}</p>
                <p><strong>Priority:</strong> {complaint.priority || "Not set"}</p>
                <p><strong>Status:</strong> {complaint.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Stats Header */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
        gap: "15px", 
        marginBottom: "20px" 
      }}>
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "15px", 
          borderRadius: "8px", 
          textAlign: "center",
          border: "2px solid #007bff"
        }}>
          <h3 style={{ margin: "0", color: "#007bff" }}>{stats.total}</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>Total Open</p>
        </div>
        <div style={{ 
          backgroundColor: "#fff8e1", 
          padding: "15px", 
          borderRadius: "8px", 
          textAlign: "center",
          border: "2px solid #ff9800"
        }}>
          <h3 style={{ margin: "0", color: "#ff9800" }}>{stats.pending}</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>⏳ Pending</p>
        </div>
        <div style={{ 
          backgroundColor: "#e8f5e8", 
          padding: "15px", 
          borderRadius: "8px", 
          textAlign: "center",
          border: "2px solid #4caf50"
        }}>
          <h3 style={{ margin: "0", color: "#4caf50" }}>{stats.inProgress}</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>  In Progress</p>
        </div>
        <div style={{ 
          backgroundColor: "#ffebee", 
          padding: "15px", 
          borderRadius: "8px", 
          textAlign: "center",
          border: "2px solid #f44336"
        }}>
          <h3 style={{ margin: "0", color: "#f44336" }}>{stats.high}</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>  High Priority</p>
        </div>
      </div>

      {/* Map */}
      <div style={{ 
        backgroundColor: "white", 
        borderRadius: "8px", 
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        marginBottom: "20px"
      }}>
        <div style={{ 
          padding: "15px", 
          backgroundColor: "#f8f9fa", 
          borderBottom: "1px solid #ddd" 
        }}>
          <h3 style={{ margin: "0", color: "#333", display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FontAwesomeIcon icon={faMap} style={{ color: '#3b82f6' }} />
            Open Complaints Map ({complaints.length} locations)
          </h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#666" }}>
            Showing both pending and in-progress complaints • Click markers to view details
          </p>
        </div>
        
        {complaints.length > 0 ? (
          <Wrapper apiKey={apiKey} render={render}>
            <ExploreMapComponent 
              complaints={complaints}
            />
          </Wrapper>
        ) : (
          <div style={{ 
            height: "500px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            backgroundColor: "#f8f9fa",
            flexDirection: "column",
            gap: "10px"
          }}>
            <p style={{ color: "#666", fontSize: "18px", margin: 0 }}>
              🎉 No open complaints to display on the map!
            </p>
            <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
              When complaints are submitted, they will appear here as markers.
            </p>
          </div>
        )}
      </div>

      {/* Selected Complaint Modal */}
      {selectedComplaint && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: "1000"
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "8px",
            maxWidth: "600px",
            maxHeight: "80vh",
            overflow: "auto",
            position: "relative"
          }}>
            <button
              onClick={() => setSelectedComplaint(null)}
              style={{
                position: "absolute",
                top: "10px",
                right: "15px",
                backgroundColor: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer"
              }}
            >
              ×
            </button>
            
            <h3>📋 Complaint Details</h3>
            <p><strong>Description:</strong> {selectedComplaint.description}</p>
            
            {selectedComplaint.imageUrl && (
              <div style={{ margin: "15px 0" }}>
                <strong>📷 Image:</strong>
                <br />
                <img
                  src={selectedComplaint.imageUrl}
                  alt="Complaint"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    objectFit: "contain",
                    marginTop: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ddd"
                  }}
                />
              </div>
            )}
            
            {selectedComplaint.audioUrl && (
              <div style={{ margin: "15px 0" }}>
                <strong>🎤 Audio Message:</strong>
                <br />
                <audio controls style={{ width: "100%", marginTop: "10px" }}>
                  <source src={selectedComplaint.audioUrl} type="audio/wav" />
                  <source src={selectedComplaint.audioUrl} type="audio/mp3" />
                </audio>
              </div>
            )}
            
            <p><strong><FontAwesomeIcon icon={faMapMarkerAlt} /> Location:</strong> {selectedComplaint.location.detailedAddress || selectedComplaint.location.address || `${selectedComplaint.location.city || 'Unknown City'}, ${selectedComplaint.location.state || 'Unknown State'}` || `${selectedComplaint.location.lat.toFixed(6)}, ${selectedComplaint.location.lng.toFixed(6)}`}</p>
            <p><strong><FontAwesomeIcon icon={faPhone} /> Phone:</strong> {selectedComplaint.phone}</p>
            {selectedComplaint.priority && <p><strong><FontAwesomeIcon icon={faBolt} /> Priority:</strong> {selectedComplaint.priority}</p>}
            {selectedComplaint.reason && <p><strong><FontAwesomeIcon icon={faComments} /> Reason:</strong> {selectedComplaint.reason}</p>}
            <p><strong>📊 Status:</strong> <span style={{
              backgroundColor: selectedComplaint.status === "pending" ? "#fff3cd" : 
                             selectedComplaint.status === "in_progress" ? "#d4edda" : "#d1ecf1",
              color: selectedComplaint.status === "pending" ? "#856404" : 
                   selectedComplaint.status === "in_progress" ? "#155724" : "#0c5460",
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "600",
              textTransform: "uppercase"
            }}>
              {selectedComplaint.status === "in_progress" ? "🔄 IN PROGRESS" : 
               selectedComplaint.status === "pending" ? "⏳ PENDING" : 
               selectedComplaint.status}
            </span></p>
            <p><strong>📅 Created:</strong> {new Date(selectedComplaint.createdAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExploreComplaints;