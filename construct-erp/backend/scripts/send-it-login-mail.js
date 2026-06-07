const crypto = require('crypto');
const { query, pool } = require('../src/config/database');
const { sendMail } = require('../src/services/mail.service');

const EMAIL = 'it@bcim.in';
const LOGIN_URL = 'http://bcim.ddns.net:3000';

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function ensurePasswordResetSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at)`);
}

async function main() {
  await ensurePasswordResetSchema();

  const userRes = await query(
    `SELECT id, name, email, role, department
     FROM users
     WHERE LOWER(email) = $1 AND is_active = TRUE
     LIMIT 1`,
    [EMAIL]
  );

  const user = userRes.rows[0];
  if (!user) throw new Error(`Active user not found for ${EMAIL}`);

  await query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );

  const token = crypto.randomBytes(32).toString('hex');
  const resetUrl = `${LOGIN_URL}/reset-password?token=${token}`;
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
    [user.id, hashResetToken(token)]
  );

  const displayName = user.name || 'IT Admin';
  const subject = 'BCIM ERP Login Access Details';
  const text = [
    `Dear ${displayName},`,
    '',
    'Your BCIM ConstructERP login access details are provided below.',
    '',
    `ERP Login Page: ${LOGIN_URL}`,
    `Username: ${user.email}`,
    '',
    `Password Reset Link: ${resetUrl}`,
    '',
    'For security, the reset link is valid for 30 minutes. Please use it to set or reset your password before logging in.',
    '',
    'Regards,',
    'BCIM ERP Administration',
  ].join('\n');

  const html = `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px">
        <div style="background:#0a2057;border-radius:10px 10px 0 0;padding:24px 30px">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9cc3ff;font-weight:700">BCIM Engineering Private Limited</div>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;line-height:1.3">ConstructERP Login Access</h1>
        </div>
        <div style="background:#ffffff;border:1px solid #dbe4f0;border-top:none;border-radius:0 0 10px 10px;padding:30px">
          <p style="margin:0 0 14px;font-size:15px">Dear <strong>${displayName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155">
            Your BCIM ConstructERP login access details are provided below. Please use the password reset link to set or reset your password before logging in.
          </p>

          <table style="width:100%;border-collapse:collapse;margin:18px 0 24px;font-size:14px">
            <tr>
              <td style="width:145px;padding:12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;color:#475569">Login Page</td>
              <td style="padding:12px;border:1px solid #e2e8f0">
                <a href="${LOGIN_URL}" style="color:#0a4fb3;text-decoration:none;font-weight:700">${LOGIN_URL}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;color:#475569">Username</td>
              <td style="padding:12px;border:1px solid #e2e8f0;font-weight:700;color:#0f172a">${user.email}</td>
            </tr>
            <tr>
              <td style="padding:12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;color:#475569">Role</td>
              <td style="padding:12px;border:1px solid #e2e8f0">${user.role || '-'}</td>
            </tr>
          </table>

          <div style="text-align:center;margin:26px 0">
            <a href="${resetUrl}"
               style="display:inline-block;background:#0a2057;color:#ffffff;text-decoration:none;
                      padding:13px 28px;border-radius:7px;font-weight:700;font-size:15px">
              Set / Reset Password
            </a>
          </div>

          <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#64748b">
            If the button does not open, copy and paste this link into your browser:<br>
            <span style="word-break:break-all;color:#0a4fb3">${resetUrl}</span>
          </p>

          <div style="border-top:1px solid #e2e8f0;margin-top:22px;padding-top:16px;font-size:12px;line-height:1.6;color:#64748b">
            This password reset link is valid for <strong>30 minutes</strong>. For account security, please do not share this email or reset link with anyone.
          </div>

          <p style="margin:22px 0 0;font-size:14px;color:#334155">
            Regards,<br>
            <strong>BCIM ERP Administration</strong>
          </p>
        </div>
      </div>
    </div>
  `;

  const result = await sendMail({ to: user.email, subject, text, html });
  console.log(JSON.stringify({
    to: user.email,
    subject,
    sent: result.sent,
    provider: result.results?.find(r => r.sent)?.provider || null,
    reason: result.reason || null,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
