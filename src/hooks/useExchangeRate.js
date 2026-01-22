import { useState, useEffect } from 'react';
import { getGroupData } from '../services/firestore';

export const useExchangeRate = (groupId) => {
    const [rate, setRate] = useState(14.5); // Default rate
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRate = async () => {
            if (!groupId) {
                setLoading(false);
                return;
            }

            try {
                const group = await getGroupData(groupId);
                if (group && group.fxRateCadToMxn) {
                    setRate(group.fxRateCadToMxn);
                }
            } catch (error) {
                console.error('Error loading exchange rate:', error);
            } finally {
                setLoading(false);
            }
        };

        loadRate();
    }, [groupId]);

    return { rate, loading };
};
