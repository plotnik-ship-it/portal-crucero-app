import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

const LogoUpload = ({ currentLogo, onUpload, loading }) => {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(currentLogo);
    const [error, setError] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError(null);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('File size must be less than 2MB');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload
        onUpload(file);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemove = () => {
        setPreview(null);
        onUpload(null);
    };

    return (
        <div className="logo-upload">
            <div className="logo-preview">
                {preview ? (
                    <img src={preview} alt="Agency Logo" className="logo-image" />
                ) : (
                    <div className="logo-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>No logo uploaded</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="logo-error">
                    {error}
                </div>
            )}

            <div className="logo-actions">
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleClick}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="spinner-sm"></span>
                            Uploading...
                        </>
                    ) : (
                        <>
                            {preview ? '📝 Change Logo' : '📤 Upload Logo'}
                        </>
                    )}
                </button>

                {preview && !loading && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleRemove}
                    >
                        🗑️ Remove
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

LogoUpload.propTypes = {
    currentLogo: PropTypes.string,
    onUpload: PropTypes.func.isRequired,
    loading: PropTypes.bool
};

export default LogoUpload;
