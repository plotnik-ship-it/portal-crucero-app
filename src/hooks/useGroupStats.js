import { useState, useEffect } from 'react';
import { useGroup } from '../contexts/GroupContext';
import { useAgency } from '../contexts/AgencyContext';
import { getBookingsByGroup } from '../services/firestore';

/**
 * Hook to calculate statistics for all groups
 */
export const useGroupStats = () => {
    const { groups } = useGroup();
    const { agency } = useAgency();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateStats = async () => {
            if (!groups || groups.length === 0 || !agency?.id) {
                setStats(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Fetch bookings for each group
                const groupsWithBookings = await Promise.all(
                    groups.map(async (group) => {
                        const bookings = await getBookingsByGroup(group.id, agency?.id);

                        // Calculate totals for this group
                        const totalCad = bookings.reduce((sum, f) => sum + (f.totalCadGlobal || 0), 0);
                        const paidCad = bookings.reduce((sum, f) => sum + (f.paidCadGlobal || 0), 0);
                        const balanceCad = bookings.reduce((sum, f) => sum + (f.balanceCadGlobal || 0), 0);

                        // Count bookings with/without deposit (assuming deposit is at least 10% of total)
                        const bookingsWithDeposit = bookings.filter(f => {
                            const depositThreshold = (f.totalCadGlobal || 0) * 0.1;
                            return (f.paidCadGlobal || 0) >= depositThreshold;
                        }).length;

                        const bookingsWithoutDeposit = bookings.length - bookingsWithDeposit;

                        return {
                            ...group,
                            bookingCount: bookings.length,
                            totalCad,
                            paidCad,
                            balanceCad,
                            bookingsWithDeposit,
                            bookingsWithoutDeposit
                        };
                    })
                );

                // Calculate global totals
                const globalStats = {
                    totalGroups: groups.length,
                    totalBookings: groupsWithBookings.reduce((sum, g) => sum + g.bookingCount, 0),
                    totalSales: groupsWithBookings.reduce((sum, g) => sum + g.totalCad, 0),
                    totalPaid: groupsWithBookings.reduce((sum, g) => sum + g.paidCad, 0),
                    totalBalance: groupsWithBookings.reduce((sum, g) => sum + g.balanceCad, 0),
                    totalBookingsWithDeposit: groupsWithBookings.reduce((sum, g) => sum + g.bookingsWithDeposit, 0),
                    totalBookingsWithoutDeposit: groupsWithBookings.reduce((sum, g) => sum + g.bookingsWithoutDeposit, 0),
                    groups: groupsWithBookings
                };

                setStats(globalStats);
            } catch (error) {
                console.error('Error calculating group stats:', error);
                setStats(null);
            } finally {
                setLoading(false);
            }
        };

        calculateStats();
    }, [groups, agency]);

    return { stats, loading };
};
