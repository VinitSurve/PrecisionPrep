import React from 'react';
import '../styles/TabSwitchAlert.css';

const TabSwitchAlert = ({ onClose, onReset }) => {
  const handleReset = () => {
    onReset();
    onClose();
  };
  
  return (
    <div className="tab-switch-overlay">
      <div className="tab-switch-modal">
        <div className="tab-switch-icon">⚠️</div>
        <h2>Timer Stopped!</h2>
        <p>Your timer was stopped because you switched to another tab.</p>
        <p className="tab-switch-explanation">
          To maintain integrity of your study sessions, the timer automatically stops
          when you navigate away from this tab.
        </p>
        <div className="tab-switch-actions">
          <button onClick={handleReset} className="tab-switch-reset">
            Reset Timer
          </button>
          <button onClick={onClose} className="tab-switch-close">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabSwitchAlert;
