import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const quotes = {
  jharkhandi: [
    "तोहर जिम्मेदारी — हर शिकायत के हल।",
    "शिकायत माने भरोसा, काम माने इज्जत।",
    "नागरिक के भरोसा राखऽ, समय पर समाधान करऽ।",
    "नगर सेवा — अपन कर्तव्य।",
    "तोहर काम सँ साफ-सुथरा शहर बनऽ हे।",
  ],
  hindi: [
    "आपकी जिम्मेदारी — हर शिकायत का समाधान।",
    "शिकायत है विश्वास, काम है सम्मान।",
    "नागरिकों का भरोसा बनाए रखें, समय पर समाधान करें।",
    "नगर सेवा ही आपका कर्तव्य है।",
    "आपके कार्यों से शहर साफ और सुरक्षित बनता है।",
  ],
  english: [
    "Your responsibility — resolve every complaint.",
    "A complaint is trust, action is respect.",
    "Uphold citizens' trust — deliver timely resolutions.",
    "Civic service is your duty.",
    "Your work builds cleaner and safer cities.",
  ],
};

/// typewriter effect


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

function AdminLogin() {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminId, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminInfo", JSON.stringify(data.admin));
        navigate("/admin/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Login Form - Left 40% */}
        <div className="w-[40%] flex items-center justify-center p-12 bg-gray-50/30">
          <div className="w-full max-w-sm">
            <div className="bg-neutral-100 rounded-2xl shadow-xl border border-gray-200/50 p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="mb-4">
                  <i className="fas fa-user-shield text-4xl text-blue-600"></i>
                </div>
                <h1 className="text-3xl font-light text-gray-900 mb-2">Admin Portal</h1>
                {/* <p className="text-sm text-gray-600">Sign in</p> */}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-id-card mr-2"></i>Admin ID
                  </label>
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="Enter your admin ID"
                    required
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-lock mr-2"></i>Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-12 rounded-lg text-white font-medium transition-all ${
                    loading 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Sign In 
                    </span>
                  )}
                </button>
              </form>

              {/* Navigation Links */}
              <div className="mt-6 space-y-2">
                <div className="text-center">
                  <button
                    onClick={() => navigate("/department")}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <i className="fas fa-building mr-2"></i>
                    Department Login
                  </button>
                </div>
                <div className="text-center">
                  <button
                    onClick={() => navigate("/")}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Back to User Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quote Section - Right 60% */}
        <div className="w-[60%] relative flex items-center justify-center p-12 bg-slate-800">
          <FlowingBackground />
          <div className="relative z-10">
            <TypewriterQuotes />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="bg-slate-800 text-white p-8 text-center">
          <div className="mb-4">
            <i className="fas fa-user-shield text-4xl text-blue-400"></i>
          </div>
          <h1 className="text-2xl font-light mb-2">Admin Portal</h1>
          <p className="text-slate-300 text-sm">City Management System</p>
        </div>

        {/* Mobile Form */}
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Mobile Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-id-card mr-2"></i>Admin ID
                  </label>
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="Enter your admin ID"
                    required
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-lock mr-2"></i>Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-12 rounded-lg text-white font-medium transition-all ${
                    loading 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Sign In
                    </span>
                  )}
                </button>
              </form>

              {/* Back to User Login */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate("/")}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to User Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;