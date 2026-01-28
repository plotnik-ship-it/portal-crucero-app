import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllBookingsByAgency } from '../../../services/firestore';
import Card from '../../shared/Card';
import EmailComposer from './EmailComposer';

const CommunicationsHome = ({ agencyId }) => {
    const { t } = useTranslation();
    const [families, setFamilies] = useState([]);
    const [selectedFamilies, setSelectedFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showComposer, setShowComposer] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadFamilies();
    }, [agencyId]);

    const loadFamilies = async () => {
        try {
            setLoading(true);
            const data = await getAllBookingsByAgency(agencyId);
            setFamilies(data);
        } catch (error) {
            console.error('Error loading families:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedFamilies.length === filteredFamilies.length) {
            setSelectedFamilies([]);
        } else {
            setSelectedFamilies(filteredFamilies.map(f => f.id));
        }
    };

    const handleSelectFamily = (familyId) => {
        setSelectedFamilies(prev => {
            if (prev.includes(familyId)) {
                return prev.filter(id => id !== familyId);
            } else {
                return [...prev, familyId];
            }
        });
    };

    const handleSendEmail = async (emailData) => {
        try {
            setLoading(true);

            // Import the sendMassEmail function
            const { sendMassEmail } = await import('../../../services/emailService');

            // Send emails using EmailJS
            const results = await sendMassEmail({
                subject: emailData.subject,
                body: emailData.body,
                recipients: selectedFamiliesData
            });

            // Show results to user
            if (results.failed.length === 0) {
                alert(`✅ ¡Éxito! Se enviaron ${results.sent.length} emails correctamente.`);
            } else if (results.sent.length === 0) {
                alert(`❌ Error: No se pudo enviar ningún email. Verifica tu configuración de EmailJS.`);
            } else {
                alert(
                    `⚠️ Envío parcial:\n` +
                    `✅ Enviados: ${results.sent.length}\n` +
                    `❌ Fallidos: ${results.failed.length}\n\n` +
                    `Revisa la consola para más detalles.`
                );
                console.log('Resultados detallados:', results);
            }

            setShowComposer(false);
            setSelectedFamilies([]);
        } catch (error) {
            console.error('Error sending mass email:', error);
            alert(`❌ Error al enviar emails: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredFamilies = families.filter(family => {
        const search = searchTerm.toLowerCase();
        return (
            family.displayName?.toLowerCase().includes(search) ||
            family.bookingCode?.toLowerCase().includes(search) ||
            family.email?.toLowerCase().includes(search)
        );
    });

    const selectedFamiliesData = families.filter(f => selectedFamilies.includes(f.id));

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    if (showComposer) {
        return (
            <EmailComposer
                recipients={selectedFamiliesData}
                onSend={handleSendEmail}
                onCancel={() => setShowComposer(false)}
            />
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-xl">
                <div>
                    <h2 className="text-2xl font-bold">📧 Comunicación Masiva</h2>
                    <p className="text-muted">Envía emails a tus familias</p>
                </div>
                <button
                    onClick={() => setShowComposer(true)}
                    className="btn btn-primary"
                    disabled={selectedFamilies.length === 0}
                >
                    ✉️ Componer Email ({selectedFamilies.length})
                </button>
            </div>

            <Card>
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <h3 className="card-title">Seleccionar Destinatarios</h3>
                        <input
                            type="text"
                            className="form-input"
                            style={{ maxWidth: '300px' }}
                            placeholder="Buscar familias..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="card-body">
                    <div className="mb-md">
                        <label className="flex items-center gap-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedFamilies.length === filteredFamilies.length && filteredFamilies.length > 0}
                                onChange={handleSelectAll}
                            />
                            <span className="font-semibold">
                                Seleccionar todas ({filteredFamilies.length})
                            </span>
                        </label>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}></th>
                                    <th>Código</th>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFamilies.map((family) => (
                                    <tr key={family.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedFamilies.includes(family.id)}
                                                onChange={() => handleSelectFamily(family.id)}
                                            />
                                        </td>
                                        <td className="font-semibold">{family.bookingCode}</td>
                                        <td>{family.displayName}</td>
                                        <td className="text-small">{family.email}</td>
                                        <td className={family.balanceCadGlobal > 0 ? 'text-danger' : 'text-success'}>
                                            ${family.balanceCadGlobal?.toFixed(2) || '0.00'} CAD
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredFamilies.length === 0 && (
                        <p className="text-center text-muted p-lg">
                            No se encontraron familias
                        </p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default CommunicationsHome;
