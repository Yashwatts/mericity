import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMapMarkerAlt,
  faEdit,
  faImage,
  faMicrophone,
  faPhone,
  faBolt,
  faPaperPlane,
  faFileUpload,
  faCamera,
  faTrash,
  faStop,
  faCircle,
  faLocationArrow,
  faSync,
  faRobot,
  faSpinner,
  faSearch,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import GoogleMap from "./GoogleMap";

function ComplaintForm({ token, setComplaints, onClose }) {
  // Basic form states
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState({ lat: "", lon: "" });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [phone, setPhone] = useState("");
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [audio, setAudio] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreview, setAudioPreview] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // AI/OCR states - NO automatic analysis
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [ocrError, setOcrError] = useState(null);

  // Priority calculation states
  const [priorityInfo, setPriorityInfo] = useState(null);
  const [isCalculatingPriority, setIsCalculatingPriority] = useState(false);
  const [priorityError, setPriorityError] = useState(null);

  // Location search states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Fetch phone from profile
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/user/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setPhone(data.phone || ""))
      .catch(error => {
        console.error("Error fetching user phone:", error);
      });
  }, [token]);

  // Get live location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setIsLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocationLoading(false);
        }
      );
    } else {
      setIsLocationLoading(false);
    }
  }, []);

  // Handle clicking outside search suggestions to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Manual Gemini Vision AI analysis - ONLY when button clicked
  const analyzeImageWithGeminiVision = async () => {
    if (!image) {
      alert('Please upload an image first');
      return;
    }

    setIsAnalyzingImage(true);
    setOcrError(null);
    setAiSuggestion(null);
    setExtractedText("");

    try {
      const formData = new FormData();
      formData.append('image', image);

      console.log('🔍 Calling Gemini Vision API:', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vision-ocr`);
      console.log('📁 Image file:', image.name, image.size);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vision-ocr`, {
        method: 'POST',
        body: formData
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(result);

      if (result.success) {
        setExtractedText(result.extractedText || "");
        setAiSuggestion(result.suggestion);
        
        // Automatically fill description with AI-generated description
        if (result.suggestion) {
          setDesc(result.suggestion);
        }
        
        // Clear any previous errors on success
        setOcrError(null);
        
        // Only show error if the method indicates a real failure
        if (result.method === 'fallback-analysis' && result.error) {
          // Don't show error for successful fallback, just log it
          console.warn('AI fell back to generic description:', result.error);
        }
      } else {
        throw new Error(result.error || 'AI Vision analysis failed');
      }

    } catch (error) {
      console.error('❌ Gemini Vision Error:', error);
      setOcrError(error.message);
      
      // Enhanced fallback - try to provide better suggestions based on common civic issues
      const civicSuggestions = [
        "Infrastructure maintenance issue requiring attention - visible damage or deterioration affecting public safety and accessibility",
        "Public facility concern identified - cleanliness, functionality, or safety standards not meeting community requirements", 
        "Municipal service disruption detected - essential services or utilities experiencing operational deficiencies",
        "Street infrastructure problem observed - road surface, signage, or lighting systems requiring maintenance intervention",
        "Community safety concern identified - structural, environmental, or accessibility hazards requiring immediate attention"
      ];
      
      // Use a random suggestion instead of the same generic message
      const randomSuggestion = civicSuggestions[Math.floor(Math.random() * civicSuggestions.length)];
      
      setDesc(randomSuggestion);
      setAiSuggestion(randomSuggestion); // Also set as AI suggestion for visual feedback
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Handle image selection - NO automatic analysis
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      
      // Clear previous AI results when new image is uploaded
      setAiSuggestion(null);
      setExtractedText("");
      setOcrError(null);
    }
  };

  // Clear image and reset AI states
  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    setAiSuggestion(null);
    setExtractedText("");
    setOcrError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioPreview(audioUrl);
        setAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const clearAudio = () => {
    setAudio(null);
    setAudioPreview(null);
    setRecordingTime(0);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudio(file);
      const audioUrl = URL.createObjectURL(file);
      setAudioPreview(audioUrl);
    }
  };

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate priority for preview
  const calculatePriority = async () => {
    if (!location.lat || !location.lon) {
      alert("Location is required for priority calculation. Please select a location on the map or enable location access.");
      return;
    }

    setIsCalculatingPriority(true);
    setPriorityError(null);
    setPriorityInfo(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/calculate-priority`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lat: location.lat,
          lon: location.lon,
          issueType: 'general',
          category: 'civic'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPriorityInfo(data);
      } else {
        throw new Error(data.error || 'Priority calculation failed');
      }
      
    } catch (error) {
      console.error("Priority calculation error:", error);
      setPriorityError(error.message);
    } finally {
      setIsCalculatingPriority(false);
    }
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    // Validate required fields
    if (!desc.trim()) {
      alert("Please enter a description");
      return;
    }

    if (!location.lat || !location.lon) {
      alert("Location is required. Please enable location access and try again.");
      return;
    }

    if (!image) {
      alert("Please add a photo");
      return;
    }

    if (!phone.trim()) {
      alert("Please enter your phone number");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("description", desc);
    formData.append("lat", location.lat);
    formData.append("lon", location.lon);
    formData.append("phone", phone);

    // Add AI analysis results if available
    if (extractedText) {
      formData.append("extractedText", extractedText);
    }
    if (aiSuggestion) {
      formData.append("aiAnalysis", aiSuggestion);
    }

    if (image) formData.append("image", image);
    if (audio) formData.append("audio", audio);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setComplaints((prev) => [data.complaint, ...prev]);

      // Show success animation
      setIsSubmitSuccess(true);
      
      // Prepare success data
      const complaintData = {
        id: data.complaint._id,
        description: desc,
        location: {
          lat: location.lat,
          lon: location.lon
        },
        phone: phone,
        priority: priorityInfo,
        aiAnalysis: aiSuggestion,
        extractedText: extractedText,
        timestamp: new Date().toLocaleString()
      };
      
      // Show success modal after a brief delay
      setTimeout(() => {
        setSuccessData(complaintData);
        setShowSuccessModal(true);
        
        // Reset all form fields
        setDesc("");
        setImage(null);
        setImagePreview(null);
        setAudio(null);
        setAudioPreview(null);
        setRecordingTime(0);
        setPriorityInfo(null);
        setPriorityError(null);
        setAiSuggestion(null);
        setExtractedText("");
        setOcrError(null);
        
        // Clear file inputs
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        if (audioInputRef.current) audioInputRef.current.value = "";
        
        // Reset success animation
        setIsSubmitSuccess(false);
        setIsSubmitting(false); // Reset submitting state here too
      }, 1500); // Show success animation for 1.5 seconds
    } catch (error) {
      console.error("Error submitting complaint:", error);
      alert("Error submitting complaint. Please try again.");
      setIsSubmitting(false); // Reset submitting state on error
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    if (onClose) {
      onClose();
    }
  };

  const handleLocationUpdate = (newLocation) => {
    setLocation(newLocation);
    setPriorityInfo(null);
    setPriorityError(null);
  };

  const getCurrentLocation = () => {
    setIsLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setPriorityInfo(null);
          setPriorityError(null);
          setIsLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocationLoading(false);
          alert("Unable to get your location. Please check your browser permissions.");
        }
      );
    }
  };

  // Location search functions
  const handleLocationSearch = async (query) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/complaints/geocode?address=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.success && data.results && data.results.length > 0) {
        const suggestions = data.results.slice(0, 5).map(result => ({
          address: result.formatted_address,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        }));
        setSearchSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Error searching location:", error);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setLocation({
      lat: suggestion.lat,
      lon: suggestion.lng
    });
    setSearchQuery(suggestion.address);
    setShowSuggestions(false);
    setPriorityInfo(null);
    setPriorityError(null);
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Debounce search
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    
    window.searchTimeout = setTimeout(() => {
      handleLocationSearch(value);
    }, 500);
  };

  const handleSearchButtonClick = () => {
    handleLocationSearch(searchQuery);
  };

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .form-section {
            background: #ffffff;
            border: 1px solid #e6e9ef;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
          }
          .form-section:hover {
            border-color: #d1d9e6;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .input-group {
            margin-bottom: 20px;
          }
          .input-label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
            color: #374151;
            font-size: 14px;
          }
          .input-field {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s ease;
            background-color: #ffffff;
          }
          .input-field:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          .button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
          }
          .button:disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }
          .button-primary {
            background: #3b82f6;
            color: white;
          }
          .button-primary:hover:not(:disabled) {
            background: #2563eb;
            transform: translateY(-1px);
          }
          .button-secondary {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }
          .button-secondary:hover:not(:disabled) {
            background: #e5e7eb;
          }
          .ai-predict-button {
            background: linear-gradient(45deg, #60a5fa, #3b82f6);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .ai-predict-button:hover:not(:disabled) {
            background: linear-gradient(45deg, #3b82f6, #2563eb);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .ai-predict-button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          .ai-success-card {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 2px solid #bbf7d0;
            border-radius: 12px;
            padding: 16px;
            margin-top: 12px;
            position: relative;
            overflow: hidden;
          }
          .ai-success-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #10b981, #059669);
          }
          .location-search-container {
            position: relative;
          }
          .location-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
          }
          .suggestion-item {
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid #f3f4f6;
            transition: background-color 0.2s ease;
          }
          .suggestion-item:last-child {
            border-bottom: none;
          }
          .suggestion-item:hover {
            background-color: #f9fafb;
          }

          /* Loading animation for button */
          @keyframes buttonPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          
          /* Success animation for button */
          @keyframes successGlow {
            0% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.3); }
            50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.6); }
            100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
          }
          
          .button-submitting {
            animation: buttonPulse 2s infinite ease-in-out;
          }
          
          .button-success {
            animation: successGlow 1.5s ease-in-out;
          }

          /* Success Modal Styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease-out;
          }
          
          .modal-content {
            background: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          .modal-header {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .modal-title {
            font-size: 24px;
            font-weight: 700;
            color: #10b981;
            margin: 12px 0;
          }
          
          .modal-subtitle {
            color: #6b7280;
            font-size: 14px;
          }
          
          .complaint-details {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin: 16px 0;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          
          .detail-label {
            font-weight: 600;
            color: #374151;
            margin-right: 12px;
            min-width: 80px;
          }
          
          .detail-value {
            color: #6b7280;
            text-align: right;
            flex: 1;
            word-break: break-word;
          }
          
          .priority-badge {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .priority-high {
            background: #fee2e2;
            color: #dc2626;
          }
          
          .priority-medium {
            background: #fef3c7;
            color: #d97706;
          }
          
          .priority-low {
            background: #f3f4f6;
            color: #6b7280;
          }
          
          .modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
          }
          
          .close-modal-btn {
            flex: 1;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
          }
          
          .close-modal-btn:hover {
            background: #2563eb;
          }
        `}
      </style>
      <div style={{ 
        maxWidth: "700px", 
        margin: "20px auto", 
        padding: "0",
        backgroundColor: "transparent"
      }}>
        {/* Header */}
        <div className="form-section">
          <div style={{ textAlign: "center", marginBottom: "px" }}>
            <FontAwesomeIcon icon={faEdit} style={{ fontSize: "32px", color: "#3b82f6", marginBottom: "12px" }} />
            <h2 style={{ margin: "0", color: "#1f2937", fontSize: "28px", fontWeight: "700" }}>
              Submit Complaint
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "16px" }}>
              Help us improve your community by reporting issues
            </p>
          </div>
        </div>

        {/* Location Section */}
        <div className="form-section">
          <div className="input-label">
            <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: "#3b82f6" }} />
            <span>Location *</span>
          </div>
          
          <div style={{ marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLocationLoading}
              className="button button-primary"
            >
              <FontAwesomeIcon icon={faLocationArrow} />
              {isLocationLoading ? "Getting Location..." : "Use Current Location"}
            </button>
            
            {location.lat && location.lon && (
              <button
                type="button"
                onClick={getCurrentLocation}
                className="button button-secondary"
              >
                <FontAwesomeIcon icon={faSync} />
                Refresh Location
              </button>
            )}
          </div>

          {/* Location Search Input */}
          <div className="location-search-container" style={{ marginBottom: "16px" }} ref={searchContainerRef}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Search for a location (e.g., street name, landmark, city)"
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="input-field"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleSearchButtonClick}
                disabled={isSearching}
                className="button button-secondary"
                style={{ whiteSpace: "nowrap" }}
              >
                <FontAwesomeIcon icon={faSearch} />
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="location-suggestions">
                {searchSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="suggestion-item"
                  >
                    <div style={{ fontSize: "14px", color: "#374151" }}>
                      <FontAwesomeIcon icon={faMapMarkerAlt} style={{ marginRight: "8px", color: "#6b7280" }} />
                      {suggestion.address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isLocationLoading ? (
            <div style={{ 
              height: "300px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ textAlign: "center", color: "#6b7280" }}>
                <FontAwesomeIcon icon={faLocationArrow} style={{ fontSize: "24px", marginBottom: "12px", animation: "pulse 2s infinite" }} />
                <p>Getting your location...</p>
              </div>
            </div>
          ) : location.lat && location.lon ? (
            <>
              <GoogleMap 
                location={{ lat: location.lat, lng: location.lon }}
                onLocationChange={handleLocationUpdate}
                isDraggable={true}
              />
              <div style={{ 
                marginTop: "12px", 
                padding: "12px", 
                backgroundColor: "#f0f9ff", 
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#1e40af"
              }}>
                <strong><FontAwesomeIcon icon={faMapMarkerAlt} /> Coordinates:</strong> {parseFloat(location.lat).toFixed(6)}, {parseFloat(location.lon).toFixed(6)}
              </div>
            </>
          ) : (
            <div style={{ 
              height: "200px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              backgroundColor: "#fef2f2",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              textAlign: "center"
            }}>
              <div>
                <FontAwesomeIcon icon={faMapMarkerAlt} style={{ fontSize: "24px", color: "#ef4444", marginBottom: "12px" }} />
                <p style={{ color: "#dc2626", margin: "0" }}>Unable to get location.</p>
                <p style={{ color: "#6b7280", fontSize: "14px", margin: "4px 0 0 0" }}>
                  Please enable location access and try again.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Simple Image Section - MOVED TO FIRST POSITION */}
        <div className="form-section">
          <div className="input-label">
            <FontAwesomeIcon icon={faImage} style={{ color: "#3b82f6" }} />
            <span>Photo Evidence *</span>
          </div>
          
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="button button-secondary"
            >
              <FontAwesomeIcon icon={faFileUpload} />
              Upload Photo
            </button>
            
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="button button-secondary"
            >
              <FontAwesomeIcon icon={faCamera} />
              Take Photo
            </button>
            
            {image && (
              <button
                type="button"
                onClick={clearImage}
                className="button button-secondary"
                style={{ color: "#dc2626" }}
              >
                <FontAwesomeIcon icon={faTrash} />
                Remove
              </button>
            )}
          </div>

          {imagePreview && (
            <div style={{ 
              padding: "16px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb"
            }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#374151", fontWeight: "500" }}>
                Photo Preview:
              </p>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "250px",
                  objectFit: "contain",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff"
                }}
              />
            </div>
          )}
        </div>

        {/* Description Section with Manual AI Button */}
        <div className="form-section">
          <div className="input-group">
            <div className="input-label">
              <FontAwesomeIcon icon={faEdit} style={{ color: "#3b82f6" }} />
              <span>Description *</span>
            </div>
            <textarea
              placeholder="Describe your complaint in detail. Include what happened, when it occurred, and any other relevant information..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="input-field"
              style={{
                minHeight: "120px",
                resize: "vertical",
                fontFamily: "inherit",
                backgroundColor: aiSuggestion ? "#f0f9ff" : "#ffffff",
                border: aiSuggestion ? "2px solid #bfdbfe" : "1px solid #d1d5db"
              }}
              required
            />
            <div style={{
              fontSize: "12px",
              color: "#6b7280",
              marginTop: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>{desc.length}/1000 characters</span>
              
              {/* PREDICT WITH AI BUTTON */}
              <button
                type="button"
                onClick={analyzeImageWithGeminiVision}
                disabled={!image || isAnalyzingImage}
                className="ai-predict-button"
              >
                {isAnalyzingImage ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} style={{animation: "spin 1s linear infinite"}} />
                    Gemini Analyzing...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faRobot} />
                    Predict With AI
                  </>
                )}
              </button>
            </div>

            {/* AI Error Display */}
            {ocrError && (
              <div style={{
                padding: "12px",
                backgroundColor: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                marginTop: "12px",
                fontSize: "14px",
                color: "#dc2626"
              }}>
                <FontAwesomeIcon icon={faRobot} style={{ marginRight: "8px" }} />
                AI Analysis Error: {ocrError}
              </div>
            )}
          </div>
        </div>

        {/* Voice Message Section */}
        <div className="form-section">
          <div className="input-label">
            <FontAwesomeIcon icon={faMicrophone} style={{ color: "#3b82f6" }} />
            <span>Voice Message</span>
            <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "normal" }}>(Optional)</span>
          </div>
          
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
            {!isRecording && !audioPreview && (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  className="button button-secondary"
                  style={{ color: "#dc2626" }}
                >
                  <FontAwesomeIcon icon={faCircle} />
                  Start Recording
                </button>
                
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="button button-secondary"
                >
                  <FontAwesomeIcon icon={faFileUpload} />
                  Upload Audio
                </button>
              </>
            )}
            
            {isRecording && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 16px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  flex: "1"
                }}>
                  <FontAwesomeIcon 
                    icon={faCircle} 
                    style={{ 
                      color: "#ef4444", 
                      fontSize: "8px",
                      animation: "blink 1s infinite" 
                    }} 
                  />
                  <span style={{ color: "#dc2626", fontWeight: "500" }}>
                    Recording... {formatTime(recordingTime)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="button button-secondary"
                  style={{ color: "#059669" }}
                >
                  <FontAwesomeIcon icon={faStop} />
                  Stop
                </button>
              </div>
            )}
            
            {audioPreview && !isRecording && (
              <div style={{ 
                width: "100%",
                padding: "16px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "14px", color: "#374151", fontWeight: "500" }}>
                    Audio Recording
                  </span>
                  <button
                    type="button"
                    onClick={clearAudio}
                    className="button button-secondary"
                    style={{ fontSize: "12px", padding: "6px 12px", color: "#dc2626" }}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Remove
                  </button>
                </div>
                <audio
                  controls
                  src={audioPreview}
                  style={{ width: "100%", height: "40px" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-section">
          <div className="input-group">
            <div className="input-label">
              <FontAwesomeIcon icon={faPhone} style={{ color: "#3b82f6" }} />
              <span>Phone Number *</span>
            </div>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {/* Priority Calculation Section */}
        <div className="form-section">
          <div className="input-group">
            <div className="input-label">
              <FontAwesomeIcon icon={faBolt} style={{ color: "#10b981" }} />
              <span>Priority Calculation</span>
            </div>
            
            <button
              type="button"
              onClick={calculatePriority}
              disabled={!location.lat || !location.lon || isCalculatingPriority}
              className="button"
              style={{
                width: "100%",
                padding: "12px 20px",
                marginBottom: "15px",
                backgroundColor: (!location.lat || !location.lon || isCalculatingPriority) ? "#9ca3af" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: (!location.lat || !location.lon || isCalculatingPriority) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {isCalculatingPriority ? (
                <>
                  <FontAwesomeIcon icon={faSync} className="fa-spin" />
                  Calculating Priority...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faBolt} />
                  Calculate Priority for Map Location
                </>
              )}
            </button>

            {priorityInfo && (
              <div style={{
                padding: "16px",
                backgroundColor: priorityInfo.priority === 'High' ? '#fee2e2' : priorityInfo.priority === 'Medium' ? '#fef3c7' : '#dcfce7',
                border: `2px solid ${priorityInfo.color || (priorityInfo.priority === 'High' ? '#dc2626' : priorityInfo.priority === 'Medium' ? '#f59e0b' : '#10b981')}`,
                borderRadius: "8px",
                marginBottom: "10px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: priorityInfo.color || (priorityInfo.priority === 'High' ? '#dc2626' : priorityInfo.priority === 'Medium' ? '#f59e0b' : '#10b981')
                }}>
                  <span style={{ fontSize: "20px", marginRight: "8px" }}>
                    {priorityInfo.icon || (priorityInfo.priority === 'High' ? '🚨' : priorityInfo.priority === 'Medium' ? '⚠️' : '📝')}
                  </span>
                  Priority: {priorityInfo.priority}
                </div>
                
                <div style={{
                  fontSize: "14px",
                  color: "#374151",
                  marginBottom: "8px",
                  lineHeight: "1.4"
                }}>
                  <strong>Analysis:</strong> {priorityInfo.priorityReason || priorityInfo.message}
                </div>
                
                {priorityInfo.areaName && (
                  <div style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    <strong>Area:</strong> {priorityInfo.areaName}
                  </div>
                )}
                
                {priorityInfo.highPriorityPlace && (
                  <div style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    <strong>Nearby Facility:</strong> {priorityInfo.highPriorityPlace}
                  </div>
                )}
                
                {priorityInfo.searchRadius && (
                  <div style={{
                    fontSize: "11px",
                    color: "#9ca3af",
                    fontStyle: "italic"
                  }}>
                    Search radius: {priorityInfo.searchRadius}m
                  </div>
                )}
              </div>
            )}

            {priorityError && (
              <div style={{
                padding: "12px 16px",
                backgroundColor: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#dc2626",
                marginBottom: "10px"
              }}>
                ❌ Priority calculation failed: {priorityError}
              </div>
            )}
          </div>
        </div>

        {/* Submit Section */}
        <div className="form-section">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !desc.trim() || (!location.lat || !location.lon) || !image || !phone.trim()}
            className={`button button-primary ${isSubmitting ? 'button-submitting' : ''} ${isSubmitSuccess ? 'button-success' : ''}`}
            style={{
              width: "100%",
              padding: "16px 24px",
              fontSize: "16px",
              fontWeight: "600",
              justifyContent: "center",
              backgroundColor: isSubmitting ? "#9ca3af" : 
                             (!desc.trim() || (!location.lat || !location.lon) || !image || !phone.trim()) ? "#9ca3af" : 
                             "#3b82f6",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? "0.7" : "1"
            }}
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} style={{ animation: "spin 1s linear infinite", marginRight: "8px" }} />
                Submitting...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPaperPlane} />
                Submit Complaint
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="success-checkmark">
              <FontAwesomeIcon icon={faCheck} />
            </div>
            <h3>Complaint Submitted Successfully!</h3>
            <p>Your complaint has been registered and will be reviewed by the relevant department.</p>
            <button 
              onClick={() => setShowSuccessModal(false)} 
              className="modal-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ComplaintForm;
