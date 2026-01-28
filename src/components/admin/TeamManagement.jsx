/**
 * Team Management Component
 * 
 * Enterprise feature for managing team members and invitations.
 * Displays members list, pending invites, and invite form.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import {
    getTeamMembers,
    getTeamInvites,
    createTeamInvite,
    revokeTeamInvite
} from '../../services/teamService';
import './TeamManagement.css';

const TeamManagement = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const agencyId = user?.agencyId;

    // State
    const [members, setMembers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Invite form state
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('agent');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState(null);

    // Success modal state
    const [showInviteSuccess, setShowInviteSuccess] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // Load data
    const loadData = useCallback(async () => {
        if (!agencyId) return;

        try {
            setLoading(true);
            setError(null);

            const [membersData, invitesData] = await Promise.all([
                getTeamMembers(agencyId),
                getTeamInvites(agencyId)
            ]);

            setMembers(membersData);
            setInvites(invitesData);
        } catch (err) {
            console.error('Error loading team data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [agencyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle invite submission
    const handleInvite = async (e) => {
        e.preventDefault();

        if (!inviteEmail.trim()) {
            setInviteError(t('team.emailRequired', 'Email is required'));
            return;
        }

        try {
            setInviteLoading(true);
            setInviteError(null);

            const result = await createTeamInvite({
                agencyId,
                email: inviteEmail.trim(),
                role: inviteRole
            });

            // Show success with invite link
            setInviteLink(result.inviteLink);
            setShowInviteSuccess(true);
            setInviteEmail('');
            setInviteRole('agent');

            // Reload invites
            loadData();
        } catch (err) {
            setInviteError(err.message);
        } finally {
            setInviteLoading(false);
        }
    };

    // Handle revoke invite
    const handleRevoke = async (inviteId) => {
        if (!window.confirm(t('team.confirmRevoke', 'Are you sure you want to revoke this invite?'))) {
            return;
        }

        try {
            await revokeTeamInvite({ agencyId, inviteId });
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    // Copy invite link to clipboard
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Format expiry date
    const formatExpiry = (expiresAt) => {
        if (!expiresAt) return '-';
        const date = new Date(expiresAt);
        const now = new Date();

        if (date < now) {
            return t('team.expired', 'Expired');
        }

        const hoursLeft = Math.round((date - now) / (1000 * 60 * 60));
        if (hoursLeft < 24) {
            return t('team.hoursLeft', '{{hours}}h left', { hours: hoursLeft });
        }

        return date.toLocaleDateString();
    };

    // Get role badge class
    const getRoleBadgeClass = (role) => {
        const classes = {
            owner: 'badge-owner',
            admin: 'badge-admin',
            agent: 'badge-agent'
        };
        return classes[role] || 'badge-default';
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        const classes = {
            active: 'badge-active',
            disabled: 'badge-disabled',
            pending: 'badge-pending',
            accepted: 'badge-accepted',
            revoked: 'badge-revoked',
            expired: 'badge-expired'
        };
        return classes[status] || 'badge-default';
    };

    if (!agencyId) {
        return (
            <div className="team-management">
                <div className="team-error">
                    {t('team.noAgency', 'No agency found')}
                </div>
            </div>
        );
    }

    return (
        <div className="team-management">
            <div className="team-header">
                <h2>{t('team.title', 'Team Management')}</h2>
                <p className="team-subtitle">
                    {t('team.subtitle', 'Manage your agency team members and invitations')}
                </p>
            </div>

            {error && (
                <div className="team-error">
                    {error}
                    <button onClick={loadData} className="btn-retry">
                        {t('common.retry', 'Retry')}
                    </button>
                </div>
            )}

            {/* Invite Form */}
            <div className="team-section">
                <h3>{t('team.inviteTitle', 'Invite Team Member')}</h3>
                <form onSubmit={handleInvite} className="invite-form">
                    <div className="form-group">
                        <label htmlFor="invite-email">
                            {t('team.email', 'Email')}
                        </label>
                        <input
                            id="invite-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder={t('team.emailPlaceholder', 'agent@example.com')}
                            disabled={inviteLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="invite-role">
                            {t('team.role', 'Role')}
                        </label>
                        <select
                            id="invite-role"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            disabled={inviteLoading}
                        >
                            <option value="agent">{t('team.roleAgent', 'Agent')}</option>
                            <option value="admin">{t('team.roleAdmin', 'Admin')}</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={inviteLoading}
                    >
                        {inviteLoading
                            ? t('common.sending', 'Sending...')
                            : t('team.sendInvite', 'Send Invite')}
                    </button>

                    {inviteError && (
                        <div className="form-error">{inviteError}</div>
                    )}
                </form>
            </div>

            {/* Pending Invites */}
            <div className="team-section">
                <h3>{t('team.pendingInvites', 'Pending Invites')}</h3>
                {loading ? (
                    <div className="team-loading">{t('common.loading', 'Loading...')}</div>
                ) : invites.filter(inv => inv.status === 'pending').length === 0 ? (
                    <div className="team-empty">
                        {t('team.noInvites', 'No pending invites')}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="team-table">
                            <thead>
                                <tr>
                                    <th>{t('team.email', 'Email')}</th>
                                    <th>{t('team.role', 'Role')}</th>
                                    <th>{t('team.expires', 'Expires')}</th>
                                    <th>{t('team.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invites
                                    .filter(inv => inv.status === 'pending')
                                    .map(invite => (
                                        <tr key={invite.id}>
                                            <td>{invite.email}</td>
                                            <td>
                                                <span className={`badge ${getRoleBadgeClass(invite.role)}`}>
                                                    {invite.role}
                                                </span>
                                            </td>
                                            <td>{formatExpiry(invite.expiresAt)}</td>
                                            <td>
                                                <button
                                                    className="btn-danger-small"
                                                    onClick={() => handleRevoke(invite.id)}
                                                >
                                                    {t('team.revoke', 'Revoke')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Team Members */}
            <div className="team-section">
                <h3>{t('team.members', 'Team Members')}</h3>
                {loading ? (
                    <div className="team-loading">{t('common.loading', 'Loading...')}</div>
                ) : members.length === 0 ? (
                    <div className="team-empty">
                        {t('team.noMembers', 'No team members yet')}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="team-table">
                            <thead>
                                <tr>
                                    <th>{t('team.member', 'Member')}</th>
                                    <th>{t('team.role', 'Role')}</th>
                                    <th>{t('team.status', 'Status')}</th>
                                    <th>{t('team.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map(member => (
                                    <tr key={member.uid}>
                                        <td>
                                            <div className="member-info">
                                                <span className="member-name">
                                                    {member.displayName || member.email || member.uid}
                                                </span>
                                                {member.email && member.displayName && (
                                                    <span className="member-email">{member.email}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getRoleBadgeClass(member.role)}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(member.status)}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-secondary-small"
                                                disabled
                                                title={t('team.comingSoon', 'Coming soon')}
                                            >
                                                {t('team.manage', 'Manage')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invite Success Modal */}
            {showInviteSuccess && (
                <div className="modal-overlay" onClick={() => setShowInviteSuccess(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{t('team.inviteSent', 'Invite Created!')}</h3>
                        <p>{t('team.shareLink', 'Share this link with the team member:')}</p>

                        <div className="invite-link-box">
                            <input
                                type="text"
                                value={inviteLink}
                                readOnly
                                className="invite-link-input"
                            />
                            <button
                                onClick={copyToClipboard}
                                className="btn-copy"
                            >
                                {copySuccess
                                    ? t('team.copied', '✓ Copied!')
                                    : t('team.copy', 'Copy')}
                            </button>
                        </div>

                        <p className="invite-note">
                            {t('team.linkExpiry', 'This link expires in 72 hours.')}
                        </p>

                        <button
                            onClick={() => setShowInviteSuccess(false)}
                            className="btn-primary"
                        >
                            {t('common.close', 'Close')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamManagement;
