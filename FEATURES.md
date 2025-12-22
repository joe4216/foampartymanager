# Foam Works Party Co - Complete Features List

## Customer Website

### Homepage & Marketing
- Professional 8-section landing page with foam party branding
- Mobile-responsive design that works on all devices
- Easy navigation with clear call-to-action buttons
- Package showcase with pricing and descriptions

### Booking System
- Step-by-step booking form for customers
- Package selection: Basic, Standard, and Premium foam parties
- Date and time picker with availability checking
- Customer information collection (name, email, phone, address)
- Party size selection
- Special notes/requests field

### Payment Options
- **Stripe Payments** - Secure credit/debit card processing
- **Venmo Payments** - Alternative payment method
  - Displays Venmo QR code and username (@joe4216)
  - AI-powered receipt verification using photo upload
  - Automatic payment matching within $1 tolerance
  - Manual review queue for mismatched amounts

### AI Chatbot Assistant
- Floating chat widget on homepage (bottom-right corner)
- Natural language conversations powered by AI
- Can look up existing bookings by email or phone
- Can help reschedule or cancel bookings
- Answers questions about packages and pricing
- Quick action buttons for common requests

### Returning Customer Detection
- Automatically recognizes returning customers by email or phone
- Shows banner with previous booking information
- Pre-fills form with saved customer details
- Makes rebooking fast and easy

---

## Owner Portal

### Secure Login
- Username and password authentication
- Two-factor email verification with 6-digit codes
- Password reset via email
- Codes expire after 10 minutes for security

### Dashboard
- Quick stats overview: total bookings, upcoming events, revenue
- Recent bookings list with status indicators
- Pending Venmo payments requiring verification
- **All Bookings Table** - Full list with search and filters:
  - Search by customer name
  - Search by email address
  - Search by phone number
  - Search by booking ID
  - Filter by status (pending, confirmed, completed, cancelled)

### Calendar View
- Monthly calendar showing all booked events
- Color-coded by booking status
- Click on date to see booking details
- Visual overview of busy and available dates

### Kanban Board View
- Drag-and-drop workflow management
- Columns: Pending, Confirmed, Completed, Cancelled
- Move bookings between statuses easily
- Visual workflow for managing party bookings

### Venmo Payment Verification
- Queue of pending Venmo payments
- View uploaded receipt screenshots
- AI-detected payment amounts displayed
- One-click approve or reject payments
- Add verification notes

---

## Automated Systems

### Abandoned Booking Recovery
- 3-day grace period for unpaid bookings
- Automatic reminder email sent at 48 hours
- Warning that booking will be cancelled in 24 hours
- Auto-cancellation after 72 hours with logged note
- Time slots remain available until payment is confirmed

### Email Notifications
- Booking confirmation emails to customers
- Payment verification emails
- Reminder emails for pending payments
- Password reset emails for owners
- Login verification code emails

### Background Scheduler
- Runs automatically every hour
- Checks for bookings needing reminders
- Processes expired pending bookings
- Maintains system health without manual intervention

---

## Technical Infrastructure

### Database
- PostgreSQL database for reliable data storage
- Secure storage of customer information
- Booking history and status tracking
- Payment verification records
- User authentication data

### Security Features
- Encrypted password storage
- Session-based authentication
- Environment variables for sensitive data
- Secure payment processing through Stripe

### Email Service
- Powered by Resend API
- Professional email templates
- Reliable delivery for all notifications

### Deployment Ready
- Configured for Railway hosting
- Production-ready build system
- Environment variable management
- Custom domain support (foamworkspartyco.com)

---

## Summary of Completed Work

| Category | Features Built |
|----------|---------------|
| Customer Booking | Full booking flow with date/time selection |
| Payments | Stripe + Venmo with AI receipt verification |
| Owner Portal | Dashboard, Calendar, Kanban views |
| Authentication | Secure login with email verification |
| Automation | Abandoned booking recovery, email reminders |
| AI Features | Chatbot assistant, receipt verification |
| Admin Tools | All Bookings table with search/filters |

---

*Last Updated: December 2024*
