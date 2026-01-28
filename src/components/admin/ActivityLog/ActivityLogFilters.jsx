import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ACTIVITY_CATEGORIES, ACTIVITY_TYPES, SEVERITY_LEVELS } from '../../../services/activityLogService';

const ActivityLogFilters = ({ filters, onFiltersChange }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);

    const handleFilterChange = (key, value) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
    };

    const handleApplyFilters = () => {
        onFiltersChange(localFilters);
    };

    const handleClearFilters = () => {
        setLocalFilters({});
        onFiltersChange({});
    };

    const activeFilterCount = Object.values(localFilters).filter(v => v).length;

    return (
        <div className="activity-filters">
            <div className="filters-header">
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    🔍 Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>

                {activeFilterCount > 0 && (
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleClearFilters}
                    >
                        ✕ Clear
                    </button>
                )}
            </div>

            {showFilters && (
                <div className="filters-panel">
                    <div className="filters-grid">
                        {/* Category Filter */}
                        <div className="filter-group">
                            <label htmlFor="filter-category">Category</label>
                            <select
                                id="filter-category"
                                value={localFilters.actionCategory || ''}
                                onChange={(e) => handleFilterChange('actionCategory', e.target.value)}
                            >
                                <option value="">All Categories</option>
                                <option value={ACTIVITY_CATEGORIES.PAYMENT}>💰 Payments</option>
                                <option value={ACTIVITY_CATEGORIES.FAMILY}>👨‍👩‍👧‍👦 Families</option>
                                <option value={ACTIVITY_CATEGORIES.GROUP}>👥 Groups</option>
                                <option value={ACTIVITY_CATEGORIES.DOCUMENT}>📄 Documents</option>
                                <option value={ACTIVITY_CATEGORIES.SETTINGS}>🎨 Settings</option>
                                <option value={ACTIVITY_CATEGORIES.AUTH}>🔐 Authentication</option>
                            </select>
                        </div>

                        {/* Severity Filter */}
                        <div className="filter-group">
                            <label htmlFor="filter-severity">Severity</label>
                            <select
                                id="filter-severity"
                                value={localFilters.severity || ''}
                                onChange={(e) => handleFilterChange('severity', e.target.value)}
                            >
                                <option value="">All Levels</option>
                                <option value={SEVERITY_LEVELS.INFO}>ℹ️ Info</option>
                                <option value={SEVERITY_LEVELS.WARNING}>⚠️ Warning</option>
                                <option value={SEVERITY_LEVELS.CRITICAL}>🚨 Critical</option>
                            </select>
                        </div>

                        {/* Limit Filter */}
                        <div className="filter-group">
                            <label htmlFor="filter-limit">Show</label>
                            <select
                                id="filter-limit"
                                value={localFilters.limitCount || 50}
                                onChange={(e) => handleFilterChange('limitCount', parseInt(e.target.value))}
                            >
                                <option value={20}>Last 20</option>
                                <option value={50}>Last 50</option>
                                <option value={100}>Last 100</option>
                                <option value={200}>Last 200</option>
                            </select>
                        </div>
                    </div>

                    <div className="filters-actions">
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleApplyFilters}
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

ActivityLogFilters.propTypes = {
    filters: PropTypes.object.isRequired,
    onFiltersChange: PropTypes.func.isRequired
};

export default ActivityLogFilters;
