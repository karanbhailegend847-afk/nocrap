
export default function SOSButton({ onClick }) {
  return (
    <button 
      className="sos-float-btn" 
      onClick={onClick}
      aria-label="Emergency Urge Interrupt"
    >
      <div className="sos-pulse-ring" />
      <span style={{ position: 'relative', zIndex: 2 }}>SOS</span>
    </button>
  );
}
