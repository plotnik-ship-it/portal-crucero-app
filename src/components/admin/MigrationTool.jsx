import { useState } from 'react';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    writeBatch,
    serverTimestamp,
    query,
    where
} from 'firebase/firestore';
import { db } from '../../services/firebase';

const DEFAULT_AGENCY = {
    id: 'agency_travelpoint',
    name: 'TravelPoint',
    billingEmail: 'admin@travelpoint.mx',
    logoUrl: '',
    branding: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        navbarBackground: '#ffffff'
    },
    // timestamps handled by serverTimestamp()
};

const MigrationTool = () => {
    const [status, setStatus] = useState('idle'); // idle, running, success, error
    const [logs, setLogs] = useState([]);

    const addLog = (message) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
    };

    const runMigration = async () => {
        setStatus('running');
        setLogs([]);
        addLog('🚀 Starting migration...');

        try {
            // 1. Create Default Agency
            addLog('🔹 Step 1: Checking agency...');
            const agencyRef = doc(db, 'agencies', DEFAULT_AGENCY.id);
            let agencySnap;
            try {
                agencySnap = await getDoc(agencyRef);
                addLog('✅ Read agency doc success');
            } catch (e) {
                throw new Error(`Failed to read agency: ${e.message}`);
            }

            if (!agencySnap.exists()) {
                addLog('🔹 Creating agency...');
                try {
                    await setDoc(agencyRef, {
                        ...DEFAULT_AGENCY,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    addLog('✅ Default agency created.');
                } catch (e) {
                    throw new Error(`Failed to create agency: ${e.message}`);
                }
            } else {
                addLog('ℹ️ Default agency already exists.');
            }

            // 2. Migrate Groups
            addLog('🔹 Step 2: Fetching groups...');
            const groupsRef = collection(db, 'groups');
            const groupsSnapshot = await getDocs(groupsRef);
            addLog(`✅ Fetched ${groupsSnapshot.size} groups.`);

            const groupBatch = writeBatch(db);
            let groupsUpdated = 0;

            groupsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.agencyId) {
                    groupBatch.update(doc.ref, { agencyId: DEFAULT_AGENCY.id });
                    groupsUpdated++;
                }
            });

            if (groupsUpdated > 0) {
                addLog(`🔹 Updating ${groupsUpdated} groups...`);
                try {
                    await groupBatch.commit();
                    addLog(`✅ Updated ${groupsUpdated} groups with agencyId.`);
                } catch (e) {
                    throw new Error(`Failed to commit group batch: ${e.message}`);
                }
            } else {
                addLog('ℹ️ No groups needed update.');
            }

            // 3. Migrate Admin Users
            addLog('🔹 Step 3: Fetching admin users...');
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'admin'));
            const usersSnapshot = await getDocs(q);
            addLog(`✅ Fetched ${usersSnapshot.size} admin users.`);

            const userBatch = writeBatch(db); // Create a new batch
            let usersUpdated = 0;

            usersSnapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.agencyId) {
                    userBatch.update(doc.ref, { agencyId: DEFAULT_AGENCY.id });
                    usersUpdated++;
                }
            });

            if (usersUpdated > 0) {
                addLog(`🔹 Updating ${usersUpdated} users...`);
                try {
                    await userBatch.commit();
                    addLog(`✅ Updated ${usersUpdated} admin users with agencyId.`);
                } catch (e) {
                    throw new Error(`Failed to commit user batch: ${e.message}`);
                }
            } else {
                addLog('ℹ️ No admin users needed update.');
            }

            setStatus('success');
            addLog('🎉 Migration completed successfully!');

        } catch (error) {
            console.error('Migration error:', error);
            addLog(`❌ Error: ${error.message}`);
            setStatus('error');
        }
    };

    return (
        <div className="container page" style={{ padding: '2rem' }}>
            <h1>SaaS Migration Tool</h1>
            <p>Use this tool to upgrade the database schema for multi-agency support.</p>

            <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                <button
                    className="btn btn-primary"
                    onClick={runMigration}
                    disabled={status === 'running'}
                >
                    {status === 'running' ? 'Migrating...' : 'Start Migration'}
                </button>

                <div
                    style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: '#f8f9fa',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        minHeight: '200px',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}
                >
                    {logs.length === 0 ? (
                        <span style={{ color: '#aaa' }}>Logs will appear here...</span>
                    ) : (
                        logs.map((log, i) => <div key={i}>{log}</div>)
                    )}
                </div>
            </div>
        </div>
    );
};

export default MigrationTool;
