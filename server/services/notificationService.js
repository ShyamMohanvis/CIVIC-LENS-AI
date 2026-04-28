/**
 * Notification Service — §14 Documentation
 *
 * Channels:
 *  - Email    → SendGrid (mocked in dev, production-ready stubs provided)
 *  - SMS      → Twilio (mocked in dev, production-ready stubs provided)
 *  - Push     → Firebase Cloud Messaging / FCM (mocked in dev)
 *
 * Priority events:
 *  - SOS triggered              → Push + SMS (Critical, bypass DND)
 *  - SLA breach                 → Push + Email (High)
 *  - Moderation penalty         → Push + Email + appeal link (High)
 *  - Rating window open         → Push (Low)
 *  - Appeal decision            → Email (High)
 *  - Secret rotation due        → Email (High, admin only)
 */

const isDev = process.env.NODE_ENV !== 'production';

// ─── Email (SendGrid) ─────────────────────────────────────────────────────────
const sendEmail = async (to, subject, html) => {
    if (!to) return;

    if (isDev) {
        console.log('\n✉️  --- MOCK EMAIL ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('---');
        return true;
    }

    try {
        // Production: requires SENDGRID_API_KEY in .env
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({ to, from: 'noreply@civilens.gov', subject, html });
        return true;
    } catch (err) {
        console.error('[Email] SendGrid error:', err.message);
        return false;
    }
};

// ─── SMS (Twilio) ─────────────────────────────────────────────────────────────
const sendSMS = async (toPhone, message) => {
    if (!toPhone) return;

    if (isDev) {
        console.log('\n📱 --- MOCK SMS ---');
        console.log(`To: ${toPhone}`);
        console.log(`Message: ${message}`);
        console.log('---');
        return true;
    }

    try {
        // Production: requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM in .env
        const twilio = require('twilio');
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_FROM,
            to: toPhone
        });
        return true;
    } catch (err) {
        console.error('[SMS] Twilio error:', err.message);
        return false;
    }
};

// ─── Push Notification (FCM) ──────────────────────────────────────────────────
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
    if (!fcmToken) return;

    if (isDev) {
        console.log('\n🔔 --- MOCK PUSH ---');
        console.log(`Token: ${fcmToken.substring(0, 20)}...`);
        console.log(`Title: ${title}`);
        console.log(`Body: ${body}`);
        console.log('Data:', data);
        console.log('---');
        return true;
    }

    try {
        // Production: requires FIREBASE_SERVICE_ACCOUNT in .env (path to JSON or JSON string)
        const admin = require('firebase-admin');

        if (!admin.apps.length) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }

        await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data,
            android: { priority: 'HIGH' },
            apns: { payload: { aps: { contentAvailable: true } } }
        });

        return true;
    } catch (err) {
        console.error('[Push] FCM error:', err.message);
        return false;
    }
};

// ─── Broadcast Push to socket.io room (real-time alternative to FCM) ─────────
const sendSocketNotification = (room, event, payload) => {
    if (global.io) {
        global.io.to(room).emit(event, payload);
        console.log(`[Socket] 📡 Sent '${event}' to room '${room}'`);
    }
};

// ─── Named notification events ────────────────────────────────────────────────

/**
 * SOS triggered — Critical, bypass DND
 * Channel: Push + SMS
 */
const notifySOSTriggered = async (emergency, nearbyAuthorityUser) => {
    const title = '🚨 SOS Emergency Alert';
    const body = `${emergency.emergencyType?.replace(/_/g, ' ')} reported nearby. Immediate response required.`;

    await Promise.all([
        sendPushNotification(nearbyAuthorityUser?.fcmToken, title, body, {
            emergencyId: emergency._id.toString(),
            type: 'SOS_ALERT'
        }),
        nearbyAuthorityUser?.phone
            ? sendSMS(nearbyAuthorityUser.phone, `[CIVI Lens SOS] ${body}`)
            : Promise.resolve()
    ]);

    // Real-time Socket.IO broadcast to all admins in emergency_alerts room
    sendSocketNotification('emergency_alerts', 'NEW_SOS_ALERT', {
        emergencyId: emergency._id,
        emergencyType: emergency.emergencyType,
        severity: emergency.riskAssessment?.severity
    });
};

/**
 * SLA breach — High priority
 * Channel: Push + Email
 */
