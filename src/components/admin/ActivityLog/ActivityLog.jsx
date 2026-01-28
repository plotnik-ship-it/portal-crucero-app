import React, { useState, useEffect } from 'react';
import { useAgency } from '../../../contexts/AgencyContext';
import {
    getActivityLogs,
    formatActivityMessage,
    getActivityIcon,
    getSeverityColor,
    formatActivityTime,
    ACTIVITY_CATEGORIES
} from '../../../services/activityLogService';
import ActivityLogFilters from './ActivityLogFilters';
import ActivityLogEntry from './ActivityLogEntry';
import './ActivityLog.css';

const ActivityLog = () => {
    const { agency } = useAgency();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!agency) return;

        loadLogs();
    }, [agency, filters]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const activityLogs = await getActivityLogs(agency.id, filters);
            setLogs(activityLogs);
        } catch (err) {
            console.error('Error loading activity logs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadLogs();
    };

    if (!agency) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="activity-log">
            <div className="activity-log-header">
                <div>
                    <h1>Activity Log</h1>
                    <p className="text-muted">Complete audit trail of all actions in your agency</p>
                </div>
                <button className="btn btn-secondary" onClick={handleRefresh}>
                    🔄 Refresh
                </button>
            </div>

            <ActivityLogFilters
                filters={filters}
                onFiltersChange={setFilters}
            />

            {error && (
                <div className="alert alert-error">
                    Error loading activity logs: {error}
                </div>
            )}

            <div className="activity-timeline">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading activity...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h3>No Activity Found</h3>
                        <p>No activities match your current filters</p>
                    </div>
                ) : (
                    <>
                        <div className="activity-count">
                            Showing {logs.length} activit{logs.length === 1 ? 'y' : 'ies'}
                        </div>
                        {logs.map(log => (
                            <ActivityLogEntry key={log.id} log={log} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
