import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './CompleteProfile.css';

function CompleteProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    district: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [manualLocationInput, setManualLocationInput] = useState(false);

  // Validation function
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone)) newErrors.phone = "Enter valid 10-digit phone number";
    if (!form.address.trim()) newErrors.address = "Address is required";
    if (!form.pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(form.pincode)) newErrors.pincode = "Enter valid 6-digit pincode";
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.state.trim()) newErrors.state = "State is required";
    if (!form.district.trim()) newErrors.district = "District is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    setForm({ ...form, [name]: value });
    
    // Auto-fetch city & state for valid pincode
    if (name === "pincode" && /^\d{6}$/.test(value)) {
      fetchPincodeData(value);
    } else if (name === "pincode") {
      // Clear city and state if pincode is invalid
      setForm(prev => ({ ...prev, city: "", state: "", district: "" }));
      setManualLocationInput(false);
    }
  };

  const fetchPincodeData = async (pincode) => {
    setPincodeLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/user/pincode/${pincode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setForm(prev => ({
          ...prev,
          city: data.data.city || "",
          state: data.data.state || "",
          district: data.data.city || ""
        }));
        setManualLocationInput(false);
        alert("Location details fetched successfully!");
      } else {
        setForm(prev => ({ ...prev, city: "", state: "", district: "" }));
        setManualLocationInput(true);
        setErrors(prev => ({ ...prev, pincode: data.error || "Invalid pincode" }));
      }
    } catch (error) {
      console.error("Error fetching pincode data:", error);
      // More user-friendly error handling
      setErrors(prev => ({ ...prev, pincode: "Network error. Please enter city and state manually." }));
      // Allow manual input
      setForm(prev => ({ ...prev, city: "", state: "", district: "" }));
      setManualLocationInput(true);
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setMessage("Please fix the errors below");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setLoading(true);
    setMessage("");
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/user/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please check if the server is running correctly.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessage("Profile saved successfully!");
      setTimeout(() => navigate("/dashboard"), 1500);
      
    } catch (error) {
      console.error("Error saving profile:", error);
      if (error.message.includes('non-JSON response')) {
        setMessage('Server error: The server is not responding correctly. Please check if the backend is running.');
      } else {
        setMessage(error.message || "Failed to save profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complete-profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1 className="profile-title">Complete Your Profile</h1>
          <p className="profile-subtitle">Fill in your details to continue</p>
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'error' : ''}`}
            />
            {errors.name && <div className="error-text">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={handleChange}
              maxLength="10"
              className={`form-input ${errors.phone ? 'error' : ''}`}
            />
            {errors.phone && <div className="error-text">{errors.phone}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              placeholder="Enter your complete address"
              value={form.address}
              onChange={handleChange}
              className={`form-input form-textarea ${errors.address ? 'error' : ''}`}
              rows="3"
            />
            {errors.address && <div className="error-text">{errors.address}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pincode">Pincode</label>
            <div className="pincode-container">
              <input
                id="pincode"
                name="pincode"
                type="text"
                placeholder="Enter 6-digit pincode"
                value={form.pincode}
                onChange={handleChange}
                maxLength="6"
                className={`form-input ${errors.pincode ? 'error' : ''}`}
              />
              {pincodeLoading && (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <span>Fetching location...</span>
                </div>
              )}
            </div>
            {errors.pincode && <div className="error-text">{errors.pincode}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="City"
                value={form.city}
                onChange={handleChange}
                readOnly={!manualLocationInput}
                className={`form-input ${errors.city ? 'error' : ''} ${!manualLocationInput ? 'readonly' : ''}`}
              />
              {errors.city && <div className="error-text">{errors.city}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="district">District</label>
              <input
                id="district"
                name="district"
                type="text"
                placeholder="District"
                value={form.district}
                onChange={handleChange}
                readOnly={!manualLocationInput}
                className={`form-input ${errors.district ? 'error' : ''} ${!manualLocationInput ? 'readonly' : ''}`}
              />
              {errors.district && <div className="error-text">{errors.district}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="state">State</label>
            <input
              id="state"
              name="state"
              type="text"
              placeholder="State"
              value={form.state}
              onChange={handleChange}
              readOnly={!manualLocationInput}
              className={`form-input ${errors.state ? 'error' : ''} ${!manualLocationInput ? 'readonly' : ''}`}
            />
            {errors.state && <div className="error-text">{errors.state}</div>}
          </div>

          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || pincodeLoading}
            className={`save-button ${loading || pincodeLoading ? 'disabled' : ''}`}
          >
            {loading ? (
              <>
                <div className="button-spinner"></div>
                Saving Profile...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfile;