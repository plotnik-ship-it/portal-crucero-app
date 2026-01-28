/**
 * Logging Service
 * Centralizes logging, error tracking, and performance monitoring
 */

const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

class LoggingService {
    constructor() {
        this.logs = [];
        this.maxLogs = 100; // Keep last 100 logs in memory
        this.performanceMarks = new Map();
    }

    /**
     * Log debug information (development only)
     */
    debug(message, data = {}) {
        if (isDevelopment) {
            console.log(`🔍 [DEBUG] ${message}`, data);
            this._addLog(LOG_LEVELS.DEBUG, message, data);
        }
    }

    /**
     * Log informational messages
     */
    info(message, data = {}) {
        console.info(`ℹ️ [INFO] ${message}`, data);
        this._addLog(LOG_LEVELS.INFO, message, data);
    }

    /**
     * Log warnings
     */
    warn(message, data = {}) {
        console.warn(`⚠️ [WARN] ${message}`, data);
        this._addLog(LOG_LEVELS.WARN, message, data);
    }

    /**
     * Log errors
     */
    error(message, error = null, data = {}) {
        console.error(`❌ [ERROR] ${message}`, error, data);

        const errorData = {
            ...data,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            } : null
        };

        this._addLog(LOG_LEVELS.ERROR, message, errorData);

        // Send to external service in production
        if (isProduction) {
            this._sendToExternalService(LOG_LEVELS.ERROR, message, errorData);
        }
    }

    /**
     * Track user events
     */
    trackEvent(eventName, properties = {}) {
        const eventData = {
            event: eventName,
            timestamp: new Date().toISOString(),
            ...properties
        };

        this.debug(`Event: ${eventName}`, eventData);

        // Send to analytics in production
        if (isProduction) {
            this._sendToAnalytics(eventData);
        }
    }

    /**
     * Start performance measurement
     */
    startPerformance(metricName) {
        this.performanceMarks.set(metricName, performance.now());
    }

    /**
     * End performance measurement and log
     */
    endPerformance(metricName, metadata = {}) {
        const startTime = this.performanceMarks.get(metricName);

        if (!startTime) {
            this.warn(`Performance metric "${metricName}" was not started`);
            return;
        }

        const duration = Math.round(performance.now() - startTime);
        this.performanceMarks.delete(metricName);

        this.trackPerformance(metricName, duration, metadata);

        return duration;
    }

    /**
     * Track performance metrics
     */
    trackPerformance(metricName, duration, metadata = {}) {
        const perfData = {
            metric: metricName,
            duration,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        // Log slow operations
        if (duration > 1000) {
            this.warn(`Slow operation: ${metricName} - ${duration}ms`, perfData);
        } else {
            this.debug(`Performance: ${metricName} - ${duration}ms`, perfData);
        }

        // Send to monitoring in production
        if (isProduction) {
            this._sendToPerformanceMonitoring(perfData);
        }
    }

    /**
     * Get recent logs
     */
    getRecentLogs(level = null, limit = 50) {
        let logs = this.logs;

        if (level) {
            logs = logs.filter(log => log.level === level);
        }

        return logs.slice(-limit);
    }

    /**
     * Get error logs only
     */
    getErrors(limit = 20) {
        return this.getRecentLogs(LOG_LEVELS.ERROR, limit);
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
        this.info('Logs cleared');
    }

    /**
     * Export logs as JSON
     */
    exportLogs() {
        const data = {
            exportedAt: new Date().toISOString(),
            environment: import.meta.env.MODE,
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.info('Logs exported');
    }

    /**
     * Private: Add log to memory
     */
    _addLog(level, message, data) {
        const log = {
            level,
            message,
            data,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.logs.push(log);

        // Keep only last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    /**
     * Private: Send to external logging service
     * TODO: Integrate with Sentry, LogRocket, or similar
     */
    _sendToExternalService(level, message, data) {
        // Example: Sentry integration
        // if (window.Sentry) {
        //     window.Sentry.captureException(new Error(message), {
        //         level,
        //         extra: data
        //     });
        // }

        // For now, store in sessionStorage for debugging
        try {
            const errors = JSON.parse(sessionStorage.getItem('production_errors') || '[]');
            errors.push({ level, message, data, timestamp: new Date().toISOString() });
            sessionStorage.setItem('production_errors', JSON.stringify(errors.slice(-20)));
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Private: Send to analytics
     */
    _sendToAnalytics(eventData) {
        // Example: Google Analytics integration
        // if (window.gtag) {
        //     window.gtag('event', eventData.event, eventData);
        // }

        // Example: Custom analytics endpoint
        // fetch('/api/analytics', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(eventData)
        // }).catch(() => {});
    }

    /**
     * Private: Send to performance monitoring
     */
    _sendToPerformanceMonitoring(perfData) {
        // Example: Firebase Performance Monitoring
        // if (window.firebase?.performance) {
        //     const trace = window.firebase.performance().trace(perfData.metric);
        //     trace.putMetric('duration', perfData.duration);
        //     trace.stop();
        // }
    }
}

// Singleton instance
const logger = new LoggingService();

// Global error handler
window.addEventListener('error', (event) => {
    logger.error('Uncaught error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason, {
        promise: event.promise
    });
});

export default logger;

// Convenience exports
export const { debug, info, warn, error, trackEvent, trackPerformance, startPerformance, endPerformance } = logger;
