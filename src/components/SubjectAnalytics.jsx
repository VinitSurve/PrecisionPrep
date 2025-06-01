import { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Legend, Sector 
} from 'recharts';
import { supabase } from '../supabase/client';

const COLORS = [
  '#3F51B5', '#26A69A', '#4CAF50', '#FF5722', 
  '#9C27B0', '#2196F3', '#00BCD4', '#FFC107',
  '#673AB7', '#03A9F4', '#009688', '#E91E63'
];

const SubjectAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timePerSubject, setTimePerSubject] = useState([]);
  const [sessionCountData, setSessionCountData] = useState([]);
  const [accuracyData, setAccuracyData] = useState([]);
  const [speedData, setSpeedData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeData, setActiveData] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(false);

  // Track window width for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width <= 768); // Consider devices under 768px as mobile/tablet
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Fetch subjects
        const { data: subjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, is_custom')
          .eq('user_id', user.id);
        
        if (subjectsError) throw subjectsError;
        
        if (!subjects || subjects.length === 0) {
          setTimePerSubject([]);
          setSessionCountData([]);
          setLoading(false);
          return;
        }
        
        // Fetch sessions
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id);
        
        if (sessionsError) throw sessionsError;
        
        if (!sessions || sessions.length === 0) {
          setTimePerSubject([]);
          setSessionCountData([]);
          setLoading(false);
          return;
        }
        
        // Process data for time per subject
        const timeData = subjects.map(subject => {
          const subjectSessions = sessions.filter(s => s.subject_id === subject.id);
          const totalTime = subjectSessions.reduce((sum, s) => sum + s.time_taken, 0);
          
          return {
            name: subject.name,
            value: totalTime,
            seconds: totalTime,
            minutes: parseFloat((totalTime / 60).toFixed(2)),
            formattedTime: formatTime(totalTime),
            isCustom: subject.is_custom
          };
        }).filter(item => item.value > 0);
        
        // Sort by time spent (descending)
        timeData.sort((a, b) => b.value - a.value);
        
        // Process data for session count per subject
        const countData = subjects.map(subject => {
          const count = sessions.filter(s => s.subject_id === subject.id).length;
          
          return {
            name: subject.name,
            value: count,
            sessions: count,
            isCustom: subject.is_custom
          };
        }).filter(item => item.value > 0);
        
        // Sort by session count (descending)
        countData.sort((a, b) => b.value - a.value);
        
        // Process data for accuracy per subject
        const accuracyData = subjects.map(subject => {
          const subjectSessions = sessions.filter(s => s.subject_id === subject.id);
          if (subjectSessions.length === 0) return null;
          
          const correct = subjectSessions.filter(s => s.was_correct).length;
          const accuracy = parseFloat((correct / subjectSessions.length * 100).toFixed(1));
          
          return {
            name: subject.name,
            value: accuracy,
            accuracy: accuracy,
            correct,
            total: subjectSessions.length,
            isCustom: subject.is_custom
          };
        }).filter(Boolean).filter(item => item.total > 0);
        
        // Sort by accuracy (descending)
        accuracyData.sort((a, b) => b.value - a.value);
        
        // Process data for fast vs slow per subject
        const speedData = subjects.map(subject => {
          const subjectSessions = sessions.filter(s => s.subject_id === subject.id);
          if (subjectSessions.length === 0) return null;
          
          const fast = subjectSessions.filter(s => s.speed === 'fast').length;
          const fastPercentage = parseFloat((fast / subjectSessions.length * 100).toFixed(1));
          
          return {
            name: subject.name,
            value: fastPercentage,
            fastPercentage,
            fast,
            total: subjectSessions.length,
            isCustom: subject.is_custom
          };
        }).filter(Boolean).filter(item => item.total > 0);
        
        // Sort by fast percentage (descending)
        speedData.sort((a, b) => b.value - a.value);
        
        setTimePerSubject(timeData);
        setSessionCountData(countData);
        setAccuracyData(accuracyData);
        setSpeedData(speedData);
        
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  // Format time in seconds to mm:ss
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Active shape for pie chart hover - simplified without text
  const renderActiveShape = (props) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill
    } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  // Event handlers for pie chart that work for both hover and click/touch
  const handlePieEnter = (_, index) => {
    setActiveIndex(index);
    setActiveData(_?.payload);
  };
  
  const handlePieLeave = () => {
    // On mobile, don't clear selection on leave to improve UX
    if (!isMobile) {
      setActiveIndex(null);
      setActiveData(null);
    }
  };
  
  // Special handler for pie clicking (needed for mobile)
  const handlePieClick = (data, index) => {
    if (activeIndex === index) {
      // If clicking the same slice, clear selection (toggle behavior)
      setActiveIndex(null);
      setActiveData(null);
    } else {
      setActiveIndex(index);
      setActiveData(data?.payload);
    }
  };

  // Clear selection when tapping elsewhere (improves mobile UX)
  const handleContainerClick = (e) => {
    // Only act if we're on mobile and clicked directly on the container
    // (not on a chart element)
    if (isMobile && e.target === e.currentTarget) {
      setActiveIndex(null);
      setActiveData(null);
    }
  };

  // Get pie chart height based on screen size
  const getPieHeight = () => {
    if (windowWidth <= 576) {
      return 220; // Mobile
    } else if (windowWidth <= 992) {
      return 240; // Tablet
    }
    return 260; // Desktop
  };

  // Custom legend component with click/touch support
  const CustomizedLegend = ({ payload, chartType }) => {
    return (
      <ul className="chart-legend">
        {payload.map((entry, index) => (
          <li 
            key={`legend-${index}`} 
            className={`legend-item ${activeIndex === index ? 'active' : ''}`}
            onClick={() => {
              if (activeIndex === index) {
                setActiveIndex(null);
                setActiveData(null);
              } else {
                setActiveIndex(index);
                setActiveData(getDataForType(chartType)[index]);
              }
            }}
          >
            <span 
              className="legend-color" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="legend-label">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  // Helper to get data based on chart type
  const getDataForType = (type) => {
    switch(type) {
      case 'time': return timePerSubject;
      case 'sessions': return sessionCountData;
      case 'accuracy': return accuracyData;
      case 'speed': return speedData;
      default: return [];
    }
  };

  // Display active data in outbox
  const renderDataOutbox = (dataType) => {
    let data = null;
    
    switch(dataType) {
      case 'time':
        data = activeIndex !== null && timePerSubject[activeIndex];
        break;
      case 'sessions':
        data = activeIndex !== null && sessionCountData[activeIndex];
        break;
      case 'accuracy':
        data = activeIndex !== null && accuracyData[activeIndex];
        break;
      case 'speed':
        data = activeIndex !== null && speedData[activeIndex];
        break;
      default:
        return null;
    }
    
    if (!data) {
      return (
        <div className="data-outbox">
          <p className="outbox-prompt">
            {isMobile 
              ? "Tap on chart segments or legend items for details" 
              : "Hover over chart segments for details"}
          </p>
        </div>
      );
    }
    
    return (
      <div className="data-outbox">
        <h4>{data.name}</h4>
        {dataType === 'time' && (
          <>
            <p><strong>Total Time:</strong> {data.formattedTime}</p>
            <p><strong>Minutes:</strong> {data.minutes}</p>
          </>
        )}
        {dataType === 'sessions' && (
          <p><strong>Total Sessions:</strong> {data.sessions}</p>
        )}
        {dataType === 'accuracy' && (
          <>
            <p><strong>Accuracy:</strong> {data.accuracy}%</p>
            <p><strong>Correct:</strong> {data.correct} of {data.total}</p>
          </>
        )}
        {dataType === 'speed' && (
          <>
            <p><strong>Fast Solutions:</strong> {data.fastPercentage}%</p>
            <p><strong>Fast Count:</strong> {data.fast} of {data.total}</p>
          </>
        )}
      </div>
    );
  };

  const pieHeight = getPieHeight();
  const outerRadius = windowWidth <= 576 ? 70 : windowWidth <= 992 ? 75 : 80;

  if (loading) {
    return <div className="loading">Loading subject analytics...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (timePerSubject.length === 0 && sessionCountData.length === 0) {
    return (
      <div className="no-data-message">
        <h2>No subject data available</h2>
        <p>Start using the Subject Timer to track your progress across subjects!</p>
      </div>
    );
  }

  return (
    <div className="subject-analytics-container">
      <h2>Subject Analytics</h2>
      <p className="analytics-description">
        View detailed insights about your performance across different subjects.
      </p>
      
      <div className="analytics-grid">
        {/* Time spent per subject */}
        <div className="analytics-card">
          <h3>Time Spent Per Subject</h3>
          <div className="chart-layout" onClick={handleContainerClick}>
            <div className="chart-container">
              {timePerSubject.length > 0 ? (
                <ResponsiveContainer width="100%" height={pieHeight}>
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={timePerSubject}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={outerRadius}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data, index) => handlePieClick(data, index)}
                      onMouseEnter={!isMobile ? handlePieEnter : undefined}
                      onMouseLeave={!isMobile ? handlePieLeave : undefined}
                      // Remove tooltip by setting isAnimationActive to false
                      isAnimationActive={false}
                    >
                      {timePerSubject.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Legend 
                      content={<CustomizedLegend payload={timePerSubject.map((entry, index) => ({
                        value: entry.name,
                        color: COLORS[index % COLORS.length]
                      }))} chartType="time" />}
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                    />
                    {/* Remove the Tooltip component completely */}
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">No time data available</div>
              )}
            </div>
            {renderDataOutbox('time')}
          </div>
        </div>
        
        {/* Session count per subject */}
        <div className="analytics-card">
          <h3>Sessions Per Subject</h3>
          <div className="chart-layout" onClick={handleContainerClick}>
            <div className="chart-container">
              {sessionCountData.length > 0 ? (
                <ResponsiveContainer width="100%" height={pieHeight}>
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={sessionCountData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={outerRadius}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data, index) => handlePieClick(data, index)}
                      onMouseEnter={!isMobile ? handlePieEnter : undefined}
                      onMouseLeave={!isMobile ? handlePieLeave : undefined}
                      // Remove tooltip by setting isAnimationActive to false
                      isAnimationActive={false}
                    >
                      {sessionCountData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Legend 
                      content={<CustomizedLegend payload={sessionCountData.map((entry, index) => ({
                        value: entry.name,
                        color: COLORS[index % COLORS.length]
                      }))} chartType="sessions" />}
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                    />
                    {/* Remove the Tooltip component completely */}
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">No session data available</div>
              )}
            </div>
            {renderDataOutbox('sessions')}
          </div>
        </div>
        
        {/* Accuracy per subject */}
        <div className="analytics-card">
          <h3>Accuracy Per Subject</h3>
          <div className="chart-layout" onClick={handleContainerClick}>
            <div className="chart-container">
              {accuracyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={pieHeight}>
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={accuracyData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={outerRadius}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data, index) => handlePieClick(data, index)}
                      onMouseEnter={!isMobile ? handlePieEnter : undefined}
                      onMouseLeave={!isMobile ? handlePieLeave : undefined}
                      // Remove tooltip by setting isAnimationActive to false
                      isAnimationActive={false}
                    >
                      {accuracyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Legend 
                      content={<CustomizedLegend payload={accuracyData.map((entry, index) => ({
                        value: entry.name,
                        color: COLORS[index % COLORS.length]
                      }))} chartType="accuracy" />}
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                    />
                    {/* Remove the Tooltip component completely */}
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">No accuracy data available</div>
              )}
            </div>
            {renderDataOutbox('accuracy')}
          </div>
        </div>
        
        {/* Speed performance per subject */}
        <div className="analytics-card">
          <h3>Speed Performance Per Subject</h3>
          <div className="chart-layout" onClick={handleContainerClick}>
            <div className="chart-container">
              {speedData.length > 0 ? (
                <ResponsiveContainer width="100%" height={pieHeight}>
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={speedData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={outerRadius}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data, index) => handlePieClick(data, index)}
                      onMouseEnter={!isMobile ? handlePieEnter : undefined}
                      onMouseLeave={!isMobile ? handlePieLeave : undefined}
                      // Remove tooltip by setting isAnimationActive to false
                      isAnimationActive={false}
                    >
                      {speedData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Legend 
                      content={<CustomizedLegend payload={speedData.map((entry, index) => ({
                        value: entry.name,
                        color: COLORS[index % COLORS.length]
                      }))} chartType="speed" />}
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                    />
                    {/* Remove the Tooltip component completely */}
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">No speed data available</div>
              )}
            </div>
            {renderDataOutbox('speed')}
          </div>
        </div>
      </div>
      
      {/* Explanation section */}
      <div className="analytics-explanation">
        <h3>Understanding Your Analytics</h3>
        <ul>
          <li><strong>Time Spent</strong>: Shows the distribution of your study time across subjects</li>
          <li><strong>Sessions</strong>: Shows which subjects you have practiced the most</li>
          <li><strong>Accuracy</strong>: Compares your correct answer rate across subjects</li>
          <li><strong>Speed Performance</strong>: Shows which subjects you solve problems within the target time</li>
        </ul>
        <p>
          {isMobile
            ? "Tap on chart segments or legend items to view details."
            : "Click or hover over chart segments to view details."}
        </p>
      </div>
    </div>
  );
};

export default SubjectAnalytics;
