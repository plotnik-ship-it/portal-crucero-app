# EmailJS Mass Communication Setup Guide

## Overview
This guide explains how to configure EmailJS for the Mass Communication feature in the cruise portal.

## Prerequisites
- EmailJS account (free tier allows 200 emails/month)
- Existing EmailJS service configured (you already have this for payment notifications)

## Step 1: Create Email Template in EmailJS Dashboard

1. **Login to EmailJS**: Go to [https://dashboard.emailjs.com](https://dashboard.emailjs.com)

2. **Navigate to Email Templates**: Click on "Email Templates" in the sidebar

3. **Create New Template**: Click "Create New Template"

4. **Template Configuration**:
   - **Template Name**: `Mass Communication - Cruise Portal`
   - **Template ID**: Copy this ID (you'll need it for `.env`)

5. **Template Content**:

### Subject Line:
```
{{subject}}
```

### Email Body (HTML):
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .message {
            background: white;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            white-space: pre-wrap;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
        }
        .family-code {
            background: #667eea;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            display: inline-block;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚢 TravelPoint - Portal de Cruceros</h1>
    </div>
    <div class="content">
        <p>Hola <strong>{{to_name}}</strong>,</p>
        
        <div class="message">
            {{message}}
        </div>
        
        <p class="family-code">Código de Familia: {{family_code}}</p>
        
        <div class="footer">
            <p><strong>{{from_name}}</strong></p>
            <p>Este es un mensaje automático del Portal de Cruceros</p>
            <p>Si tienes alguna pregunta, por favor contacta a tu agente de viajes</p>
        </div>
    </div>
</body>
</html>
```

6. **Save Template**: Click "Save" button

## Step 2: Update Environment Variables

1. **Copy Template ID**: From the EmailJS dashboard, copy your new template ID

2. **Update `.env` file**:
```bash
# Add this line to your .env file
VITE_EMAILJS_TEMPLATE_ID_MASS_COMM=your_template_id_here
```

Replace `your_template_id_here` with the actual template ID from EmailJS.

## Step 3: Template Variables

The template uses the following variables that are automatically populated by the application:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{to_email}}` | Recipient email address | familia@example.com |
| `{{to_name}}` | Recipient name | Familia González |
| `{{subject}}` | Email subject | Recordatorio de Pago |
| `{{message}}` | Personalized message body | Hola Familia González, tu saldo es $500.00 CAD |
| `{{family_code}}` | Family code | FAM001 |
| `{{from_name}}` | Sender name | TravelPoint - Portal de Cruceros |

## Step 4: Dynamic Variables in Messages

When composing emails in the portal, you can use these variables that will be replaced with actual family data:

- `{nombre}` → Family name
- `{codigo}` → Family code
- `{saldo}` → Balance due (formatted with currency)
- `{total}` → Total cost (formatted with currency)
- `{pagado}` → Amount paid (formatted with currency)
- `{barco}` → Ship name
- `{fecha}` → Sail date

**Example Message:**
```
Hola {nombre},

Te recordamos que tu saldo pendiente para el crucero en {barco} es de {saldo}.

Total del viaje: {total}
Pagado hasta ahora: {pagado}
Fecha de salida: {fecha}

Código de reserva: {codigo}

¡Esperamos verte pronto a bordo!
```

## Step 5: Testing

1. **Start the development server**: `npm run dev`
2. **Navigate to**: Admin Dashboard → Comunicaciones
3. **Select a test family** (preferably your own email)
4. **Click "Componer Email"**
5. **Enter test subject and message** with variables
6. **Click "Enviar"**
7. **Check your email inbox** for the personalized message

## Troubleshooting

### Error: "EmailJS no está configurado"
- Verify all environment variables are set in `.env`
- Restart the development server after updating `.env`

### Emails not being received
- Check EmailJS dashboard for send logs
- Verify email addresses are valid
- Check spam folder
- Ensure you haven't exceeded the 200 emails/month limit (free tier)

### Variables not being replaced
- Ensure you're using the correct syntax: `{nombre}` not `{{nombre}}`
- Check that family data exists in Firestore
- Review browser console for errors

## Rate Limiting

The application includes built-in rate limiting:
- **200ms delay** between each email to avoid EmailJS rate limits
- Emails are sent **sequentially**, not in parallel
- You'll see a progress indicator while emails are being sent

## Upgrading EmailJS Plan

If you need to send more than 200 emails/month:
1. Go to EmailJS dashboard → Pricing
2. Choose a paid plan (starts at $15/month for 1,000 emails)
3. No code changes needed - just upgrade your account

## Support

For EmailJS-specific issues, visit: [https://www.emailjs.com/docs/](https://www.emailjs.com/docs/)
