import React from 'react';

function getTimeElapsed(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

const AlertCard = ({ event, onClick }) => {
    const pinColors = {
        High: '#f97316', // Orange-ish in screenshot
        Medium: '#eab308', // Yellow-ish
        Low: '#22c55e', // Green
    };

    const color = pinColors[event.risk] || '#64748b';

    return (
        <div className="alert-card" onClick={() => onClick && onClick(event)}>
            <div className="alert-content-row">
                <div className="pin-icon" style={{ color }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                </div>
                <div className="alert-main-info">
                    <div className="time-ago">
                        <span className="time-text" style={{ color: '#60a5fa' }}>{getTimeElapsed(event.time)}</span>
                        <span className="magnitude-text" style={{ color: '#94a3b8' }}>{event.magnitude} mag &bull; {event.depth}km depth</span>
                    </div>
                    <div className="place-name">
                        <a href="#" className="location-link" style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{event.place}</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertCard;
