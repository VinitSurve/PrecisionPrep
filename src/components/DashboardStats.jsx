import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement 
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { supabase } from '../supabase/client';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const DashboardStats = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    accuracy: 0,
    avgTime: 0
  });
  
  // New state for deletion confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  
  // New state for pie chart data
  const [pieChartData, setPieChartData] = useState({
    correctVsIncorrect: null,
    timePerformance: null,
    speedDistribution: null,
  });
  
  // Function to download CSV
  const downloadCSV = (sessions) => {
    const headers = "Date,Time Taken,Correct,Speed\n";
    const rows = sessions.map(s =>
      `${new Date(s.created_at).toLocaleDateString()},${s.time_taken},${s.was_correct},${s.speed}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PrecisionPrep_sessions.csv";
    a.click();
  };

  // Function to delete a single session
  const deleteSession = async (id) => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) {
        throw error;
      }
      
      // Update sessions state by filtering out the deleted session
      setSessions(prev => prev.filter(session => session.id !== id));
      
      // Recalculate stats and charts after deletion
      const updatedSessions = sessions.filter(session => session.id !== id);
      if (updatedSessions.length > 0) {
        calculateStats(updatedSessions);
        preparePieChartData(updatedSessions);
      } else {
        // Reset stats if no sessions are left
        setStats({
          total: 0,
          correct: 0,
          accuracy: 0,
          avgTime: 0
        });
        setPieChartData({
          correctVsIncorrect: null,
          timePerformance: null,
          speedDistribution: null,
        });
      }
      
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete session. Please try again.');
      setDeletingId(null);
    }
  };

  // Function to delete all sessions
  const deleteAllSessions = async () => {
    try {
      setDeletingAll(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase.from('sessions').delete().eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      // Clear sessions state
      setSessions([]);
      
      // Reset stats
      setStats({
        total: 0,
        correct: 0,
        accuracy: 0,
        avgTime: 0
      });
      
      // Reset pie chart data
      setPieChartData({
        correctVsIncorrect: null,
        timePerformance: null,
        speedDistribution: null,
      });
      
      setShowDeleteConfirm(false);
      setDeletingAll(false);
    } catch (err) {
      console.error('Failed to delete all sessions:', err);
      setError('Failed to delete all sessions. Please try again.');
      setDeletingAll(false);
      setShowDeleteConfirm(false);
    }
  };

  // Helper function to calculate stats
  const calculateStats = (sessionsData) => {
    const total = sessionsData.length;
    const correct = sessionsData.filter(s => s.was_correct).length;
    const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
    const avgTime = total > 0 ? 
      (sessionsData.reduce((sum, s) => sum + s.time_taken, 0) / total).toFixed(2) : 0;
        
    setStats({
      total,
      correct,
      accuracy,
      avgTime
    });
  };

  // Fetch user sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Fetch sessions for current user
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setSessions(data);
        
        // Calculate stats
        if (data.length > 0) {
          calculateStats(data);
          
          // Process data for pie charts
          preparePieChartData(data);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch sessions');
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, []);

  // Function to prepare pie chart data
  const preparePieChartData = (sessionsData) => {
    // 1. Correct vs Incorrect
    const correct = sessionsData.filter(s => s.was_correct).length;
    const incorrect = sessionsData.length - correct;
    
    const correctVsIncorrectData = {
      labels: ['Correct', 'Incorrect'],
      datasets: [
        {
          data: [correct, incorrect],
          backgroundColor: ['#4CAF50', '#F44336'],
          borderColor: ['#388E3C', '#D32F2F'],
          borderWidth: 1,
        },
      ],
    };
    
    // 2. Time Performance: Under-Time vs Over-Time
    const underTime = sessionsData.filter(s => s.time_taken <= s.preferred_time).length;
    const overTime = sessionsData.length - underTime;
    
    const timePerformanceData = {
      labels: ['Under Target Time', 'Over Target Time'],
      datasets: [
        {
          data: [underTime, overTime],
          backgroundColor: ['#2196F3', '#FF9800'],
          borderColor: ['#1976D2', '#F57C00'],
          borderWidth: 1,
        },
      ],
    };
    
    // 3. Speed Distribution
    // Count occurrences of each speed category
    const speedCounts = {};
    sessionsData.forEach(session => {
      const speed = session.speed || 'unknown';
      speedCounts[speed] = (speedCounts[speed] || 0) + 1;
    });
    
    // Prepare data for chart
    const speedLabels = Object.keys(speedCounts);
    const speedData = Object.values(speedCounts);
    
    // Define colors based on labels
    const getColorForSpeedLabel = (label) => {
      switch (label.toLowerCase()) {
        case 'fast': return ['#4CAF50', '#388E3C'];
        case 'slow': return ['#F44336', '#D32F2F'];
        case 'average': return ['#FFC107', '#FFA000'];
        default: return ['#9E9E9E', '#757575'];
      }
    };
    
    const speedColors = speedLabels.map(label => getColorForSpeedLabel(label)[0]);
    const speedBorderColors = speedLabels.map(label => getColorForSpeedLabel(label)[1]);
    
    const speedDistributionData = {
      labels: speedLabels,
      datasets: [
        {
          data: speedData,
          backgroundColor: speedColors,
          borderColor: speedBorderColors,
          borderWidth: 1,
        },
      ],
    };
    
    // Set all pie chart data
    setPieChartData({
      correctVsIncorrect: correctVsIncorrectData,
      timePerformance: timePerformanceData,
      speedDistribution: speedDistributionData
    });
  };

  // Format time as mm:ss
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Prepare data for charts
  const prepareChartData = () => {
    // Group sessions by date
    const sessionsByDate = {};
    
    sessions.forEach(session => {
      const date = new Date(session.created_at).toLocaleDateString();
      
      if (!sessionsByDate[date]) {
        sessionsByDate[date] = {
          total: 0,
          correct: 0,
          totalTime: 0
        };
      }
      
      sessionsByDate[date].total += 1;
      if (session.was_correct) {
        sessionsByDate[date].correct += 1;
      }
      sessionsByDate[date].totalTime += session.time_taken;
    });
    
    // Sort dates
    const sortedDates = Object.keys(sessionsByDate).sort((a, b) => {
      return new Date(a) - new Date(b);
    });
    
    // Prepare bar chart data (correct sessions by date)
    const barChartData = {
      labels: sortedDates,
      datasets: [
        {
          label: 'Correct',
          data: sortedDates.map(date => sessionsByDate[date].correct),
          backgroundColor: '#4CAF50',
        },
        {
          label: 'Incorrect',
          data: sortedDates.map(date => sessionsByDate[date].total - sessionsByDate[date].correct),
          backgroundColor: '#F44336',
        }
      ]
    };
    
    // Prepare line chart data (average time by date)
    const lineChartData = {
      labels: sortedDates,
      datasets: [
        {
          label: 'Average Time (seconds)',
          data: sortedDates.map(date => 
            (sessionsByDate[date].totalTime / sessionsByDate[date].total).toFixed(2)
          ),
          borderColor: '#3F51B5',
          backgroundColor: 'rgba(63, 81, 181, 0.2)',
          tension: 0.3
        }
      ]
    };
    
    return { barChartData, lineChartData };
  };

  // Chart options
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Correct vs Incorrect Sessions by Date',
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Average Time Trend',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Common options for pie charts
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 15,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Prepare chart data if sessions exist
  const chartData = sessions.length > 0 ? prepareChartData() : null;

  return (
    <div className="dashboard-stats">
      {loading ? (
        <div className="loading">Loading your stats...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          {/* Stats summary */}
          <div className="stats-summary">
            <div className="stat-card">
              <h3>Total Sessions</h3>
              <p className="stat-value">{stats.total}</p>
            </div>
            <div className="stat-card">
              <h3>Accuracy</h3>
              <p className="stat-value">{stats.accuracy}%</p>
            </div>
            <div className="stat-card">
              <h3>Average Time</h3>
              <p className="stat-value">{formatTime(stats.avgTime)}</p>
            </div>
          </div>
          
          {/* Pie Charts */}
          {sessions.length > 0 && (
            <div className="stats-pie-charts">
              <h2>Performance Analytics</h2>
              <div className="pie-charts-grid">
                <div className="pie-chart-container">
                  <h3>Correct vs Incorrect</h3>
                  <div className="pie-chart">
                    {pieChartData.correctVsIncorrect && (
                      <Pie data={pieChartData.correctVsIncorrect} options={pieChartOptions} />
                    )}
                  </div>
                </div>
                
                <div className="pie-chart-container">
                  <h3>Time Performance</h3>
                  <div className="pie-chart">
                    {pieChartData.timePerformance && (
                      <Pie data={pieChartData.timePerformance} options={pieChartOptions} />
                    )}
                  </div>
                </div>
                
                <div className="pie-chart-container">
                  <h3>Speed Distribution</h3>
                  <div className="pie-chart">
                    {pieChartData.speedDistribution && (
                      <Pie data={pieChartData.speedDistribution} options={pieChartOptions} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Charts */}
          {chartData && (
            <div className="stats-charts">
              <div className="chart-container">
                <Bar data={chartData.barChartData} options={barChartOptions} />
              </div>
              <div className="chart-container">
                <Line data={chartData.lineChartData} options={lineChartOptions} />
              </div>
            </div>
          )}
          
          {/* Export and Delete All buttons */}
          {sessions.length > 0 && (
            <div className="data-actions">
              <button 
                className="export-csv-button"
                onClick={() => downloadCSV(sessions)}
              >
                Export as CSV
              </button>
              
              <button 
                className="delete-all-button"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete All Sessions 
              </button>
            </div>
          )}
          
          {/* Delete All Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="delete-confirmation">
              <p>Are you sure you want to delete all your sessions? This action cannot be undone.</p>
              <div className="confirmation-buttons">
                <button 
                  className="confirm-delete-button" 
                  onClick={deleteAllSessions}
                  disabled={deletingAll}
                >
                  {deletingAll ? 'Deleting...' : 'Yes, Delete All'}
                </button>
                <button 
                  className="cancel-button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingAll}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Recent sessions */}
          {sessions.length > 0 ? (
            <div className="recent-sessions">
              <h3>Recent Sessions</h3>
              <div className="sessions-table-container">
                <table className="sessions-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time Taken</th>
                      <th>Target Time</th>
                      <th>Speed</th>
                      <th>Result</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 10).map((session) => (
                      <tr key={session.id}>
                        <td>{new Date(session.created_at).toLocaleDateString()}</td>
                        <td>{formatTime(session.time_taken)}</td>
                        <td>{formatTime(session.preferred_time)}</td>
                        <td className={session.speed}>{session.speed}</td>
                        <td className={session.was_correct ? 'correct' : 'incorrect'}>
                          {session.was_correct ? 'Correct ✓' : 'Incorrect ✗'}
                        </td>
                        <td>
                          <button 
                            onClick={() => deleteSession(session.id)} 
                            className="delete-btn"
                            disabled={deletingId === session.id}
                          >
                            {deletingId === session.id ? '...' : '🗑️'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="no-sessions">
              <p>No sessions recorded yet. Start using the timer to track your progress!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardStats;
