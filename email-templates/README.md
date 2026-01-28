# Professional Email Templates - Setup Guide

## 📧 Templates Created

This directory contains 4 professional, responsive HTML email templates for the cruise portal:

1. **`mass-communication.html`** - General communications from admin to families
2. **`reminder-7-days.html`** - Friendly payment reminder (7 days before deadline)
3. **`reminder-1-day-urgent.html`** - Urgent payment reminder (1 day before deadline)
4. **`reminder-overdue.html`** - Overdue payment notification

---

## 🎨 Design Features

### Visual Design
- **Modern, professional appearance** with gradient headers
- **Responsive design** that works on desktop and mobile
- **Table-based layout** for maximum email client compatibility
- **Color-coded by urgency**:
  - Blue/Purple: Normal communications and 7-day reminders
  - Orange/Yellow: Urgent 1-day reminders
  - Red: Overdue payments

### Technical Features
- ✅ Compatible with Gmail, Outlook, Apple Mail, and more
- ✅ Mobile-responsive with media queries
- ✅ Inline CSS for maximum compatibility
- ✅ Preheader text for better inbox preview
- ✅ Accessible HTML structure

---

## 🚀 How to Upload to EmailJS

### Step 1: Access EmailJS Dashboard

1. Go to [https://dashboard.emailjs.com](https://dashboard.emailjs.com)
2. Log in to your account
3. Click on **"Email Templates"** in the sidebar

### Step 2: Create Each Template

For each of the 4 templates, follow these steps:

#### A. Create New Template

1. Click **"Create New Template"**
2. Give it a descriptive name:
   - `Mass Communication - Cruise Portal`
   - `Payment Reminder - 7 Days`
   - `Payment Reminder - 1 Day Urgent`
   - `Payment Reminder - Overdue`

#### B. Configure Subject Line

**For Mass Communication:**
```
{{subject}}
```

**For 7-Day Reminder:**
```
Recordatorio: Pago Próximo - {{family_code}}
```

**For 1-Day Urgent:**
```
⚠️ URGENTE: Pago Mañana - {{family_code}}
```

**For Overdue:**
```
🔴 ATENCIÓN: Pago Vencido - {{family_code}}
```

#### C. Copy HTML Content

1. Open the corresponding `.html` file from this directory
2. Copy the **entire HTML content**
3. In EmailJS, switch to **"HTML" mode** (not "Visual Editor")
4. Paste the HTML content
5. Click **"Save"**

#### D. Copy Template ID

After saving, EmailJS will show you a **Template ID** (e.g., `template_abc123`). Copy this ID - you'll need it for the next step.

---

## 🔧 Update Environment Variables

After creating all 4 templates in EmailJS, update your `.env` file:

```bash
# EmailJS Configuration
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
VITE_EMAILJS_SERVICE_ID=your_service_id_here

# Template IDs (update these with your actual IDs from EmailJS)
VITE_EMAILJS_TEMPLATE_ID_MASS_COMM=template_mass_comm_id
VITE_EMAILJS_TEMPLATE_ID_REMINDER_7DAY=template_7day_id
VITE_EMAILJS_TEMPLATE_ID_REMINDER_1DAY=template_1day_id
VITE_EMAILJS_TEMPLATE_ID_OVERDUE=template_overdue_id
```

**Important:** Restart your development server after updating `.env`:
```bash
npm run dev
```

---

## 📝 Template Variables Reference

### Common Variables (All Templates)

| Variable | Description | Example |
|----------|-------------|---------|
| `{{to_email}}` | Recipient email | familia@example.com |
| `{{to_name}}` | Recipient name | Familia González |
| `{{from_name}}` | Sender name | TravelPoint |
| `{{family_code}}` | Family code | FAM001 |

### Mass Communication Only

| Variable | Description |
|----------|-------------|
| `{{subject}}` | Email subject |
| `{{message}}` | Custom message from admin |

### Payment Reminders Only

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ship_name}}` | Ship name | Norwegian Encore |
| `{{sail_date}}` | Sail date | 2026-06-15 |
| `{{cabin_number}}` | Cabin number | A104 |
| `{{deadline_date}}` | Payment deadline | 2026-01-30 |
| `{{balance_amount}}` | Balance due | $1,500.00 CAD |
| `{{total_amount}}` | Total cost | $5,000.00 CAD |
| `{{paid_amount}}` | Amount paid | $3,500.00 CAD |
| `{{days_until}}` | Days until/since deadline | 7 (or -3 for overdue) |

---

## 🧪 Testing Your Templates

### 1. Test in EmailJS Dashboard

1. In EmailJS, go to your template
2. Click **"Test It"**
3. Fill in sample data for all variables
4. Send a test email to yourself
5. Check your inbox and verify:
   - Layout looks correct
   - All variables are replaced
   - Colors and styling are correct
   - Mobile view works (check on phone)

### 2. Test from the Portal

**Mass Communication:**
1. Go to Admin Dashboard → Comunicaciones
2. Select a test family
3. Click "Componer Email"
4. Write a test message
5. Send and verify

**Payment Reminders:**
1. Go to Admin Dashboard → Recordatorios
2. Select a test family with an upcoming deadline
3. Click "Enviar Recordatorios"
4. Check your email

---

## 🎨 Customization Options

### Adding Your Agency Logo

Replace the emoji (🚢) in the header with your logo:

```html
<!-- Replace this: -->
<h1 style="...">🚢 TravelPoint</h1>

