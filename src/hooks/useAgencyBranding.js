import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAgency } from '../contexts/AgencyContext';

/**
 * Hook to apply agency branding dynamically
 * Loads branding and applies CSS variables, title, and favicon
 */
export function useAgencyBranding() {
    const location = useLocation();
    const { branding } = useAgency();

    // Public routes that don't need branding
    const publicRoutes = ['/login', '/login-v2', '/forgot-password', '/request-access', '/design-preview'];
    const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));

    useEffect(() => {
        // Skip applying branding on public routes
        if (isPublicRoute || !branding) {
            return;
        }

        const { primaryColor, portalName, favicon } = branding;

        // Apply primary color as CSS variable
        if (primaryColor) {
            document.documentElement.style.setProperty('--color-primary', primaryColor);

            // Calculate and apply derived colors
            const primaryDark = adjustBrightness(primaryColor, -20);
            const primaryLight = adjustBrightness(primaryColor, 80);
            const primaryHover = adjustBrightness(primaryColor, 10);

            document.documentElement.style.setProperty('--color-primary-dark', primaryDark);
            document.documentElement.style.setProperty('--color-primary-light', primaryLight);
            document.documentElement.style.setProperty('--color-primary-hover', primaryHover);
        }

        // Update document title
        if (portalName) {
            document.title = portalName;
        }

        // Update favicon
        if (favicon) {
            updateFavicon(favicon);
        }
    }, [branding, isPublicRoute]);

    return branding;
};

/**
 * Adjust color brightness
 * @param {string} color - Hex color code
 * @param {number} percent - Brightness adjustment (-100 to 100)
 * @returns {string} Adjusted hex color
 */
function adjustBrightness(color, percent) {
    // Validate input
    if (!color || typeof color !== 'string') {
        console.warn('Invalid color provided to adjustBrightness:', color);
        return '#000000'; // Return black as fallback
    }

    // Remove # if present
    const hex = color.replace('#', '');

    // Convert to RGB
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 0xFF;
    const g = (num >> 8) & 0xFF;
    const b = num & 0xFF;

    // Adjust brightness
    const amt = Math.round(2.55 * percent);
    const newR = Math.max(0, Math.min(255, r + amt));
    const newG = Math.max(0, Math.min(255, g + amt));
    const newB = Math.max(0, Math.min(255, b + amt));

    // Convert back to hex
    return '#' + ((1 << 24) + (newR << 16) + (newG << 8) + newB)
        .toString(16)
        .slice(1)
        .toUpperCase();
}

/**
 * Update favicon dynamically
 * @param {string} faviconUrl - URL of favicon image
 */
function updateFavicon(faviconUrl) {
    // Remove existing favicon
    const existingFavicon = document.querySelector("link[rel~='icon']");
    if (existingFavicon) {
        existingFavicon.remove();
    }

    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;

    // Add to document head
    document.head.appendChild(link);
}

/**
 * Get contrast color (black or white) for a given background color
 * Useful for ensuring text readability
 * @param {string} hexColor - Background hex color
 * @returns {string} '#000000' or '#FFFFFF'
 */
export function getContrastColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Validate hex color format
 * @param {string} color - Color string to validate
 * @returns {boolean} True if valid hex color
 */
export function isValidHexColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
}
