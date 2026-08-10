Automated PostgreSQL Backup and Google Drive Sync Documentation

1. Overview
This feature provides an automated, secure, and robust system for creating daily backups of the PostgreSQL database and syncing them directly to a designated personal Google Drive folder.

To overcome the storage quota restrictions imposed on Google Cloud Service Accounts, this solution utilizes the Google OAuth 2.0 (Refresh Token) mechanism. The backup script authenticates directly on behalf of a specific user account, successfully utilizing the user's personal Google Drive storage space.

2. Step-by-Step Setup Guide
Follow these exact steps to generate the required credentials if they need to be reconfigured or updated in the future.

Phase 1: Google Cloud Console Setup
Open the Google Cloud Console.

Ensure your active project (e.g., Admine ERP) is selected in the top drop-down menu.

Navigate to APIs & Services > OAuth consent screen:

Select External as the User Type and click Create.

Provide an App Name and user support email, then save.

Go to the Audience (or Test Users) tab:

Click Add Users and enter your personal Gmail address.

Note: This is mandatory for apps in the development/testing lifecycle phase so that Google permits token exchanges.

Navigate to the Credentials (or Clients) menu on the left pane:

Click Create Credentials > OAuth client ID.

Set the Application type to Web application.

Under the Authorized redirect URIs section, click Add URI and paste exactly this single URL:
[https://developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)

Click Create (or Save).

Click the Pencil (Edit) Icon next to the newly created Web client to view and copy your Client ID and Client Secret.

Phase 2: Obtaining the Persistent Refresh Token
Open the Google OAuth 2.0 Playground.

Click the OAuth 2.0 Configuration (Gear Icon) in the top right corner.

Check the box for Use your own OAuth credentials.

Input the Client ID and Client Secret you copied from the Google Cloud Console. Click Close.

On the left side under Step 1 (Select & authorize APIs), scroll down to Drive API v3.

Expand it and check the box next to [https://www.googleapis.com/auth/drive](https://www.googleapis.com/auth/drive).

Click the blue Authorize APIs button.

Log in using your designated Test User Gmail account. If a warning screen appears ("Google hasn't verified this app"), click Advanced > Go to... (unsafe) to bypass it and grant permissions.

Upon redirection back to the Playground, Step 2 (Exchange authorization code for tokens) will open automatically.

Click the blue Exchange authorization code for tokens button.

Copy the long character string inside the "refresh_token" block from the JSON response on the bottom right.

3. System Architecture & Lifecycle Workflow
The end-to-end automated pipeline executes the following operations sequentially:

Trigger: A cron job initiates the backup process every night at 12:00 AM (Asia/Dhaka timezone).

Local Dump: The script uses the pg_dump utility to generate a compressed custom-format binary archive (.dump) of the PostgreSQL database schemas and data.

Authentication: The Google APIs client utilizes the hardcoded Client ID, Client Secret, and Refresh Token to dynamically request a temporary Access Token from Google's authorization servers.

Cloud Upload: The generated .dump file is securely streamed directly into the specified Google Drive folder.

Retention Cleanup: The script polls the Google Drive folder, sorts the files by creation date, and retains only the last 7 backups, automatically deleting older archives to conserve space.

Error Alerting: If any error occurs (database connection failure, cloud authentication error, network drop), a critical notification is dispatched to the administrator via email using Nodemailer.

Local Cleanup: In the finally block, the temporary local .dump file is deleted from the container space to ensure optimal storage usage.

4. Implementation Details
File Structure Reference
Plaintext
├── docker-compose.yml
└── backend/
    ├── backupScheduler.js
    └── server.js
Component Breakdown (backupScheduler.js)
JavaScript
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// ==========================================
// 1. HARDCODED OAUTH 2.0 CREDENTIALS
// ==========================================
const CLIENT_ID = 'your_google_client_id.apps.googleusercontent.com';
const CLIENT_SECRET = 'your_google_client_secret';
const REFRESH_TOKEN = 'your_google_refresh_token';
const FOLDER_ID = 'your_google_drive_folder_id';

// Initialize the Google OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

// Inject the Refresh Token
oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// ==========================================
// 2. NODEMAILER ALERT SYSTEM
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ALERT_EMAIL,
        pass: process.env.ALERT_EMAIL_PASSWORD
    }
});

async function sendAlert(subject, text) {
    try {
        await transporter.sendMail({
            from: process.env.ALERT_EMAIL,
            to: process.env.ALERT_EMAIL,
            subject: subject,
            text: text
        });
        console.log("Alert email sent successfully.");
    } catch (err) {
        console.error('Failed to send email alert:', err);
    }
}

// ==========================================
// 3. POSTGRESQL DUMP GENERATION
// ==========================================
function generatePGBackup() {
    return new Promise((resolve, reject) => {
        const fileName = `db-backup-${new Date().toISOString().replace(/:/g, '-')}.dump`;
        const filePath = path.join(__dirname, fileName);

        // Executes pg_dump command natively within the docker environment
        const command = `pg_dump -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -F c -b -v -f "${filePath}"`;

        exec(command, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (error) => {
            if (error) return reject(error);
            resolve({ filePath, fileName });
        });
    });
}

// ==========================================
// 4. GOOGLE DRIVE ROTATION & CLEANUP
// ==========================================
async function cleanupOldBackups() {
    const response = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc'
    });
    
    const files = response.data.files;
    
    // Retain only the 7 most recent backups
    if (files.length > 7) { 
        for (let i = 7; i < files.length; i++) {
            await drive.files.delete({ fileId: files[i].id });
            console.log(`[Cleanup] Deleted obsolete remote backup: ${files[i].name}`);
        }
    }
}

// ==========================================
// 5. CORE BACKUP ENGINE
// ==========================================
async function runBackupProcess() {
    let filePath = '';
    try {
        console.log(`[${new Date().toLocaleString()}] Backup process started using Hardcoded OAuth2...`);
        const backup = await generatePGBackup();
        filePath = backup.filePath;

        // Streams the generated dump file to the authorized Drive folder
        const response = await drive.files.create({
            requestBody: { name: backup.fileName, parents: [FOLDER_ID] },
            media: { mimeType: 'application/octet-stream', body: fs.createReadStream(filePath) }
        });

        console.log(`Backup successfully uploaded! File ID: ${response.data.id}`);
        await cleanupOldBackups();
    } catch (error) {
        console.error('Backup process crashed:', error);
        await sendAlert('CRITICAL: Google Drive Backup Failed!', `Error Detail: ${error.message}`);
    } finally {
        // Enforce deletion of the local file from disk space regardless of upload success/failure
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
            console.log("Local temporary backup file cleared.");
        }
    }
}

// ==========================================
// 6. SCHEDULER INITIALIZATION
// ==========================================
// Cron configuration running everyday at 00:00 midnight (Dhaka time)
cron.schedule('0 0 * * *', runBackupProcess, { scheduled: true, timezone: "Asia/Dhaka" });

module.exports = { runBackupProcess };
5. Security & Maintenance Recommendations
Token Lifetime and Expiry: Google OAuth 2.0 refresh tokens issued for apps set to the "Testing" status on the OAuth Consent screen will automatically expire after 14 days. To prevent your backup process from breaking every two weeks, you must log into your Google Cloud Console and click the "Publish App" button inside the OAuth Consent Screen page. This changes the status to "Production", making the Refresh Token permanent.

Migration to Secret Injection: Once production environments stabilize, it is recommended to extract these strings back out of the runtime code file (backupScheduler.js) and pass them using native container orchestration features to follow twelve-factor app methodologies.