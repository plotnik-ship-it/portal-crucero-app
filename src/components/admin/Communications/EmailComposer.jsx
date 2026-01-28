import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../../shared/Card';

const EmailComposer = ({ recipients, onSend, onCancel }) => {
    const { t } = useTranslation();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!subject.trim()) {
            alert('El asunto es requerido');
            return;
        }
        if (!body.trim()) {
            alert('El mensaje es requerido');
            return;
        }

        setSending(true);
        try {
            await onSend({ subject, body, recipients });
            alert(`✅ Email enviado a ${recipients.length} destinatario(s)`);
            setSubject('');
            setBody('');
        } catch (error) {
            console.error('Error sending email:', error);
            alert('❌ Error al enviar el email');
        } finally {
            setSending(false);
        }
    };

    // Available variables for email templates
    const variables = [
        { key: '{nombre}', desc: 'Nombre de la familia' },
        { key: '{codigo}', desc: 'Código de familia' },
        { key: '{saldo}', desc: 'Saldo pendiente' },
        { key: '{total}', desc: 'Total a pagar' },
        { key: '{pagado}', desc: 'Monto pagado' },
        { key: '{barco}', desc: 'Nombre del barco' },
        { key: '{fecha}', desc: 'Fecha de salida' }
    ];

    const insertVariable = (variable) => {
        setBody(prev => prev + ' ' + variable + ' ');
    };

    const applyFormatting = (format) => {
        const textarea = document.getElementById('email-body');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = body.substring(start, end);

        if (!selectedText) {
            alert('Selecciona texto primero');
            return;
        }

        let formattedText = '';
        switch (format) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'underline':
                formattedText = `__${selectedText}__`;
                break;
            default:
                formattedText = selectedText;
        }

        const newBody = body.substring(0, start) + formattedText + body.substring(end);
        setBody(newBody);
    };

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">📧 Nuevo Email Masivo</h3>
            </div>
            <div className="card-body">
                {/* Recipients Info */}
                <div className="bg-light p-md rounded mb-lg">
                    <p className="text-small text-muted mb-xs">Destinatarios:</p>
                    <p className="font-bold">{recipients.length} familia(s) seleccionada(s)</p>
                    <div className="text-xs text-muted mt-xs">
                        {recipients.slice(0, 5).map(r => r.email).join(', ')}
                        {recipients.length > 5 && ` y ${recipients.length - 5} más...`}
                    </div>
                </div>

                {/* Subject */}
                <div className="form-group mb-lg">
                    <label className="form-label">Asunto *</label>
                    <input
                        type="text"
                        className="form-input"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ej: Recordatorio de Pago - Crucero 2027"
                        disabled={sending}
                    />
                </div>

                {/* Variables Helper */}
                <div className="mb-md">
                    <p className="text-small text-muted mb-xs">Variables disponibles (click para insertar):</p>
                    <div className="flex flex-wrap gap-xs">
                        {variables.map((v) => (
                            <button
                                key={v.key}
                                onClick={() => insertVariable(v.key)}
                                className="btn btn-xs btn-outline"
                                title={v.desc}
                                disabled={sending}
                            >
                                {v.key}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Formatting Toolbar */}
                <div className="mb-sm flex gap-xs">
                    <button
                        onClick={() => applyFormatting('bold')}
                        className="btn btn-xs btn-outline"
                        title="Negrita"
                        disabled={sending}
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        onClick={() => applyFormatting('italic')}
                        className="btn btn-xs btn-outline"
                        title="Cursiva"
                        disabled={sending}
                    >
                        <em>I</em>
                    </button>
                    <button
                        onClick={() => applyFormatting('underline')}
                        className="btn btn-xs btn-outline"
                        title="Subrayado"
                        disabled={sending}
                    >
                        <u>U</u>
                    </button>
                </div>

                {/* Email Body */}
                <div className="form-group mb-lg">
                    <label className="form-label">Mensaje *</label>
                    <textarea
                        id="email-body"
                        className="form-input"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Escribe tu mensaje aquí...&#10;&#10;Puedes usar las variables para personalizar el mensaje.&#10;Ejemplo: Hola {nombre}, tu saldo pendiente es {saldo}."
                        rows={15}
                        disabled={sending}
                        style={{ fontFamily: 'monospace', fontSize: '14px' }}
                    />
                    <small className="text-muted">
                        Usa **texto** para negrita, *texto* para cursiva, __texto__ para subrayado
                    </small>
                </div>

                {/* Actions */}
                <div className="flex gap-md justify-end">
                    <button
                        onClick={onCancel}
                        className="btn btn-outline"
                        disabled={sending}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        className="btn btn-primary"
                        disabled={sending}
                    >
                        {sending ? 'Enviando...' : `📧 Enviar a ${recipients.length} destinatario(s)`}
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default EmailComposer;
