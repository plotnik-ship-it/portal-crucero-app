import React from 'react';
import PropTypes from 'prop-types';
import {
    formatActivityMessage,
    getActivityIcon,
    getSeverityColor,
    formatActivityTime
} from '../../../services/activityLogService';

const ActivityLogEntry = ({ log }) => {
    const {
        action,
        userName,
        userEmail,
        entityType,
        entityName,
        details,
        severity,
        timestamp
    } = log;

    const message = formatActivityMessage(log);
    const icon = getActivityIcon(action);
    const severityClass = getSeverityColor(severity);
    const timeAgo = formatActivityTime(timestamp);

    return (
        <div className={`activity-entry ${severityClass}`}>
            <div className="activity-icon">
                {icon}
            </div>

            <div className="activity-content">
                <div className="activity-main">
                    <div className="activity-message">{message}</div>
                    <div className="activity-time">{timeAgo}</div>
                </div>

                {details && Object.keys(details).length > 0 && (
                    <div className="activity-details">
                        {details.amount && (
                            <span className="detail-badge">
                                💵 ${details.amount}
                            </span>
                        )}
                        {details.method && (
                            <span className="detail-badge">
                                {details.method}
                            </span>
                        )}
                        {details.previousBalance !== undefined && details.newBalance !== undefined && (
                            <span className="detail-badge">
                                Balance: ${details.previousBalance} → ${details.newBalance}
                            </span>
                        )}
                        {details.cabinNumber && (
                            <span className="detail-badge">
                                🛏️ Cabin {details.cabinNumber}
                            </span>
                        )}
                        {details.groupId && (
                            <span className="detail-badge">
                                👥 Group
                            </span>
                        )}
                    </div>
                )}

                <div className="activity-meta">
                    <span className="meta-user">{userEmail}</span>
                    {entityType && entityName && (
                        <span className="meta-entity">
                            {entityType}: {entityName}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

ActivityLogEntry.propTypes = {
    log: PropTypes.shape({
        action: PropTypes.string.isRequired,
        userName: PropTypes.string.isRequired,
        userEmail: PropTypes.string.isRequired,
        entityType: PropTypes.string,
        entityName: PropTypes.string,
        details: PropTypes.object,
        severity: PropTypes.string.isRequired,
        timestamp: PropTypes.object
    }).isRequired
};

export default ActivityLogEntry;
