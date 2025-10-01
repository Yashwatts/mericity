import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBus, 
  faShoppingBasket, 
  faCreditCard, 
  faHeartbeat, 
  faFilm, 
  faBook, 
  faTint, 
  faFire, 
  faGift,
  faTrophy,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faPhone,
  faMapMarkerAlt,
  faStickyNote
} from '@fortawesome/free-solid-svg-icons';

const Rewards = () => {
  const [rewards, setRewards] = useState([]);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [selectedReward, setSelectedReward] = useState(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemData, setRedeemData] = useState({
    deliveryAddress: '',
    contactPhone: '',
    notes: ''
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponDetails, setCouponDetails] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await fetchRewards();
      await fetchMyRedemptions();
      await fetchUserProfile();
    };
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRewards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/rewards`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rewards');
      }

      const data = await response.json();
      setRewards(data.rewards || []);
      setUserPoints(data.userPoints || 0);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      showMessage('Failed to load rewards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRedemptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/rewards/my-redemptions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch redemptions');
      }

      const data = await response.json();
      setMyRedemptions(data.redemptions || []);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      setUserEmail(data.user?.email || '');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleRedeemClick = (reward) => {
    setSelectedReward(reward);
    setShowRedeemModal(true);
    setRedeemData({
      deliveryAddress: '',
      contactPhone: '',
      notes: ''
    });
  };

  const handleRedeemSubmit = async () => {
    if (!selectedReward) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/rewards/redeem/${selectedReward._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...redeemData,
          sendEmail: true // Request email to be sent
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to redeem reward');
      }

      // Show coupon details modal
      if (data.couponDetails) {
        setCouponDetails(data.couponDetails);
        setShowCouponModal(true);
        showMessage('Reward redeemed successfully! Email sent to your registered email address.', 'success');
      } else {
        showMessage('Reward redeemed successfully! Check your email for coupon details.', 'success');
      }

      setShowRedeemModal(false);
      setSelectedReward(null);
      setUserPoints(data.remainingPoints);
      
      // Refresh data
      fetchRewards();
      fetchMyRedemptions();

    } catch (error) {
      console.error('Error redeeming reward:', error);
      showMessage(error.message, 'error');
    }
  };

  const getIconComponent = (iconName) => {
    const iconMap = {
      bus: faBus,
      'shopping-bag': faShoppingBasket,
      'credit-card': faCreditCard,
      heart: faHeartbeat,
      film: faFilm,
      book: faBook,
      droplet: faTint,
      flame: faFire,
      gift: faGift
    };
    return iconMap[iconName] || faGift;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: faClock },
      approved: { text: 'Approved', color: 'bg-green-100 text-green-800', icon: faCheckCircle },
      completed: { text: 'Completed', color: 'bg-blue-100 text-blue-800', icon: faCheckCircle },
      cancelled: { text: 'Cancelled', color: 'bg-red-100 text-red-800', icon: faTimesCircle }
    };
    const statusInfo = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800', icon: faClock };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
        <FontAwesomeIcon icon={statusInfo.icon} className="w-3 h-3" />
        {statusInfo.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <FontAwesomeIcon icon={faSpinner} spin className="w-5 h-5" />
          <span className="text-lg">Loading rewards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <FontAwesomeIcon icon={faGift} className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Rewards Center</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">Redeem your civic contribution points for exciting rewards!</p>
        </div>

        {/* User Points Display */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faTrophy} className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Your Points</h2>
                <p className="text-sm sm:text-base text-gray-600">Earned through civic contributions</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{userPoints}</div>
              <div className="text-xs sm:text-sm text-gray-500">Available Points</div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            <div className="flex items-start gap-2 text-sm sm:text-base">
              <FontAwesomeIcon 
                icon={messageType === 'success' ? faCheckCircle : faTimesCircle} 
                className="w-4 h-4 mt-0.5 flex-shrink-0" 
              />
              <span className="break-words">{message}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 sm:mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-md font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
              activeTab === 'available'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Available ({rewards.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-md font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Redemptions ({myRedemptions.length})
          </button>
        </div>

        {/* Available Rewards Tab */}
        {activeTab === 'available' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {rewards.map((reward) => (
              <div key={reward._id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <FontAwesomeIcon 
                        icon={getIconComponent(reward.icon)} 
                        className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{reward.title}</h3>
                      <span className="text-xs sm:text-sm text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                        {reward.category}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed line-clamp-3">{reward.description}</p>
                  
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faTrophy} className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                      <span className="text-lg sm:text-xl font-bold text-blue-600">{reward.pointsRequired} pts</span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      Used: {reward.userRedemptionCount}/{reward.maxRedemptionsPerUser}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRedeemClick(reward)}
                    disabled={!reward.canRedeem}
                    className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-sm transition-colors ${
                      reward.canRedeem
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="block sm:hidden">
                      {!reward.canRedeem 
                        ? userPoints < reward.pointsRequired 
                          ? `Need ${reward.pointsRequired - userPoints} more`
                          : 'Not Available'
                        : 'Redeem'
                      }
                    </span>
                    <span className="hidden sm:block">
                      {!reward.canRedeem 
                        ? userPoints < reward.pointsRequired 
                          ? `Need ${reward.pointsRequired - userPoints} more points`
                          : 'Not Available'
                        : 'Redeem Now'
                      }
                    </span>
                  </button>
                  
                  <div className="mt-2 sm:mt-3 text-xs text-gray-400 leading-relaxed">
                    {reward.terms}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Redemptions History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3 sm:space-y-4">
            {myRedemptions.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-white rounded-xl border border-gray-200">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon={faGift} className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Redemptions Yet</h3>
                <p className="text-sm sm:text-base text-gray-500 px-4">Start redeeming rewards to see your history here!</p>
              </div>
            ) : (
              myRedemptions.map((redemption) => (
                <div key={redemption._id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <FontAwesomeIcon 
                          icon={getIconComponent(redemption.reward?.icon)} 
                          className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 break-words">
                          {redemption.reward?.title}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 mb-3 break-words">{redemption.reward?.description}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faTrophy} className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                            <span>Points: {redemption.pointsDeducted}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faCreditCard} className="w-3 h-3 flex-shrink-0" />
                            <span className="break-all">Code: {redemption.redemptionCode}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faClock} className="w-3 h-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">{formatDate(redemption.redeemedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-start">
                      {getStatusBadge(redemption.status)}
                    </div>
                  </div>
                  
                  {redemption.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-2 text-sm">
                        <FontAwesomeIcon icon={faStickyNote} className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-gray-700">Notes:</span>
                          <span className="text-gray-600 ml-2 break-words">{redemption.notes}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Redeem Modal */}
        {showRedeemModal && selectedReward && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Confirm Redemption</h2>
              
              <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <FontAwesomeIcon 
                      icon={getIconComponent(selectedReward.icon)} 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base break-words">{selectedReward.title}</h3>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 break-words">{selectedReward.description}</p>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faTrophy} className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                  <span className="font-semibold text-blue-600 text-sm sm:text-base">
                    Points Required: {selectedReward.pointsRequired}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faPhone} className="w-4 h-4 text-gray-400" />
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    value={redeemData.contactPhone}
                    onChange={(e) => setRedeemData({...redeemData, contactPhone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Your contact number"
                    required
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-gray-400" />
                    Delivery Address (if applicable)
                  </label>
                  <textarea
                    value={redeemData.deliveryAddress}
                    onChange={(e) => setRedeemData({...redeemData, deliveryAddress: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    rows="3"
                    placeholder="Enter delivery address if required"
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faStickyNote} className="w-4 h-4 text-gray-400" />
                    Additional Notes
                  </label>
                  <textarea
                    value={redeemData.notes}
                    onChange={(e) => setRedeemData({...redeemData, notes: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    rows="2"
                    placeholder="Any special instructions or notes"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setSelectedReward(null);
                  }}
                  className="w-full sm:flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeemSubmit}
                  className="w-full sm:flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm text-sm"
                >
                  Confirm Redemption
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coupon Details Modal */}
        {showCouponModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
                <i className="fas fa-gift mr-2"></i>
                Coupon Details
              </h3>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-dashed border-blue-300">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Coupon Code</p>
                    <p className="text-2xl font-bold text-blue-700 tracking-wider">{couponDetails?.couponCode}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valid Until:</span>
                    <span className="font-medium text-gray-800">
                      {couponDetails?.expiryDate && new Date(couponDetails.expiryDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reward:</span>
                    <span className="font-medium text-gray-800">{selectedReward?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email Sent To:</span>
                    <span className="font-medium text-gray-800">{userEmail}</span>
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center">
                    <i className="fas fa-envelope mr-2"></i>
                    Coupon details have been sent to your email address
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button 
                  onClick={() => {
                    setShowCouponModal(false);
                    setCouponDetails(null);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Rewards;