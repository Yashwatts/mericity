
    import React, { useState, useEffect } from "react";
    import { GoogleLogin } from "@react-oauth/google";
    import { useNavigate } from "react-router-dom";
    import { api, APIError } from "../utils/api";

    // Multilingual quotes as specified
    const quotes = {
      jharkhandi: [
        "नगर के आवाज बनऽ — समस्या बतावऽ, बदलाव लियावऽ।",
        "आज के शिकयत, काल के साफ सड़क।",
        "नागरिक भाव तोहर सँ शुरू होई — अनदेखा नइ करऽ।",
        "देखऽ। बतावऽ। हल करऽ।",
        "मजबूत नगर, जिम्मेदार लोग सँ बनऽ हे।",
      ],
      hindi: [
        "शहर की आवाज़ बनो — समस्या बताओ, बदलाव लाओ।",
        "आज की शिकायत, कल की साफ़ सड़क।",
        "नागरिक भावना आपसे शुरू होती है — अनदेखा मत करो।",
        "देखो। बताओ। समाधान करो।",
        "मजबूत शहर, जिम्मेदार नागरिकों से बनते हैं।",
      ],
      english: [
        "Be the voice of your city — report issues, spark change.",
        "Your complaint today is a cleaner street tomorrow.",
        "Civic sense begins with you — act, don't ignore.",
        "See it. Report it. Resolve it.",
        "Stronger cities are built by active citizens.",
      ],
    };

    const TypewriterQuotes = () => {
      const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
      const [currentLanguage, setCurrentLanguage] = useState("jharkhandi");
      const [displayedText, setDisplayedText] = useState("");
      const [isTyping, setIsTyping] = useState(false);

      useEffect(() => {
        const languages = ["jharkhandi", "hindi", "english"];

        const typewriterEffect = async (text) => {
          setDisplayedText("");
          setIsTyping(true);

          for (let i = 0; i <= text.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 80));
            setDisplayedText(text.slice(0, i));
          }

          setIsTyping(false);
        };

        const cycleQuotes = async () => {
          const currentQuotes = quotes[currentLanguage];
          const quote = currentQuotes[currentQuoteIndex];

          await typewriterEffect(quote);

          setTimeout(() => {
            const nextLanguageIndex = (languages.indexOf(currentLanguage) + 1) % languages.length;
            const nextLanguage = languages[nextLanguageIndex];

            if (nextLanguage === "jharkhandi") {
              setCurrentQuoteIndex((prev) => (prev + 1) % quotes.jharkhandi.length);
            }

            setCurrentLanguage(nextLanguage);
          }, 3000);
        };

        cycleQuotes();
      }, [currentLanguage, currentQuoteIndex]);

      return (
        <div className="flex items-center justify-center h-full">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-tight text-left mb-4">
              {displayedText}
              <span className={`ml-2 ${isTyping ? "animate-pulse" : ""} text-blue-300`}>|</span>
            </h2>
          </div>
        </div>
      );
    };

    const FlowingBackground = () => (
      <div className="absolute inset-0 overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path
            d="M0,400 Q300,200 600,350 T1200,300 L1200,800 L0,800 Z"
            fill="url(#gradient1)"
            opacity="0.8"
          />
          <path
            d="M0,500 Q400,250 800,400 T1200,350 L1200,800 L0,800 Z"
            fill="url(#gradient2)"
            opacity="0.6"
          />
          <path
            d="M0,600 Q200,400 600,500 T1200,450 L1200,800 L0,800 Z"
            fill="url(#gradient1)"
            opacity="0.4"
          />
        </svg>
      </div>
    );

    const CurvedDivider = () => (
      <div className="absolute top-0 bottom-0 left-[60%] w-px overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 2 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M1,0 Q0.5,200 1,400 Q1.5,600 1,800"
            stroke="url(#dividerGradient)"
            strokeWidth="2"
            fill="none"
          />
          <defs>
            <linearGradient id="dividerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0" />
              <stop offset="20%" stopColor="#e2e8f0" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#e2e8f0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );

    function LoginPage() {
      const [email, setEmail] = useState("");
      const [phone, setPhone] = useState("");
      const [password, setPassword] = useState("");
      const [reEnterPassword, setReEnterPassword] = useState("");
      const [isLoading, setIsLoading] = useState(false);
      const [isRegister, setIsRegister] = useState(false);
      const [loginMethod, setLoginMethod] = useState("email"); // "email" or "phone"
      const navigate = useNavigate();

      const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
          const loginData = { password };
          if (loginMethod === "email") {
            loginData.email = email;
          } else {
            loginData.phone = phone;
          }

          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginData),
          });
          const data = await res.json();

          if (res.status !== 200) {
            alert(data.error);
            return;
          }

          localStorage.setItem("token", data.token);
          if (data.needsProfile) {
            navigate("/complete-profile");
          } else {
            navigate("/dashboard");
          }
        } catch (err) {
          console.error("Login error:", err);
          alert("Something went wrong during login.");
        } finally {
          setIsLoading(false);
        }
      };

      const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (password !== reEnterPassword) {
          alert("Passwords do not match.");
          setIsLoading(false);
          return;
        }

        // Validate phone number if using phone method
        if (loginMethod === "phone" && !/^[6-9]\d{9}$/.test(phone)) {
          alert("Please enter a valid 10-digit phone number starting with 6-9.");
          setIsLoading(false);
          return;
        }

        try {
          const registerData = { password };
          if (loginMethod === "email") {
            registerData.email = email;
          } else {
            registerData.phone = phone;
          }

          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registerData),
          });
          const data = await res.json();

          if (res.status !== 200) {
            alert(data.error);
            return;
          }

          localStorage.setItem("token", data.token);
          if (data.needsProfile) {
            navigate("/complete-profile");
          } else {
            navigate("/dashboard");
          }
        } catch (err) {
          console.error("Register error:", err);
          alert("Something went wrong during registration.");
        } finally {
          setIsLoading(false);
        }
      };

      const handleGoogleSuccess = async (credentialResponse) => {
        try {
          const tokenId = credentialResponse.credential;
          
          console.log('Attempting Google login...');
          const data = await api.googleLogin(tokenId);

          console.log('Google login successful:', data);
          localStorage.setItem("token", data.token);
          
          if (data.needsProfile) {
            navigate("/complete-profile");
          } else {
            navigate("/dashboard");
          }
        } catch (err) {
          console.error("Google login error:", err);
          if (err instanceof APIError) {
            alert(`Google login failed: ${err.message}`);
          } else {
            alert("Google login failed. Please try again.");
          }
        }
      };

      const handleGoogleFailure = () => {
        alert("Google login failed.");
      };
      const [showLogin, setShowLogin] = useState(false);

      return (
        <div className="min-h-screen bg-white">
          {/* Desktop Layout */}
          <div className="hidden lg:flex h-screen">
            {/* Left Section - 60% */}
            <div className="w-[60%] relative flex items-center justify-center p-12 bg-slate-800">
              <FlowingBackground />
              <div className="relative z-10">
                <TypewriterQuotes />
              </div>
            </div>

            {/* Curved Divider */}
            <CurvedDivider />

            {/* Right Section - 40% */}
            <div className="w-[40%] flex items-center justify-center p-12 bg-gray-50/30">
              <div className="w-full max-w-sm">
                <div className="shadow-xl border-0 shadow-gray-200/20 bg-neutral-100 rounded-lg">
                  <div className="space-y-6 pb-6 p-6">
                    <div className="text-center">
                      <h1 className="text-3xl font-light text-gray-900 mb-2">Civic Sense</h1>
                      <p className="text-sm text-gray-600">
                        {isRegister ? "Create your account" : "Crowdsourced Issue Reporting"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 p-6 pt-0">
                    <div className="space-y-4">
                      {/* Login Method Toggle */}
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setLoginMethod("email")}
                          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                            loginMethod === "email"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <i className="fas fa-envelope mr-2"></i>Email
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoginMethod("phone")}
                          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                            loginMethod === "phone"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <i className="fas fa-phone mr-2"></i>Phone
                        </button>
                      </div>

                      {/* Email or Phone Input */}
                      {loginMethod === "email" ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="fas fa-envelope mr-2"></i>Email Address
                          </label>
                          <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                            required
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="fas fa-phone mr-2"></i>Phone Number
                          </label>
                          <input
                            type="tel"
                            placeholder="Enter 10-digit phone number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            maxLength="10"
                            className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                            required
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <i className="fas fa-lock mr-2"></i>Password
                        </label>
                        <input
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                          required
                        />
                      </div>

                      {isRegister && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="fas fa-shield-alt mr-2"></i>Confirm Password
                          </label>
                          <input
                            type="password"
                            placeholder="Re-enter your password"
                            value={reEnterPassword}
                            onChange={(e) => setReEnterPassword(e.target.value)}
                            className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                            required
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={isRegister ? handleRegister : handleLogin}
                      disabled={isLoading}
                      className={`w-full h-12 rounded-lg text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                        isLoading 
                          ? "bg-gray-400 cursor-not-allowed" 
                          : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      }`}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <i className={`fas ${isRegister ? 'fa-user-plus' : 'fa-sign-in-alt'} mr-2`}></i>
                          {isRegister ? "Create Account" : "Sign In"}
                        </span>
                      )}
                    </button>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setIsRegister(!isRegister)}
                        className="w-full h-12 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 bg-white transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                      >
                        <span className="flex items-center justify-center">
                          <i className={`fas ${isRegister ? 'fa-arrow-left' : 'fa-user-plus'} mr-2`}></i>
                          {isRegister ? "Back to Login" : "Create Account"}
                        </span>
                      </button>

                      <div className="w-full h-12 flex items-center justify-center">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={handleGoogleFailure}
                          size="large"
                          width="100%"
                          text="continue_with"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}{/* Mobile Layout */}
