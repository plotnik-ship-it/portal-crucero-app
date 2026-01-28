import './StatCard.css';

/**
 * StatCard - Modern statistics card component
 * Displays a key metric with icon, value, label, and optional change indicator
 */
const StatCard = ({
    icon,
    label,
    value,
    change,
    changeType = 'neutral', // 'positive', 'negative', 'neutral'
    color = 'primary' // 'primary', 'success', 'warning', 'error', 'info'
}) => {
    const getColorClass = () => {
        switch (color) {
            case 'success': return 'stat-card-success';
            case 'warning': return 'stat-card-warning';
            case 'error': return 'stat-card-error';
            case 'info': return 'stat-card-info';
            default: return 'stat-card-primary';
        }
    };

    const getChangeClass = () => {
        switch (changeType) {
            case 'positive': return 'stat-change-positive';
            case 'negative': return 'stat-change-negative';
            default: return 'stat-change-neutral';
        }
    };

    return (
        <div className={`stat-card ${getColorClass()}`}>
            <div className="stat-icon-wrapper">
                <div className="stat-icon">{icon}</div>
            </div>
            <div className="stat-content">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
                {change && (
                    <div className={`stat-change ${getChangeClass()}`}>
                        {changeType === 'positive' && '↑ '}
                        {changeType === 'negative' && '↓ '}
                        {change}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
