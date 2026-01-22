# Portal de Crucero (Cruise Portal)

**Note: This application was developed for a LATAM travel agency client. The User Interface is in Spanish, but this documentation is provided in English for technical review.**

Secure portal for 27 families to access cruise cabin information and manage payment request workflows.

## 🚀 Features

- ✅ **Firebase Authentication** (email/password)
- ✅ **Roles**: Family and Administrator
- ✅ **Family Dashboard** with cabin info, cost breakdown, and itinerary
- ✅ **Currency Conversion** CAD to MXN (configurable)
- ✅ **Payment Request Workflow** (intent capture, no real-time processing)
- ✅ **PCI-Compliant Data Handling** (Tokenization/Masking - only last 4 digits stored, NO CVV)
- ✅ **Email Notifications** to administrator
- ✅ **Admin Panel** to manage families and requests
- ✅ **Strict Role-Based Access Control (RBAC)** via Firestore Security Rules
- ✅ **Responsive Design** (mobile-first)

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase Account (Spark plan or higher)
- EmailJS Account (free tier)

## 🛠️ Setup

### 1. Clone and Install Dependencies

```bash
cd portal-crucero
npm install
```

### 2. Configure Firebase

1. Create a project in [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → Email/Password
3. Enable **Cloud Firestore**
4. Copy project credentials

### 3. Configure EmailJS

1. Create an account at [EmailJS](https://www.emailjs.com/)
2. Create an email service (Gmail, Outlook, etc.)
3. Create a template with the following variables:
   - `to_email`
   - `family_name`
   - `family_code`
   - `cabin_numbers`
   - `amount_cad`
   - `amount_mxn`
   - `fx_rate`
   - `card_brand`
   - `card_last4`
   - `cardholder_name`
   - `timestamp`
   - `admin_link`

### 4. Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key

VITE_ADMIN_EMAIL=dplotnik@trevelo.com
```

### 5. Configure Firestore Security Rules (RBAC)

Deploy security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

Or manually copy the content of `firestore.rules` into the Firebase Console.

### 6. Database Seeding

Option A - Use the seed script:
1. Uncomment the import in a temporary component
2. Call `seedDatabase()` once
3. Verify in Firestore Console that data was created

Option B - Manually create data in Firestore Console

### 7. Create Administrator User

1. Go to Firebase Console → Authentication
2. Create user with email and password
3. Copy the user's UID
4. In Firestore, create `admins` collection
5. Create document with ID = Admin UID
6. Add field: `{ role: "admin" }`

### 8. Create Family Users

For each family (FAM001 - FAM027):
1. Create user in Firebase Authentication
2. Email: `fam001@example.com` (or the actual family email)
3. Password: Assign a secure password
4. **IMPORTANT**: The User UID must match the Document ID in Firestore
   - Option 1: Create user first, copy UID, create document with that ID
   - Option 2: Use Cloud Functions to synchronize automatically

## 🚀 Run Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 👥 Test Users

### Administrator
- Email: (the one created in Firebase)
- Password: (assigned password)

### Family
- Email: `fam001@example.com` (or any FAM001-FAM027)
- Password: (assigned password)

## 📱 User Flow

### Family
1. Login with email/password
2. View cabin information, ship details, sail date
3. View cost breakdown in CAD with MXN conversion
4. View cruise itinerary
5. View payment history
6. Initiate **Payment Request Workflow**:
   - Enter amount in CAD
   - View automatic conversion to MXN
   - Enter card details
   - Accept authorization
   - Submit request
7. Receive confirmation (will be contacted to complete payment)

### Administrator
1. Login with email/password
2. View list of 27 families
3. Search by name, code, or cabin
4. View family details
5. Edit amounts (subtotal, gratuities, paid)
6. View pending payment requests
7. Approve or reject requests
8. On approval: payment record is created and balance is updated
9. Configure CAD/MXN exchange rate

## 🔒 Security

- ✅ **Strict Role-Based Access Control (RBAC)** via Firestore Rules
- ✅ Families can only read their own information
- ✅ Families can only create payment requests, not modify them
- ✅ Only admin can modify financial data
- ✅ **PCI-Compliant Data Handling**: Card data is NEVER fully stored
- ✅ Only last 4 digits are stored
- ✅ CVV is NEVER stored
- ✅ Email notifications contain only last 4 digits
- ✅ Protected routes with authentication

## 📧 Notifications

When a family submits a Payment Request:
1. Document created in Firestore
2. Email sent to `dplotnik@trevelo.com` containing:
   - Family information
   - Amount in CAD and MXN
   - Last 4 digits of card
   - Cardholder name
   - Link to admin panel

## 🎨 Customization

### Change Colors
Edit CSS variables in `src/styles/index.css`:
```css
:root {
  --color-primary: #1e40af;
  --color-secondary: #0891b2;
  /* ... more colors */
}
```

### Change Default Exchange Rate
Edit `src/hooks/useExchangeRate.js`:
```javascript
const [rate, setRate] = useState(14.5); // Change value here
```

## 📝 Important Notes

1.  **No Real-Time Payment Processing**: The app captures payment intent only.
2.  **Manual Contact**: The admin must contact the family to safely process the charge via the cruise line's terminal.
3.  **Data Privacy**: Card details are handled with strict privacy measures; only tokenized/masked data is stored.
4.  **Exchange Rate**: Is approximate; the issuing bank determines the final rate.

## 🐛 Troubleshooting

### Error: "Firebase not configured"
- Verify that `.env` exists and contains all variables
- Restart the development server

### Error: "Permission denied"
- Verify that Security Rules are deployed
- Verify that user is authenticated
- For admin: Verify that a document exists in the `admins` collection

### Emails not sending
- Verify EmailJS credentials in `.env`
- Verify that the template exists in EmailJS
- Check browser console for errors

## 📄 License

Private project for Trevelo.

## 👨‍💻 Support

For support, contact: dplotnik@trevelo.com
