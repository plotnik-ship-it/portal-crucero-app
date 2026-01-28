import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { isValidHexColor } from '../../../hooks/useAgencyBranding';

const PRESET_COLORS = [
    { name: 'Corporate Teal', value: '#0F766E' },
    { name: 'Navy Blue', value: '#1E3A8A' },
    { name: 'Royal Purple', value: '#7C3AED' },
    { name: 'Forest Green', value: '#16A34A' },
    { name: 'Crimson Red', value: '#DC2626' },
    { name: 'Sunset Orange', value: '#EA580C' },
];

const ColorPicker = ({ value, onChange }) => {
    const [customColor, setCustomColor] = useState(value);
    const [error, setError] = useState(null);

    const handlePresetClick = (color) => {
        setCustomColor(color);
        setError(null);
        onChange(color);
    };

    const handleColorInputChange = (e) => {
        const color = e.target.value;
        setCustomColor(color);
        onChange(color);
        setError(null);
    };

    const handleTextInputChange = (e) => {
        let color = e.target.value.trim();

        // Add # if missing
        if (color && !color.startsWith('#')) {
            color = '#' + color;
        }

        setCustomColor(color);

        // Validate
        if (color && !isValidHexColor(color)) {
            setError('Invalid hex color format (e.g., #0F766E)');
        } else {
            setError(null);
            if (color) {
                onChange(color);
            }
        }
    };

    return (
        <div className="color-picker">
            <div className="color-presets">
                {PRESET_COLORS.map(({ name, value: presetValue }) => (
                    <button
                        key={presetValue}
                        type="button"
                        className={`color-preset ${value === presetValue ? 'active' : ''}`}
                        style={{ backgroundColor: presetValue }}
                        onClick={() => handlePresetClick(presetValue)}
                        title={name}
                        aria-label={name}
                    >
                        {value === presetValue && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>

            <div className="color-custom">
                <div className="color-input-group">
                    <label htmlFor="color-picker-input" className="color-label">
                        Custom Color
                    </label>
                    <div className="color-inputs">
                        <input
                            id="color-picker-input"
                            type="color"
                            value={customColor}
                            onChange={handleColorInputChange}
                            className="color-input-native"
                        />
                        <input
                            type="text"
                            value={customColor}
                            onChange={handleTextInputChange}
                            placeholder="#0F766E"
                            className="color-input-text"
                            maxLength={7}
                        />
                    </div>
                </div>

                {error && (
                    <div className="color-error">
                        {error}
                    </div>
                )}

                <div className="color-preview" style={{ backgroundColor: customColor }}>
                    <span style={{
                        color: getContrastColor(customColor),
                        fontSize: '0.75rem',
                        fontWeight: '500'
                    }}>
                        Preview
                    </span>
                </div>
            </div>
        </div>
    );
};

// Helper function for contrast
function getContrastColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

ColorPicker.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

export default ColorPicker;
