import './Skeleton.css';

/**
 * Skeleton loading component for better UX
 * @param {Object} props
 * @param {string} props.variant - 'text', 'title', 'card', 'avatar', 'button', 'table-row'
 * @param {number} props.width - Width in pixels or percentage
 * @param {number} props.height - Height in pixels
 * @param {number} props.count - Number of skeleton elements to render
 * @param {string} props.className - Additional CSS classes
 */
const Skeleton = ({
    variant = 'text',
    width,
    height,
    count = 1,
    className = ''
}) => {
    const getSkeletonStyle = () => {
        const baseStyle = {};

        if (width) {
            baseStyle.width = typeof width === 'number' ? `${width}px` : width;
        }

        if (height) {
            baseStyle.height = `${height}px`;
        }

        return baseStyle;
    };

    const getVariantClass = () => {
        const variants = {
            text: 'skeleton-text',
            title: 'skeleton-title',
            card: 'skeleton-card',
            avatar: 'skeleton-avatar',
            button: 'skeleton-button',
            'table-row': 'skeleton-table-row'
        };

        return variants[variant] || 'skeleton-text';
    };

    const skeletonClass = `skeleton ${getVariantClass()} ${className}`;

    if (count > 1) {
        return (
            <>
                {Array.from({ length: count }).map((_, index) => (
                    <div
                        key={index}
                        className={skeletonClass}
                        style={getSkeletonStyle()}
                    />
                ))}
            </>
        );
    }

    return (
        <div
            className={skeletonClass}
            style={getSkeletonStyle()}
        />
    );
};

/**
 * Skeleton for card content
 */
export const SkeletonCard = () => (
    <div className="card">
        <div className="card-header">
            <Skeleton variant="title" width="60%" />
        </div>
        <div className="card-body">
            <Skeleton variant="text" count={3} />
        </div>
    </div>
);

/**
 * Skeleton for table rows
 */
export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
    <div className="table-container">
        <table className="table">
            <thead>
                <tr>
                    {Array.from({ length: columns }).map((_, i) => (
                        <th key={i}>
                            <Skeleton variant="text" width="80%" />
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <td key={colIndex}>
                                <Skeleton variant="text" width="90%" />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/**
 * Skeleton for family list
 */
export const SkeletonFamilyList = ({ count = 5 }) => (
    <div className="space-y-md">
        {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="card">
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Skeleton variant="avatar" />
                    <div style={{ flex: 1 }}>
                        <Skeleton variant="title" width="40%" />
                        <Skeleton variant="text" width="60%" />
                    </div>
                    <Skeleton variant="button" width={100} />
                </div>
            </div>
        ))}
    </div>
);

export default Skeleton;