<div className="lg:hidden min-h-screen flex flex-col">
  
  <div className="relative flex-1">
    {/* Typewriter Screen */}
    <div
      className={`absolute inset-0 flex items-center justify-center p-6 bg-slate-800 transition-opacity duration-700 ${
        showLogin ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onClick={() => setShowLogin(true)}
    >
      <FlowingBackground />
      <div className="relative z-10 text-center">
        <div className="max-w-sm">
          <TypewriterQuotes />
        </div>
      </div>
    </div>

    {/* Login/Register Card */}
    <div
      className={`absolute inset-0 flex items-center justify-center p-6 bg-slate-100 transition-opacity duration-700 ${
        showLogin ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="w-full max-w-sm">
        <div className="shadow-lg border-0 shadow-gray-200/50 rounded-lg bg-neutral-100">
          <div className="space-y-4 pb-4 p-6">
            <div className="text-center">
              <h1 className="text-2xl font-light text-gray-900 mb-1">
                {isRegister ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="text-sm text-gray-600">
                {isRegister ? "Sign up to continue" : "Sign in to continue"}
              </p>
            </div>
          </div>

          <div className="space-y-4 p-6 pt-0">
            <div className="space-y-4">
              {/* Login Method Toggle - Mobile */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setLoginMethod("email")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    loginMethod === "email"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <i className="fas fa-envelope mr-1"></i>Email
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("phone")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    loginMethod === "phone"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <i className="fas fa-phone mr-1"></i>Phone
                </button>
              </div>

              {/* Email or Phone Input - Mobile */}
              {loginMethod === "email" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-envelope mr-2"></i>Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-phone mr-2"></i>Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength="10"
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-lock mr-2"></i>Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                  required
                />
              </div>

              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-shield-alt mr-2"></i>Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    value={reEnterPassword}
                    onChange={(e) => setReEnterPassword(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                    required
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={isRegister ? handleRegister : handleLogin}
              className="w-full h-11 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : isRegister ? "Register" : "Login"}
            </button>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="w-full h-11 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 bg-transparent cursor-pointer"
              >
                {isRegister ? "Back to Login" : "Register"}
              </button>

              <div className="w-full h-11 flex items-center justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleFailure}
                  size="medium"
                  width="100%"
                  text="continue_with"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


 </div>
      );
    }
    export default LoginPage;