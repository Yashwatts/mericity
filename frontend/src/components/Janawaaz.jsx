import React, { useState, useEffect } from 'react';
import JanawaazAnalytics from './JanawaazAnalytics';

const Janawaaz = ({ token }) => {
  const [activeView, setActiveView] = useState('district'); // district | state | myPoints | analytics
  const [districtRankings, setDistrictRankings] = useState(null);
  const [stateRankings, setStateRankings] = useState(null);
  const [myPoints, setMyPoints] = useState(null);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchJanawaazData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [districtRes, stateRes, pointsRes, statsRes, analyticsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/janawaaz/district`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/janawaaz/state`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/janawaaz/my-points`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/janawaaz/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/janawaaz/analytics`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const districtData = await districtRes.json();
        const stateData = await stateRes.json();
        const pointsData = await pointsRes.json();
        const statsData = await statsRes.json();
        const analyticsData = await analyticsRes.json();

        if (districtData.error || stateData.error || pointsData.error || statsData.error || analyticsData.error) {
          throw new Error(districtData.error || stateData.error || pointsData.error || statsData.error || analyticsData.error);
        }

        setDistrictRankings(districtData);
        setStateRankings(stateData);
        setMyPoints(pointsData);
        setStats(statsData);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Janawaaz data fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchJanawaazData();
    }
  }, [token]);

  const renderRankingList = (rankings, title, isState = false) => {
    const maxPoints = rankings.rankings.length > 0 ? Math.max(...rankings.rankings.map(u => u.points)) : 1;
    
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className={`fas ${isState ? 'fa-flag' : 'fa-city'} text-blue-600`}></i>
          {title}
        </h3>
        
        {rankings.rankings && rankings.rankings.length > 0 ? (
          <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
            {rankings.rankings.map((user) => (
              <div 
                key={user.id} 
                className={`relative overflow-hidden p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                  user.isCurrentUser 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md' 
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }`}
              >
                {/* Background Progress Bar */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-100 to-transparent opacity-30 transition-all duration-500"
                  style={{ width: `${(user.points / maxPoints) * 100}%` }}
                ></div>
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm flex-shrink-0 ${
                      user.rank === 1 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 animate-pulse' :
                      user.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900' :
                      user.rank === 3 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900' :
                      user.isCurrentUser ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' :
                      'bg-gradient-to-br from-gray-100 to-gray-300 text-gray-700'
                    }`}>
                      {user.rank === 1 ? '🥇' : 
                       user.rank === 2 ? '🥈' : 
                       user.rank === 3 ? '🥉' : 
                       `#${user.rank}`}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm sm:text-base font-semibold flex items-center gap-1 sm:gap-2 truncate ${
                        user.isCurrentUser ? 'text-blue-800' : 'text-gray-900'
                      }`}>
                        <span className="truncate">{user.name}</span>
                        {user.isCurrentUser && (
                          <span className="bg-blue-600 text-white text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full animate-bounce flex-shrink-0">
                            You
                          </span>
                        )}
                        {user.rank <= 3 && (
                          <i className="fas fa-crown text-yellow-500 animate-pulse text-xs sm:text-sm"></i>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <i className="fas fa-map-marker-alt"></i>
                        <span className="truncate">{user.city}{isState && user.city !== user.state && `, ${user.state}`}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`text-lg sm:text-xl font-bold ${
                      user.isCurrentUser ? 'text-blue-700' : 
                      user.rank <= 3 ? 'text-yellow-600' : 'text-gray-700'
                    }`}>
                      {user.points}
                      <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1">pts</span>
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <i className="fas fa-clipboard-list"></i>
                      <span className="hidden xs:inline">{user.totalComplaints} complaints</span>
                      <span className="xs:hidden">{user.totalComplaints}</span>
                    </div>
                  </div>
                </div>
                
                {/* Mini progress indicator */}
                <div className="mt-3">
                  <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-700 ${
                        user.isCurrentUser ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                        user.rank <= 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                        'bg-gradient-to-r from-gray-300 to-gray-500'
                      }`}
                      style={{ 
                        width: `${(user.points / maxPoints) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="animate-bounce mb-4">
              <i className="fas fa-trophy text-5xl text-gray-300"></i>
            </div>
            <p className="text-gray-500 text-lg font-medium">No rankings available yet</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to earn points!</p>
          </div>
        )}

        {/* Show current user rank if not in top list */}
        {rankings.currentUserRank && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
            <p className="text-xs sm:text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
              <i className="fas fa-user-circle"></i>
              Your Position
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                  #{rankings.currentUserRank.rank}
                </div>
                <span className="font-medium text-blue-800 truncate">{rankings.currentUserRank.name}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <span className="text-base sm:text-lg font-bold text-blue-700">{rankings.currentUserRank.points}</span>
                <span className="text-xs sm:text-sm text-blue-600 ml-1">points</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 sm:mt-6 text-xs text-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
            <span className="flex items-center gap-2">
              <i className="fas fa-users"></i>
              <span>Total active users: <strong>{rankings.totalUsers}</strong></span>
            </span>
            <span className="flex items-center gap-2">
              <i className="fas fa-chart-line"></i>
              <span>Competition Level: 
              <strong className={rankings.totalUsers > 50 ? 'text-red-600' : rankings.totalUsers > 20 ? 'text-yellow-600' : 'text-green-600'}>
                {rankings.totalUsers > 50 ? 'High' : rankings.totalUsers > 20 ? 'Medium' : 'Low'}
              </strong></span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderMyPoints = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <i className="fas fa-star text-yellow-600"></i>
        My Points Journey
      </h3>

      {myPoints ? (
        <div>
          {/* Enhanced Summary Card */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-4 sm:p-6 rounded-2xl mb-4 sm:mb-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full transform translate-x-12 sm:translate-x-16 -translate-y-12 sm:-translate-y-16"></div>
            <div className="absolute bottom-0 left-0 w-18 h-18 sm:w-24 sm:h-24 bg-white opacity-10 rounded-full transform -translate-x-9 sm:-translate-x-12 translate-y-9 sm:translate-y-12"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="text-lg sm:text-xl font-bold">Total Points Earned</h4>
                <i className="fas fa-trophy text-2xl sm:text-3xl text-yellow-300 animate-pulse"></i>
              </div>
              
              <div className="flex items-end gap-3 sm:gap-4 mb-3 sm:mb-4">
                <p className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
                  {myPoints.user.totalPoints}
                </p>
                <div className="text-white/80 text-xs sm:text-sm mb-1 sm:mb-2">
                  <p>Points earned</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                  <p className="text-white/80 text-xs sm:text-sm">Total Activities</p>
                  <p className="text-lg sm:text-xl font-bold">{myPoints.summary.totalEntries}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                  <p className="text-white/80 text-xs sm:text-sm">Avg per Activity</p>
                  <p className="text-lg sm:text-xl font-bold">{myPoints.summary.averagePointsPerComplaint}</p>
                </div>
              </div>

              {/* Progress to next milestone */}
              <div className="mt-3 sm:mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-white/80">Progress to next milestone</span>
                  <span className="text-xs sm:text-sm font-bold">
                    {myPoints.user.totalPoints % 50}/{50}
                  </span>
                </div>
                <div className="bg-white/30 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-yellow-300 to-yellow-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((myPoints.user.totalPoints % 50) / 50) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Points History */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center gap-2">
              <i className="fas fa-history text-blue-600"></i>
              Points History
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {myPoints.pointsHistory?.length || 0} activities
              </span>
            </h4>
            
            {myPoints.pointsHistory && myPoints.pointsHistory.length > 0 ? (
              <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
                {myPoints.pointsHistory.map((entry, index) => (
                  <div key={index} className="bg-white border-2 border-gray-100 rounded-xl p-3 sm:p-4 hover:border-blue-200 transition-all duration-300 hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                            <span className="text-white font-bold text-xs sm:text-sm">+{entry.points}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{entry.reason}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(entry.awardedAt).toLocaleDateString('en-IN', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Kolkata'
                              })}
                            </p>
                          </div>
                        </div>
                        
                        {entry.complaint && (
                          <div className="ml-10 sm:ml-13 bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200">
                            <p className="text-xs text-gray-700 italic">
                              <i className="fas fa-quote-left text-gray-400 mr-1"></i>
                              <span className="line-clamp-2">{entry.complaint.description}</span>
                              <i className="fas fa-quote-right text-gray-400 ml-1"></i>
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                entry.complaint.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                entry.complaint.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.complaint.status?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-200">
                <div className="animate-bounce mb-4">
                  <i className="fas fa-history text-5xl text-gray-300"></i>
                </div>
                <p className="text-gray-500 text-lg font-medium mb-2">No points earned yet</p>
                <p className="text-gray-400 text-sm mb-4">Submit complaints and wait for admin updates to start earning points!</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
                  <p className="text-blue-800 text-sm font-medium mb-1">💡 How to earn points:</p>
                  <p className="text-blue-700 text-xs">Submit complaints → Admin updates status to "In Progress" → Earn +5 points!</p>
                </div>
              </div>
            )}
          </div>

          {/* Achievement Badges */}
          <div className="mt-4 sm:mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 sm:p-4">
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
              <i className="fas fa-medal text-yellow-600"></i>
              Achievement Badges
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {/* First Points */}
              <div className={`text-center p-2 sm:p-3 rounded-lg border-2 ${
                myPoints.user.totalPoints > 0 ? 'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'
              }`}>
                <i className={`fas fa-star text-xl sm:text-2xl mb-1 sm:mb-2 ${
                  myPoints.user.totalPoints > 0 ? 'text-green-600' : 'text-gray-400'
                }`}></i>
                <p className="text-xs font-medium">First Points</p>
                <p className="text-xs text-gray-600">{myPoints.user.totalPoints > 0 ? '✓' : '—'}</p>
              </div>
              
              {/* Active Citizen */}
              <div className={`text-center p-2 sm:p-3 rounded-lg border-2 ${
                myPoints.user.totalPoints >= 25 ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-300'
              }`}>
                <i className={`fas fa-user-check text-xl sm:text-2xl mb-1 sm:mb-2 ${
                  myPoints.user.totalPoints >= 25 ? 'text-blue-600' : 'text-gray-400'
                }`}></i>
                <p className="text-xs font-medium">Active Citizen</p>
                <p className="text-xs text-gray-600">{myPoints.user.totalPoints >= 25 ? '✓' : `${myPoints.user.totalPoints}/25`}</p>
              </div>
              
              {/* Community Champion */}
              <div className={`text-center p-2 sm:p-3 rounded-lg border-2 ${
                myPoints.user.totalPoints >= 50 ? 'bg-purple-100 border-purple-300' : 'bg-gray-100 border-gray-300'
              }`}>
                <i className={`fas fa-trophy text-xl sm:text-2xl mb-1 sm:mb-2 ${
                  myPoints.user.totalPoints >= 50 ? 'text-purple-600' : 'text-gray-400'
                }`}></i>
                <p className="text-xs font-medium">Champion</p>
                <p className="text-xs text-gray-600">{myPoints.user.totalPoints >= 50 ? '✓' : `${myPoints.user.totalPoints}/50`}</p>
              </div>
              
              {/* Super Citizen */}
              <div className={`text-center p-2 sm:p-3 rounded-lg border-2 ${
                myPoints.user.totalPoints >= 100 ? 'bg-yellow-100 border-yellow-300' : 'bg-gray-100 border-gray-300'
              }`}>
                <i className={`fas fa-crown text-xl sm:text-2xl mb-1 sm:mb-2 ${
                  myPoints.user.totalPoints >= 100 ? 'text-yellow-600' : 'text-gray-400'
                }`}></i>
                <p className="text-xs font-medium">Super Citizen</p>
                <p className="text-xs text-gray-600">{myPoints.user.totalPoints >= 100 ? '✓' : `${myPoints.user.totalPoints}/100`}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="animate-spin mb-4">
            <i className="fas fa-star text-4xl text-gray-300"></i>
          </div>
          <p className="text-gray-500">Loading your points...</p>
        </div>
      )}
    </div>
  );

  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className="bg-gray-50 p-3 rounded-lg mt-3 sm:mt-4 space-y-2 sm:space-y-3">
        <h4 className="font-semibold text-gray-700 text-xs sm:text-sm">Quick Stats</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-white p-2 rounded border">
            <p className="text-xs text-gray-600 mb-1">District Leaders</p>
            {stats.district.topPerformers.slice(0, 2).map((user, i) => (
              <p key={i} className="text-xs font-medium truncate">
                #{i+1} {user.name} ({user.points}pts)
              </p>
            ))}
          </div>
          
          <div className="bg-white p-2 rounded border">
            <p className="text-xs text-gray-600 mb-1">State Leaders</p>
            {stats.state.topPerformers.slice(0, 2).map((user, i) => (
              <p key={i} className="text-xs font-medium truncate">
                #{i+1} {user.name} ({user.points}pts)
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <i className="fas fa-spinner fa-spin text-2xl text-blue-600 mb-2"></i>
        <p className="text-gray-600">Loading Janawaaz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
        <p>Error loading rankings</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
          <i className="fas fa-trophy text-yellow-600 text-sm sm:text-base"></i>
          <span className="truncate">Janawaaz</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Public Recognition Board</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
        <button
          onClick={() => setActiveView('district')}
          className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeView === 'district' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <i className="fas fa-city mr-1"></i>
          <span className="hidden xs:inline">District</span>
          <span className="xs:hidden">Dist</span>
        </button>
        <button
          onClick={() => setActiveView('state')}
          className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeView === 'state' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <i className="fas fa-flag mr-1"></i>
          State
        </button>
        <button
          onClick={() => setActiveView('myPoints')}
          className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeView === 'myPoints' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <i className="fas fa-star mr-1"></i>
          <span className="hidden xs:inline">My Points</span>
          <span className="xs:hidden">Points</span>
        </button>
        <button
          onClick={() => setActiveView('analytics')}
          className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeView === 'analytics' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <i className="fas fa-chart-bar mr-1"></i>
          <span className="hidden xs:inline">Analytics</span>
          <span className="xs:hidden">Stats</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeView === 'district' && districtRankings && 
          <div className="p-3 sm:p-4">{renderRankingList(districtRankings, districtRankings.title, false)}</div>}
        
        {activeView === 'state' && stateRankings && 
          <div className="p-3 sm:p-4">{renderRankingList(stateRankings, stateRankings.title, true)}</div>}
        
        {activeView === 'myPoints' && 
          <div className="p-3 sm:p-4">{renderMyPoints()}</div>}

        {activeView === 'analytics' && (
          <div className="h-full overflow-y-auto">
            <JanawaazAnalytics analytics={analytics} />
          </div>
        )}

        {/* Stats at bottom for ranking views */}
        {(activeView === 'district' || activeView === 'state') && (
          <div className="p-3 sm:p-4 border-t border-gray-200">
            {renderStats()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Janawaaz;