/**
 * Accept Invite Page
 * 
 * Handles team invite acceptance via URL parameters.
 * Requires authentication - redirects to login if not signed in.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { acceptTeamInvite, parseInviteParams } from '../../services/teamService';
import './AcceptInvite.css';

const AcceptInvite = () => {
    const { t } = useTranslation();
    const { user, loading: authLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // State
    const [status, setStatus] = useState('loading'); // loading, not_signed_in, accepting, success, error
    const [error, setError] = useState(null);

    // Parse invite params
    const inviteParams = parseInviteParams(searchParams);

    useEffect(() => {
        // Wait for auth to load
        if (authLoading) {
            setStatus('loading');
            return;
        }

        // Check if params are valid
        if (!inviteParams) {
            setStatus('error');
            setError(t('team.invalidLink', 'Invalid invite link'));
            return;
        }

        // Not signed in - prompt to login
        if (!user) {
            setStatus('not_signed_in');
            return;
        }

        // User is signed in - accept invite
        const acceptInvite = async () => {
            setStatus('accepting');

            try {
                await acceptTeamInvite(inviteParams);
                setStatus('success');
            } catch (err) {
                console.error('Accept invite error:', err);
                setStatus('error');
                setError(t('team.invalidOrExpired', 'Invalid or expired invite'));
            }
        };

        acceptInvite();
    }, [user, authLoading, inviteParams, t]);

    // Build login URL with return path
    const getLoginUrl = () => {
        const currentUrl = window.location.pathname + window.location.search;
        return `/login?returnUrl=${encodeURIComponent(currentUrl)}`;
    };

    // Render loading state
    if (status === 'loading' || status === 'accepting') {
        return (
            <div className="accept-invite-page">
                <div className="accept-invite-card">
                    <div className="accept-invite-loading">
                        <div className="spinner"></div>
                        <p>
                            {status === 'accepting'
                                ? t('team.accepting', 'Accepting invite...')
                                : t('common.loading', 'Loading...')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Render not signed in state
    if (status === 'not_signed_in') {
        return (
            <div className="accept-invite-page">
                <div className="accept-invite-card">
                    <div className="accept-invite-icon">🔐</div>
                    <h2>{t('team.signInRequired', 'Sign In Required')}</h2>
                    <p>
                        {t('team.signInToAccept', 'Please sign in to accept this team invite.')}
                    </p>
                    <Link to={getLoginUrl()} className="btn-primary">
                        {t('auth.signIn', 'Sign In')}
                    </Link>
                    <p className="accept-invite-hint">
                        {t('team.noAccount', "Don't have an account?")} {' '}
                        <Link to="/signup">{t('auth.signUp', 'Sign Up')}</Link>
                    </p>
                </div>
            </div>
        );
    }

    // Render success state
    if (status === 'success') {
        return (
            <div className="accept-invite-page">
                <div className="accept-invite-card success">
                    <div className="accept-invite-icon">✅</div>
                    <h2>{t('team.inviteAccepted', 'Invite Accepted!')}</h2>
                    <p>
                        {t('team.canAccessPortal', 'You can now access the portal.')}
                    </p>
                    <button
                        onClick={() => navigate('/admin')}
                        className="btn-primary"
                    >
                        {t('team.goToPortal', 'Go to Portal')}
                    </button>
                </div>
            </div>
        );
    }

    // Render error state
    return (
        <div className="accept-invite-page">
            <div className="accept-invite-card error">
                <div className="accept-invite-icon">❌</div>
                <h2>{t('team.inviteError', 'Unable to Accept Invite')}</h2>
                <p>
                    {error || t('team.invalidOrExpired', 'Invalid or expired invite')}
                </p>
                <Link to="/login" className="btn-primary">
                    {t('auth.signIn', 'Sign In')}
                </Link>
            </div>
        </div>
    );
};

export default AcceptInvite;