const notifySlaBreach = async (complaint, authorityUser) => {
    const subject = `[URGENT] SLA Breach — Complaint #${complaint._id.toString().slice(-6).toUpperCase()}`;
    const html = `
        <h2>SLA Breach Auto-Escalation</h2>
        <p>A complaint has breached its SLA and requires immediate attention.</p>
        <ul>
            <li><strong>Category:</strong> ${complaint.category}</li>
            <li><strong>Ward:</strong> ${complaint.jurisdiction?.ward || 'Unknown'}</li>
            <li><strong>Escalation Level:</strong> ${complaint.escalationLevel}</li>
        </ul>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/operator">View Dashboard</a></p>
    `;

    await Promise.all([
        sendEmail(authorityUser?.email, subject, html),
        sendPushNotification(
            authorityUser?.fcmToken,
            '⏰ SLA Breach Alert',
            `Complaint in ${complaint.jurisdiction?.ward || 'your area'} has breached SLA`,
            { complaintId: complaint._id.toString(), type: 'SLA_BREACH' }
        )
    ]);
};

/**
 * Moderation penalty issued — High priority
 * Channel: Push + Email + appeal link
 * VULN-030: appeal link included in all penalty notifications
 */
const notifyModerationPenalty = async (citizen, action) => {
    const appealUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/appeal`;

    let subject, html, pushTitle, pushBody;

    if (action.actionType === 'warning') {
        subject = 'CIVI Lens — Account Warning';
        pushTitle = '⚠️ Account Warning';
        pushBody = 'You have received a policy warning. Tap to view details.';
        html = `
            <h2>Account Warning</h2>
            <p>Your recent activity has been flagged for violating community guidelines.</p>
            <p><strong>Reason:</strong> ${action.justification}</p>
            <p><a href="${appealUrl}">Appeal this warning</a></p>
        `;
    } else if (action.actionType === 'temp_ban') {
        const expiry = new Date(action.expiresAt).toLocaleDateString('en-IN');
        subject = 'CIVI Lens — Temporary Account Suspension';
        pushTitle = '🚫 Account Suspended';
        pushBody = `Your account is suspended until ${expiry}.`;
        html = `
            <h2>Temporary Account Suspension</h2>
            <p>Your account has been suspended until <strong>${expiry}</strong>.</p>
            <p><strong>Reason:</strong> ${action.justification}</p>
            <p><a href="${appealUrl}">Submit an appeal within 14 days</a></p>
        `;
    } else if (action.actionType === 'perm_ban') {
        subject = 'CIVI Lens — Permanent Account Ban (Pending Approval)';
        pushTitle = '🚫 Account Ban Notice';
        pushBody = 'A permanent ban has been initiated on your account. Tap to appeal.';
        html = `
            <h2>Permanent Account Ban (Pending Secondary Approval)</h2>
            <p>A permanent ban has been initiated and is awaiting secondary admin approval.</p>
            <p><strong>Reason:</strong> ${action.justification}</p>
            <p><a href="${appealUrl}">Submit a final administrative appeal</a></p>
        `;
    } else {
        return;
    }

    await Promise.all([
        sendEmail(citizen.email, subject, html),
        sendPushNotification(citizen?.fcmToken, pushTitle, pushBody, {
            actionId: action._id.toString(),
            type: 'MODERATION_PENALTY'
        })
    ]);
};

/**
 * Rating window open — Low priority (Push only)
 * Sent 24h after resolution
 */
const notifyRatingWindowOpen = async (citizen, complaint) => {
    const title = '⭐ Rate Your Experience';
    const body = `Your complaint about "${complaint.category}" was resolved. Share your feedback!`;

    await sendPushNotification(
        citizen?.fcmToken,
        title,
        body,
        { complaintId: complaint._id.toString(), type: 'RATING_WINDOW_OPEN' }
    );
};

/**
 * Appeal decision — High priority (Email)
 */
const notifyAppealDecision = async (citizen, action, isApproved) => {
    const statusText = isApproved ? 'Approved — Sanction Revoked' : 'Denied — Sanction Upheld';
    const subject = `CIVI Lens — Appeal Decision: ${statusText}`;
    const html = `
        <h2>Appeal Decision</h2>
        <p>An administrator has reviewed your appeal.</p>
        <p><strong>Decision:</strong> ${statusText}</p>
        <p><strong>Reviewer Note:</strong> ${action.appealDecisionText || 'No additional comments.'}</p>
    `;

    await Promise.all([
        sendEmail(citizen.email, subject, html),
        sendPushNotification(
            citizen?.fcmToken,
            isApproved ? '✅ Appeal Approved' : '❌ Appeal Denied',
            `Your appeal has been ${isApproved ? 'approved' : 'denied'}.`,
            { actionId: action._id.toString(), type: 'APPEAL_DECISION' }
        )
    ]);
};

module.exports = {
    sendEmail,
    sendSMS,
    sendPushNotification,
    sendSocketNotification,
    notifySOSTriggered,
    notifySlaBreach,
    notifyModerationPenalty,
    notifyRatingWindowOpen,
    notifyAppealDecision
};
