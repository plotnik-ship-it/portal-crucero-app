import React from 'react';
import PropTypes from 'prop-types';

const BrandingPreview = ({ branding }) => {
    const { logo, primaryColor, portalName } = branding;

    // Calculate derived colors
    const primaryDark = adjustBrightness(primaryColor, -20);

    return (
        <div className="branding-preview">
            <h3 className="preview-title">Live Preview</h3>
            <p className="preview-subtitle">See how your branding will appear</p>

            {/* Header Preview */}
            <div className="preview-card">
                <div
                    className="preview-header"
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 100%)`
                    }}
                >
                    {logo && (
                        <img src={logo} alt="Logo" className="preview-logo" />
                    )}
                    <h4 className="preview-portal-name">{portalName || 'Portal Name'}</h4>
                </div>

                <div className="preview-body">
                    <p className="preview-description">
                        This is how your portal header will appear to users
                    </p>

                    <div className="preview-elements">
                        <button
                            className="preview-button"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Primary Button
                        </button>

                        <button
                            className="preview-button-outline"
                            style={{
                                borderColor: primaryColor,
                                color: primaryColor
                            }}
                        >
                            Secondary Button
                        </button>
                    </div>

                    <div className="preview-link-example">
                        <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            style={{ color: primaryColor }}
                        >
                            Sample Link
                        </a>
                    </div>
                </div>
            </div>

            {/* Badge Preview */}
            <div className="preview-section">
                <h4 className="preview-section-title">Status Badges</h4>
                <div className="preview-badges">
                    <span
                        className="preview-badge"
                        style={{
                            backgroundColor: `${primaryColor}20`,
                            color: primaryDark
                        }}
                    >
                        Active
                    </span>
                    <span className="preview-badge preview-badge-success">
                        Paid
                    </span>
                    <span className="preview-badge preview-badge-warning">
                        Pending
                    </span>
                </div>
            </div>
        </div>
    );
};

// Helper function
function adjustBrightness(color, percent) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 0xFF;
    const g = (num >> 8) & 0xFF;
    const b = num & 0xFF;

    const amt = Math.round(2.55 * percent);
    const newR = Math.max(0, Math.min(255, r + amt));
    const newG = Math.max(0, Math.min(255, g + amt));
    const newB = Math.max(0, Math.min(255, b + amt));

    return '#' + ((1 << 24) + (newR << 16) + (newG << 8) + newB)
        .toString(16)
        .slice(1)
        .toUpperCase();
}

BrandingPreview.propTypes = {
    branding: PropTypes.shape({
        logo: PropTypes.string,
        primaryColor: PropTypes.string.isRequired,
        portalName: PropTypes.string
    }).isRequired
};

export default BrandingPreview;