<!-- With this: -->
<img src="https://your-domain.com/logo.png" 
     alt="TravelPoint" 
     width="200" 
     style="display: block; margin: 0 auto;">
```

### Changing Colors

The templates use these main colors:

**Normal (Blue/Purple):**
- Primary: `#2563eb`
- Secondary: `#7c3aed`

**Urgent (Orange):**
- Primary: `#f59e0b`
- Background: `#fef3c7`

**Overdue (Red):**
- Primary: `#ef4444`
- Background: `#fee2e2`

To change colors, search and replace the hex codes in the HTML files.

---

## 📱 Mobile Responsiveness

All templates include media queries for mobile devices:

- Maximum width: 600px on desktop
- Stacks to 100% width on mobile
- Adjusted font sizes for readability
- Touch-friendly button sizes

Test on these devices:
- iPhone (Safari)
- Android (Gmail app)
- Desktop (Chrome, Firefox, Safari)

---

## ✅ Checklist

- [ ] Create all 4 templates in EmailJS
- [ ] Copy Template IDs to `.env` file
- [ ] Restart development server
- [ ] Test mass communication email
- [ ] Test 7-day reminder email
- [ ] Test 1-day urgent reminder email
- [ ] Test overdue reminder email
- [ ] Verify mobile responsiveness
- [ ] Check in different email clients
- [ ] (Optional) Add agency logo
- [ ] (Optional) Customize colors

---

## 🆘 Troubleshooting

### Variables Not Replacing

**Problem:** Variables like `{{to_name}}` appear as-is in emails

**Solution:**
1. Verify variable names match exactly (case-sensitive)
2. Check that you're using double curly braces: `{{variable}}`
3. Ensure the code is sending the correct variable names

### Layout Broken in Outlook

**Problem:** Email looks broken in Outlook

**Solution:**
- The templates use table-based layouts specifically for Outlook compatibility
- If still broken, check that you copied the entire HTML (including `<!DOCTYPE>`)
- Ensure no extra spaces or characters were added when copying

### Images Not Loading

**Problem:** Logo or images don't appear

**Solution:**
1. Use absolute URLs (https://...) not relative paths
2. Ensure images are publicly accessible
3. Check image file size (keep under 200KB)

### Emails Going to Spam

**Problem:** Emails end up in spam folder

**Solution:**
1. Verify EmailJS service is properly configured
2. Avoid spam trigger words in subject lines
3. Keep a good text-to-image ratio
4. Don't use all caps or excessive punctuation

---

## 📚 Additional Resources

- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [Email on Acid - Testing Tool](https://www.emailonacid.com/)
- [Can I Email - CSS Support](https://www.caniemail.com/)
- [Really Good Emails - Inspiration](https://reallygoodemails.com/)

---

## 🎉 You're All Set!

Your professional email templates are ready to use. Enjoy sending beautiful, responsive emails to your cruise families!

For questions or issues, refer to the main project documentation or contact your development team.
