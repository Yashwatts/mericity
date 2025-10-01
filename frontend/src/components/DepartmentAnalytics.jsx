import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faChartLine,
  faChartBar,
  faClock,
  faCheckCircle,
  faSpinner,
  faTimes,
  faPhone,
  faUser,
  faEnvelope,
  faRefresh,
  faExclamationCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function DepartmentAnalytics({ token }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("line");

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/admin/analytics`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        setAnalyticsData(data.data);
        setError("");
      } else {
        setError(data.error || "Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Analytics fetch error:", error);
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const formatTime = (hours) => {
    if (hours === 0) return "N/A";
    if (hours < 1) return `${Math.round(hours * 60)} mins`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
  };

  const generateChartData = (department) => {
    const { dailyComplaints } = department.metrics;
    
    return {
      labels: dailyComplaints.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }),
      datasets: [
        {
          label: 'Daily Complaints',
          data: dailyComplaints.map(d => d.count),
          borderColor: '#3b82f6',
          backgroundColor: chartType === 'bar' ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: chartType === 'line',
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  };

  const generateStatusChartData = (statusBreakdown) => {
    return {
      labels: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      datasets: [
        {
          data: [
            statusBreakdown.pending,
            statusBreakdown.in_progress,
            statusBreakdown.resolved,
            statusBreakdown.rejected
          ],
          backgroundColor: [
            '#f59e0b',
            '#3b82f6',
            '#10b981',
            '#ef4444'
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#4b5563',
          font: {
            size: 11,
            family: "'Segoe UI', sans-serif"
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          stepSize: 1,
          font: {
            size: 10
          }
        }
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#4b5563',
          font: {
            size: 11
          },
          padding: 10
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
      }
    },
  };

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "400px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ textAlign: "center" }}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#3b82f6", marginBottom: "15px" }} />
          <p style={{ color: "#6b7280", fontSize: "16px", margin: 0 }}>Loading department analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: "40px", 
        textAlign: "center",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #fecaca"
      }}>
        <FontAwesomeIcon icon={faExclamationCircle} size="2x" style={{ color: "#ef4444", marginBottom: "15px" }} />
        <p style={{ color: "#ef4444", fontSize: "16px", marginBottom: "15px" }}>{error}</p>
        <button
          onClick={fetchAnalyticsData}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: "0 auto"
          }}
        >
          <FontAwesomeIcon icon={faRefresh} />
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData || analyticsData.departmentAnalytics.length === 0) {
    return (
      <div style={{ 
        padding: "40px", 
        textAlign: "center",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <FontAwesomeIcon icon={faInfoCircle} size="2x" style={{ color: "#6b7280", marginBottom: "15px" }} />
        <h3 style={{ color: "#374151", marginBottom: "10px" }}>No Department Data Available</h3>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>
          No departments found for {analyticsData?.city}, {analyticsData?.state}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "0" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "25px",
        flexWrap: "wrap",
        gap: "15px"
      }}>
        <div>
          <h2 style={{ 
            margin: "0 0 5px 0", 
            color: "#1f2937", 
            fontSize: "24px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <FontAwesomeIcon icon={faChartLine} style={{ color: "#3b82f6" }} />
            Department Analytics
          </h2>
          <p style={{ 
            margin: 0, 
            color: "#6b7280", 
            fontSize: "14px" 
          }}>
            {analyticsData.city}, {analyticsData.state} • {analyticsData.totalDepartments} Active Departments
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: "white",
              color: "#374151",
              cursor: "pointer"
            }}
          >
            <option value="line">Line Charts</option>
            <option value="bar">Bar Charts</option>
          </select>
          
          <button
            onClick={fetchAnalyticsData}
            disabled={loading}
            style={{
              padding: "8px 12px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <FontAwesomeIcon icon={faRefresh} spin={loading} />
            Refresh
          </button>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
        gap: "25px"
      }}>
        {analyticsData.departmentAnalytics.map((deptData) => (
          <div
            key={deptData.department._id}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "0",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {/* Department Header */}
            <div style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
              padding: "20px 24px",
              color: "white"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: "18px", 
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FontAwesomeIcon icon={faBuilding} />
                    {deptData.department.name}
                  </h3>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: "13px", 
                    opacity: 0.9 
                  }}>
                    {deptData.department.departmentType}
                  </p>
                  <p style={{ 
                    margin: 0, 
                    fontSize: "12px", 
                    opacity: 0.8 
                  }}>
                    <FontAwesomeIcon icon={faUser} style={{ marginRight: "5px" }} />
                    Head: {deptData.department.headOfDepartment}
                  </p>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <div style={{ 
                    fontSize: "24px", 
                    fontWeight: "bold", 
                    marginBottom: "4px" 
                  }}>
                    {deptData.metrics.totalComplaints}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.8 }}>
                    Total Complaints
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "15px", fontSize: "12px", opacity: 0.9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <FontAwesomeIcon icon={faEnvelope} />
                  {deptData.department.email}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <FontAwesomeIcon icon={faPhone} />
                  {deptData.department.contactNumber}
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <div style={{
                padding: "16px 20px",
                textAlign: "center",
                borderRight: "1px solid #e5e7eb"
              }}>
                <div style={{ 
                  fontSize: "20px", 
                  fontWeight: "600", 
                  color: "#3b82f6",
                  marginBottom: "4px"
                }}>
                  {formatTime(deptData.metrics.avgResponseTime)}
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px"
                }}>
                  <FontAwesomeIcon icon={faClock} />
                  Avg Response Time
                </div>
              </div>
              
              <div style={{
                padding: "16px 20px",
                textAlign: "center",
                borderRight: "1px solid #e5e7eb"
              }}>
                <div style={{ 
                  fontSize: "20px", 
                  fontWeight: "600", 
                  color: "#10b981",
                  marginBottom: "4px"
                }}>
                  {formatTime(deptData.metrics.avgResolveTime)}
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px"
                }}>
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Avg Resolve Time
                </div>
              </div>
              
              <div style={{
                padding: "16px 20px",
                textAlign: "center"
              }}>
                <div style={{ 
                  fontSize: "20px", 
                  fontWeight: "600", 
                  color: "#f59e0b",
                  marginBottom: "4px"
                }}>
                  {deptData.metrics.statusBreakdown.in_progress}
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px"
                }}>
                  <FontAwesomeIcon icon={faSpinner} />
                  In Progress
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "20px",
                minHeight: "220px"
              }}>
                {/* Daily Complaints Chart */}
                <div>
                  <h4 style={{ 
                    margin: "0 0 15px 0", 
                    fontSize: "14px", 
                    color: "#374151",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <FontAwesomeIcon icon={faChartLine} style={{ color: "#3b82f6", fontSize: "12px" }} />
                    Daily Complaints (Last 30 Days)
                  </h4>
                  <div style={{ height: "180px", position: "relative" }}>
                    {chartType === 'line' ? (
                      <Line 
                        data={generateChartData(deptData)} 
                        options={{
                          ...chartOptions,
                          plugins: {
                            ...chartOptions.plugins,
                            title: {
                              display: false
                            }
                          }
                        }} 
                      />
                    ) : (
                      <Bar 
                        data={generateChartData(deptData)} 
                        options={{
                          ...chartOptions,
                          plugins: {
                            ...chartOptions.plugins,
                            title: {
                              display: false
                            }
                          }
                        }} 
                      />
                    )}
                  </div>
                </div>

                {/* Status Breakdown Chart */}
                <div>
                  <h4 style={{ 
                    margin: "0 0 15px 0", 
                    fontSize: "14px", 
                    color: "#374151",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ color: "#10b981", fontSize: "12px" }} />
                    Status Breakdown
                  </h4>
                  <div style={{ height: "180px", position: "relative" }}>
                    <Doughnut 
                      data={generateStatusChartData(deptData.metrics.statusBreakdown)} 
                      options={doughnutOptions}
                    />
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              <div style={{
                marginTop: "20px",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px"
              }}>
                {[
                  { key: 'pending', label: 'Pending', icon: faClock, color: '#f59e0b' },
                  { key: 'in_progress', label: 'In Progress', icon: faSpinner, color: '#3b82f6' },
                  { key: 'resolved', label: 'Resolved', icon: faCheckCircle, color: '#10b981' },
                  { key: 'rejected', label: 'Rejected', icon: faTimes, color: '#ef4444' }
                ].map(status => (
                  <div
                    key={status.key}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb",
                      textAlign: "center"
                    }}
                  >
                    <div style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: status.color,
                      marginBottom: "2px"
                    }}>
                      {deptData.metrics.statusBreakdown[status.key]}
                    </div>
                    <div style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px"
                    }}>
                      <FontAwesomeIcon icon={status.icon} style={{ color: status.color }} />
                      {status.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div style={{
        marginTop: "30px",
        padding: "20px",
        backgroundColor: "#f8fafc",
        borderRadius: "8px",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          textAlign: "center"
        }}>
        </div>
      </div>
    </div>
  );
}

export default DepartmentAnalytics;