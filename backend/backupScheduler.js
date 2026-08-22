const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const logger = require('./utils/logger');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const BACKUP_ENABLED = process.env.ENABLE_DB_BACKUP === 'true';

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
});


const drive = google.drive({ version: 'v3', auth: oauth2Client });

logger.info('Google OAuth credentials loaded from environment.');

// Gmail notification setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ALERT_EMAIL,
        pass: process.env.ALERT_EMAIL_PASSWORD
    }
});

// Send mail to system admin if backup fails
async function sendMailToSystemAdmin(subject, text) {
    try {
        await transporter.sendMail({
            from: process.env.ALERT_EMAIL,
            to: process.env.ALERT_EMAIL,
            subject: subject,
            text: text
        });
        logger.info('Alert email sent.');
    } catch (err) {
        logger.error('Failed to send alert email', err);
    }
}

// Generate PG backup using pg_dump in plain-text SQL format
function generatePGBackup() {
    return new Promise((resolve, reject) => {
        const fileName = `db-backup-${new Date().toISOString().split('T')[0]}.sql`;
        const filePath = path.join(__dirname, fileName);

        const command = `pg_dump -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -F p -b -v -f "${filePath}"`;

        exec(command, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (error) => {
            if (error) return reject(error);
            resolve({ filePath, fileName });
        });
    });
}

// Cleanup old backups (keep last 30 days backups)
async function cleanupOldBackups() {
    const response = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc'
    });
    const files = response.data.files;
    if (files.length > 30) {
        for (let i = 30; i < files.length; i++) {
            await drive.files.delete({ fileId: files[i].id });
            logger.info(`[Cleanup] Old backup deleted: ${files[i].name}`);
        }
    }
}

// Main backup function (runs every day at 12 AM)
async function runBackupProcess() {
    let filePath = '';
    try {
        logger.info('Backup process started using OAuth2...');
        const backup = await generatePGBackup();
        filePath = backup.filePath;

        const response = await drive.files.create({
            requestBody: { name: backup.fileName, parents: [FOLDER_ID] },
            media: { mimeType: 'application/octet-stream', body: fs.createReadStream(filePath) }
        });

        logger.info(`Backup successfully uploaded! File ID: ${response.data.id}`);
        await cleanupOldBackups();
    } catch (error) {
        logger.error('Backup process crashed', error);
        await sendMailToSystemAdmin('CRITICAL: Google Drive Backup Failed!', `Error Detail: ${error.message}`);
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

// Cron job: Every day at 12 AM (only runs where ENABLE_DB_BACKUP=true, i.e. the server)
if (BACKUP_ENABLED) {
    cron.schedule('0 0 * * *', runBackupProcess, { scheduled: true, timezone: "Asia/Dhaka" });
    logger.info('DB backup cron scheduled (ENABLE_DB_BACKUP=true).');
} else {
    logger.info('DB backup cron disabled (ENABLE_DB_BACKUP not set to true).');
}

// Run immediately for testing (remove this line after successful testing)
runBackupProcess();