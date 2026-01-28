import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Agency Service - Multi-tenant detection and branding
 * Detects agency from subdomain, query param, or fallback
 */

const DEFAULT_AGENCY_ID = 'agency_travelpoint';

const DEFAULT_BRANDING = {
    id: DEFAULT_AGENCY_ID,
    name: 'TravelPoint',
    portalName: 'Portal de Cruceros',
    email: 'info@travelpoint.com',
    logoUrl: '/logo_travelpoint_color.png',
    branding: {
        primaryColor: '#3B9FD8'
    },
    footerText: 'Powered by TravelPoint',
    showPoweredBy: true // false for premium white-label plan
};

/**
 * Get agency context from subdomain, query param, or fallback
 * Priority: subdomain > query param > fallback
 */
export function getAgencyContext() {
    try {
        // 1. Try subdomain detection
        const hostname = window.location.hostname;
        const parts = hostname.split('.');

        // If subdomain exists (e.g., travelpoint.miapp.com)
        if (parts.length > 2 && parts[0] !== 'www') {
            const agencySlug = parts[0];
            console.log('[AgencyService] Detected from subdomain:', agencySlug);
            return `agency_${agencySlug}`;
        }

        // 2. Try query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const agencyParam = urlParams.get('agency');

        if (agencyParam) {
            console.log('[AgencyService] Detected from query param:', agencyParam);
            return `agency_${agencyParam}`;
        }

        // 3. Fallback to default
        console.log('[AgencyService] Using fallback agency:', DEFAULT_AGENCY_ID);
        return DEFAULT_AGENCY_ID;
    } catch (error) {
        console.error('[AgencyService] Error detecting agency:', error);
        return DEFAULT_AGENCY_ID;
    }
}

/**
 * Fetch agency branding from Firestore
 * Returns normalized branding object with defaults
 */
export async function fetchAgencyBranding(agencyId) {
    try {
        console.log('[AgencyService] Fetching branding for:', agencyId);

        const agencyRef = doc(db, 'agencies', agencyId);
        const agencySnap = await getDoc(agencyRef);

        if (!agencySnap.exists()) {
            console.warn('[AgencyService] Agency not found, using default branding');
            return DEFAULT_BRANDING;
        }

        const agencyData = agencySnap.data();

        // Normalize branding data with defaults
        const branding = {
            id: agencyId,
            name: agencyData.name || DEFAULT_BRANDING.name,
            portalName: agencyData.portalName || agencyData.name || DEFAULT_BRANDING.portalName,
            email: agencyData.email || DEFAULT_BRANDING.email,
            logoUrl: agencyData.logoUrl || DEFAULT_BRANDING.logoUrl,
            branding: {
                primaryColor: agencyData.branding?.primaryColor || DEFAULT_BRANDING.branding.primaryColor
            },
            footerText: agencyData.footerText || `Powered by ${agencyData.name || 'TravelPoint'}`
        };

        console.log('[AgencyService] Branding loaded:', branding);
        return branding;
    } catch (error) {
        console.error('[AgencyService] Error fetching branding:', error);
        return DEFAULT_BRANDING;
    }
}

/**
 * Get complete agency context with branding
 * Combines detection + fetching
 */
export async function getAgencyWithBranding() {
    const agencyId = getAgencyContext();
    const branding = await fetchAgencyBranding(agencyId);
    return branding;
}
