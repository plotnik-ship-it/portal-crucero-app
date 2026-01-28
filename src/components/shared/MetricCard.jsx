import './MetricCard.css';

/**
 * Reusable metric card component for analytics
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Main value to display
 * @param {string} props.icon - Emoji icon
 * @param {string} props.color - Color theme (primary, success, warning, danger)
 * @param {string} props.subtitle - Optional subtitle
 * @param {string} props.trend - Optional trend indicator (up, down, neutral)
 */
const MetricCard = ({
    title,
    value,
    icon = '📊',
    color = 'primary',
    subtitle,
    trend
}) => {
    const getTrendIcon = () => {
        if (trend === 'up') return '📈';
        if (trend === 'down') return '📉';
        return '';
    };

    return (
        <div className={`metric-card metric-card-${color}`}>
            <div className="metric-card-header">
                <span className="metric-icon">{icon}</span>
                <h3 className="metric-title">{title}</h3>
            </div>
            <div className="metric-card-body">
                <p className="metric-value">{value}</p>
                {subtitle && (
                    <p className="metric-subtitle">
                        {getTrendIcon()} {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MetricCard;
