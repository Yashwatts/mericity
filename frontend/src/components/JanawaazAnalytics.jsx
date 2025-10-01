import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const JanawaazAnalytics = ({ analytics }) => {
  if (!analytics) return null;

  // Points Distribution Chart
  const pointsDistributionData = {
    labels: analytics.pointsDistribution?.map(item => item.range) || [],
    datasets: [
      {
        label: 'Number of Users',
        data: analytics.pointsDistribution?.map(item => item.count) || [],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ],
        borderColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ],
        borderWidth: 2,
      },
    ],
  };

  // Daily Progress Chart
  const monthlyTrendData = {
    labels: analytics.monthlyTrend?.map(item => {
      // Parse the date string (YYYY-MM-DD format)
      const date = new Date(item.date + 'T00:00:00+05:30'); // Add IST timezone
      return date.toLocaleDateString('en-IN', { 
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    }) || [],
    datasets: [
      {
        label: 'Points Earned',
        data: analytics.monthlyTrend?.map(item => item.points) || [],
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Complaints Filed',
        data: analytics.monthlyTrend?.map(item => item.complaints) || [], // Show actual complaint count
        fill: false,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // City Comparison Chart
  const cityComparisonData = {
    labels: analytics.cityComparison?.map(item => item.city) || [],
    datasets: [
      {
        label: 'Total Points',
        data: analytics.cityComparison?.map(item => item.totalPoints) || [],
        backgroundColor: analytics.cityComparison?.map(item => 
          item.isCurrentCity ? 'rgba(255, 206, 86, 0.8)' : 'rgba(54, 162, 235, 0.6)'
        ) || [],
        borderColor: analytics.cityComparison?.map(item => 
          item.isCurrentCity ? 'rgba(255, 206, 86, 1)' : 'rgba(54, 162, 235, 1)'
        ) || [],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: window.innerWidth < 640 ? 10 : 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: window.innerWidth < 640 ? 8 : 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: window.innerWidth < 640 ? 9 : 11
          },
          stepSize: 1, // Force whole number steps
          callback: function(value) {
            if (Number.isInteger(value)) {
              return value;
            }
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: window.innerWidth < 640 ? 9 : 11
          },
          maxRotation: window.innerWidth < 640 ? 45 : 0,
          minRotation: 0
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: window.innerWidth < 640 ? 'bottom' : 'right',
        labels: {
          usePointStyle: true,
          padding: window.innerWidth < 640 ? 10 : 15,
          font: {
            size: window.innerWidth < 640 ? 9 : 11
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        cornerRadius: 8,
        padding: window.innerWidth < 640 ? 8 : 12,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((context.raw / total) * 100);
            return `${context.label}: ${context.raw} users (${percentage}%)`;
          }
        }
      }
    },
    cutout: window.innerWidth < 640 ? '50%' : '60%'
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-blue-100 text-xs sm:text-sm">Your Rank</p>
              <p className="text-xl sm:text-2xl font-bold">#{analytics.summary?.userRank || 'N/A'}</p>
            </div>
            <i className="fas fa-medal text-2xl sm:text-3xl text-blue-200 flex-shrink-0 ml-2"></i>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 sm:p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-green-100 text-xs sm:text-sm">Your Points</p>
              <p className="text-xl sm:text-2xl font-bold">{analytics.summary?.userPoints || 0}</p>
            </div>
            <i className="fas fa-star text-2xl sm:text-3xl text-green-200 flex-shrink-0 ml-2"></i>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-3 sm:p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-purple-100 text-xs sm:text-sm">District Users</p>
              <p className="text-xl sm:text-2xl font-bold">{analytics.summary?.totalDistrictUsers || 0}</p>
            </div>
            <i className="fas fa-users text-2xl sm:text-3xl text-purple-200 flex-shrink-0 ml-2"></i>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 sm:p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-orange-100 text-xs sm:text-sm truncate">Your City</p>
              <p className="text-sm sm:text-lg font-bold truncate">{analytics.summary?.userCity || 'Unknown'}</p>
            </div>
            <i className="fas fa-city text-2xl sm:text-3xl text-orange-200 flex-shrink-0 ml-2"></i>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Points Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-chart-pie text-blue-600 text-sm sm:text-base"></i>
            <span className="truncate">Points Distribution in {analytics.summary?.userCity}</span>
          </h3>
          <div className="h-48 sm:h-64">
            <Doughnut data={pointsDistributionData} options={doughnutOptions} />
          </div>
        </div>

        {/* Daily Progress */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-chart-line text-green-600 text-sm sm:text-base"></i>
            <span className="truncate">Your Daily Progress (Last 30 Days)</span>
          </h3>
          <div className="h-48 sm:h-64">
            {analytics.monthlyTrend?.length > 0 ? (
              <Line data={monthlyTrendData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <i className="fas fa-chart-line text-3xl sm:text-4xl mb-2 opacity-50"></i>
                  <p className="text-sm sm:text-base">No data available yet</p>
                  <p className="text-xs sm:text-sm">Start earning points to see your progress!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* City Comparison */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200 xl:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-chart-bar text-purple-600 text-sm sm:text-base"></i>
            <span className="truncate">Top Cities in {analytics.summary?.userState}</span>
          </h3>
          <div className="h-64 sm:h-80">
            {analytics.cityComparison?.length > 0 ? (
              <Bar data={cityComparisonData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <i className="fas fa-chart-bar text-3xl sm:text-4xl mb-2 opacity-50"></i>
                  <p className="text-sm sm:text-base">No city data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Achievers */}
      {analytics.recentAchievers && analytics.recentAchievers.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-trophy text-yellow-600 text-sm sm:text-base"></i>
            <span>🔥 Hot This Month - Top Earners</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {analytics.recentAchievers.map((achiever, index) => (
              <div key={achiever._id} className="text-center p-3 sm:p-4 bg-gradient-to-b from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-base sm:text-lg font-bold ${
                  index === 0 ? 'bg-yellow-400 text-yellow-900' :
                  index === 1 ? 'bg-gray-300 text-gray-700' :
                  index === 2 ? 'bg-orange-400 text-orange-900' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <p className="font-medium text-gray-800 text-xs sm:text-sm truncate">{achiever.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  +{achiever.monthlyPoints} points
                </p>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((achiever.monthlyPoints / Math.max(...analytics.recentAchievers.map(a => a.monthlyPoints))) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Analysis Table */}
      {analytics.statusAnalysis && analytics.statusAnalysis.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-table text-indigo-600 text-sm sm:text-base"></i>
            Performance Analysis
          </h3>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-2 sm:p-3 font-medium text-gray-600">User</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-gray-600">Points</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-gray-600 hidden xs:table-cell">Total</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-gray-600 hidden sm:table-cell">In Progress</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-gray-600 hidden sm:table-cell">Resolved</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-gray-600">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.statusAnalysis.slice(0, 10).map((user, index) => {
                    const successRate = user.totalComplaints > 0 ? 
                      Math.round(((user.resolvedComplaints + user.inProgressComplaints) / user.totalComplaints) * 100) : 0;
                    return (
                      <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium truncate">{user.name}</span>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-right font-bold text-blue-600">{user.points}</td>
                        <td className="p-2 sm:p-3 text-right hidden xs:table-cell">{user.totalComplaints}</td>
                        <td className="p-2 sm:p-3 text-right text-orange-600 hidden sm:table-cell">{user.inProgressComplaints}</td>
                        <td className="p-2 sm:p-3 text-right text-green-600 hidden sm:table-cell">{user.resolvedComplaints}</td>
                        <td className="p-2 sm:p-3 text-right">
                          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                            successRate >= 80 ? 'bg-green-100 text-green-800' :
                            successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {successRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JanawaazAnalytics;