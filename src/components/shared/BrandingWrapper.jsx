import { useAgencyBranding } from '../../hooks/useAgencyBranding';

/**
 * BrandingWrapper - Applies agency branding dynamically
 * This component uses the useAgencyBranding hook to inject
 * CSS variables, update document title, and apply favicon
 */
const BrandingWrapper = ({ children }) => {
    // Apply branding (colors, title, favicon)
    // The hook itself handles skipping public routes
    useAgencyBranding();

    // Simply render children - branding is applied via side effects
    return <>{children}</>;
};

export default BrandingWrapper;
