import { getStatusColor, getStatusLabel } from '../../utils/formatters';

const Badge = ({ status, children }) => {
    const color = getStatusColor(status);
    const label = children || getStatusLabel(status);

    return (
        <span className={`badge badge-${color}`}>
            {label}
        </span>
    );
};

export default Badge;
