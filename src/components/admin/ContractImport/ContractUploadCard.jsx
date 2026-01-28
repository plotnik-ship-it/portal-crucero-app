/**
 * Contract Upload Card
 * Drag-drop or file picker for PDF upload
 */

import { useState, useRef } from 'react';

function ContractUploadCard({ onFileSelect, locale = 'en' }) {
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFile = (file) => {
        if (file.type !== 'application/pdf') {
            alert(locale === 'es'
                ? 'Por favor selecciona un archivo PDF'
                : 'Please select a PDF file');
            return;
        }

        setFileName(file.name);
        onFileSelect(file);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className={`upload-card ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInput}
                style={{ display: 'none' }}
            />

            <div className="upload-icon">📄</div>

            <h3>
                {locale === 'es'
                    ? 'Arrastra un PDF aquí'
                    : 'Drag a PDF here'}
            </h3>

            <p className="upload-hint">
                {locale === 'es'
                    ? 'o haz clic para seleccionar'
                    : 'or click to select'}
            </p>

            <div className="upload-formats">
                <span className="format-badge">PDF</span>
                <span className="format-info">
                    {locale === 'es'
                        ? 'Confirmaciones de cruceros'
                        : 'Cruise confirmations'}
                </span>
            </div>

            {fileName && (
                <div className="selected-file">
                    <span className="file-icon">📎</span>
                    <span className="file-name">{fileName}</span>
                </div>
            )}
        </div>
    );
}

export default ContractUploadCard;
