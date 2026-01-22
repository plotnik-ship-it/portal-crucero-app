import { useState, useEffect } from 'react';
import { getFamilyData, getGroupData, getFamilyPayments, getFamilyPaymentRequests } from '../services/firestore';
import { getUserData } from '../services/auth';

export const useFamilyData = (userId) => {
    const [familyData, setFamilyData] = useState(null);
    const [groupData, setGroupData] = useState(null);
    const [payments, setPayments] = useState([]);
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                console.log('🔍 [useFamilyData] Inicianco carga v5 para UID:', userId);

                // Get user data to find familyId
                // Note: We don't have email here easily unless we fetch it from auth again. 
                // But getUserData now handles auth.currentUser check more robustly.
                const userData = await getUserData(userId);
                console.log('🔍 [useFamilyData] Datos de usuario:', userData);
                if (!userData || !userData.familyId) {
                    throw new Error('No se encontró información de familia para este usuario');
                }

                const familyId = userData.familyId;

                // Load family data
                console.log('🔍 [useFamilyData] Cargando familia ID:', familyId);
                const family = await getFamilyData(familyId);
                if (!family) {
                    throw new Error('Familia no encontrada');
                }
                setFamilyData(family);

                // Load group data
                console.log('🔍 [useFamilyData] Cargando grupo ID:', family.groupId);
                const group = await getGroupData(family.groupId);
                setGroupData(group);

                // Load payments and requests
                console.log('🔍 [useFamilyData] Cargando pagos y solicitudes...');
                const [paymentsData, requestsData] = await Promise.all([
                    getFamilyPayments(familyId),
                    getFamilyPaymentRequests(familyId)
                ]);

                console.log('🔍 [useFamilyData] Carga completa exitosa');
                setPayments(paymentsData);
                setPaymentRequests(requestsData);
            } catch (err) {
                console.error('❌ [useFamilyData] Error detectado:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userId]);

    const refreshData = async () => {
        if (!userId) return;

        try {
            const userData = await getUserData(userId);
            if (!userData || !userData.familyId) return;

            const familyId = userData.familyId;

            const [family, paymentsData, requestsData] = await Promise.all([
                getFamilyData(familyId),
                getFamilyPayments(familyId),
                getFamilyPaymentRequests(familyId)
            ]);

            setFamilyData(family);
            setPayments(paymentsData);
            setPaymentRequests(requestsData);
        } catch (err) {
            console.error('Error refreshing data:', err);
        }
    };

    return {
        familyData,
        groupData,
        payments,
        paymentRequests,
        loading,
        error,
        refreshData
    };
};
