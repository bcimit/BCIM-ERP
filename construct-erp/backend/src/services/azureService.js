// Azure/OneDrive integration service — uploads files to user's OneDrive
const { ClientSecretCredential } = require('@azure/identity');
const fetch = require('node-fetch');

const TENANT_ID = process.env.ONEDRIVE_TENANT_ID;
const CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET;
const USER_EMAIL = process.env.ONEDRIVE_USER_EMAIL;

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
    const token = await credential.getToken('https://graph.microsoft.com/.default');
    cachedToken = token.token;
    tokenExpiry = token.expiresOnTimestamp * 1000 - 60000; // Refresh 1 min before expiry
    return cachedToken;
  } catch (e) {
    console.error('Azure token error:', e.message);
    throw new Error('Failed to get Azure access token: ' + e.message);
  }
}

async function uploadToSharePoint(fileName, fileBuffer, folderPath = 'Vendor Invoices') {
  try {
    const token = await getAccessToken();
    const sanitizedFileName = String(fileName).replace(/[<>:"|?*]/g, '_').trim();
    const sanitizedFolder = String(folderPath).replace(/[<>:"|?*]/g, '_').trim();

    // Upload file to OneDrive (using /users/{email}/drive root)
    // Path: /users/{email}/drive/root:/{folderPath}/{fileName}:/content
    const uploadUrl = `https://graph.microsoft.com/v1.0/users/${USER_EMAIL}/drive/root:/${sanitizedFolder}/${sanitizedFileName}:/content`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${error}`);
    }

    const driveItem = await uploadRes.json();
    return {
      id: driveItem.id,
      webUrl: driveItem.webUrl,
      downloadUrl: driveItem['@microsoft.graph.downloadUrl'],
    };
  } catch (e) {
    console.error('OneDrive upload error:', e.message);
    throw new Error(`Failed to upload to OneDrive: ${e.message}`);
  }
}

module.exports = {
  uploadToSharePoint,
};
