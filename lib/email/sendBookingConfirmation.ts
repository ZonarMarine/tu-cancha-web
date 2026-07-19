/**
 * TuCancha — Booking confirmation email
 *
 * Sends a branded confirmation email via Resend after a reservation is confirmed.
 * All styles are inline so the email renders correctly in Gmail, Apple Mail,
 * Outlook, and mobile clients.
 *
 * Environment variables required:
 *   RESEND_API_KEY      — Resend secret key
 *   EMAIL_FROM          — "TuCancha <reservas@tucanchacr.com>"
 *   SITE_URL            — "https://www.tucanchacr.com"
 */
import { Resend } from 'resend';

// Lazy — do NOT instantiate at module load time.
// Resend throws in its constructor when the key is empty, which crashes
// the Next.js build if RESEND_API_KEY isn't set in the build environment.
function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY!);
}

const FROM    = process.env.EMAIL_FROM ?? 'TuCancha <reservas@tucanchacr.com>';
const SITE    = (process.env.SITE_URL ?? 'https://www.tucanchacr.com').replace(/\/$/, '');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingConfirmationParams {
  to:              string;   // player email
  userName:        string;   // player display name
  bookingId:       string;   // UUID — used as reservation code
  courtName:       string;
  sport:           string;
  date:            string;   // 'YYYY-MM-DD'
  time:            string;   // 'HH:MM AM/PM'
  duration:        number;   // hours
  location:        string;
  players:         number;
  totalPaid:       number;   // CRC colones (integer)
  reservationCode: string;   // bookingId or short code
  viewUrl?:        string;   // override CTA href
}

export interface EmailResult {
  success:  boolean;
  messageId?: string;
  error?:   string;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  // '2024-12-25' → 'miércoles, 25 de diciembre de 2024'
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtColones(n: number): string {
  return '₡' + Math.round(n).toLocaleString('es-CR');
}

function shortCode(bookingId: string): string {
  // Last 8 chars of UUID uppercased — e.g. "A1B2C3D4"
  return bookingId.replace(/-/g, '').slice(-8).toUpperCase();
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(p: BookingConfirmationParams): string {
  const viewUrl = p.viewUrl ?? `${SITE}/reserva/${p.bookingId}`;
  const code    = shortCode(p.reservationCode || p.bookingId);
  const dateStr = formatDate(p.date);
  const total   = fmtColones(p.totalPaid);
  const dur     = p.duration === 1 ? '1 hora' : `${p.duration} horas`;

  const details: { label: string; value: string }[] = [
    { label: 'Cancha',         value: p.courtName          },
    { label: 'Deporte',        value: p.sport               },
    { label: 'Fecha',          value: dateStr               },
    { label: 'Hora',           value: p.time                },
    { label: 'Duración',       value: dur                   },
    { label: 'Ubicación',      value: p.location            },
    { label: 'Jugadores',      value: `${p.players} jugadores` },
    { label: 'Total pagado',   value: total                 },
  ];

  const detailRows = details.map(({ label, value }, i) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:0.03em;text-transform:uppercase;width:42%;vertical-align:top;">${label}</td>
      <td style="padding:11px 0 11px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13.5px;font-weight:600;color:rgba(255,255,255,0.88);vertical-align:top;">${value}</td>
    </tr>
  `).join('');

  const steps = [
    'Llegá 10 minutos antes de tu horario.',
    'Mostrá este correo si te lo solicitan en la cancha.',
    'Coordiná con tu equipo desde TuCancha.',
    'Si necesitás cancelar, revisá la política de la cancha.',
  ];

  const stepRows = steps.map((s, i) => `
    <tr>
      <td style="width:28px;vertical-align:top;padding-bottom:12px;">
        <div style="width:22px;height:22px;background:rgba(215,255,0,0.1);border:1px solid rgba(215,255,0,0.2);border-radius:50%;display:inline-block;text-align:center;line-height:22px;font-size:10px;font-weight:900;color:#D7FF00;">${i + 1}</div>
      </td>
      <td style="font-size:13px;color:rgba(255,255,255,0.55);padding-bottom:12px;padding-left:10px;line-height:1.5;">${s}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reserva confirmada — TuCancha</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width:620px) {
      .email-card { width:100% !important; border-radius:0 !important; }
      .email-body { padding:24px 20px !important; }
      .detail-grid td { display:block; width:100% !important; padding-left:0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#050505;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#050505;line-height:1px;">
    Tu cancha ya está reservada. Aquí están los detalles de tu partido. &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email wrapper -->
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#050505">
    <tr>
      <td align="center" style="padding:40px 16px 56px;">

        <!-- Card -->
        <table role="presentation" class="email-card" width="580" border="0" cellpadding="0" cellspacing="0"
          style="max-width:580px;width:100%;background:#111111;border-radius:18px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">

          <!-- ── Lime header bar ── -->
          <tr>
            <td bgcolor="#D7FF00" style="background:#D7FF00;padding:13px 28px;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:17px;font-weight:900;color:#000;letter-spacing:-0.05em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Tu<span style="color:#000;">Cancha</span></span>
                  </td>
                  <td align="right">
                    <span style="font-size:9.5px;font-weight:700;color:rgba(0,0,0,0.45);letter-spacing:0.08em;text-transform:uppercase;">RESERVA CONFIRMADA</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td class="email-body" style="padding:32px 28px 28px;">

              <!-- Status badge -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.18);border-radius:99px;padding:5px 14px;">
                    <span style="font-size:10.5px;font-weight:800;color:#34D399;letter-spacing:0.1em;">✓&nbsp; CONFIRMADA</span>
                  </td>
                </tr>
              </table>

              <!-- Greeting + heading -->
              <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.35);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Hola, ${p.userName}</p>
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.04em;line-height:1.15;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Tu reserva está confirmada
              </h1>
              <p style="margin:0 0 28px;font-size:13.5px;color:rgba(255,255,255,0.42);line-height:1.65;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Tu cancha ya está reservada. Te esperamos para jugar.
              </p>

              <!-- ── Booking details card ── -->
              <table role="presentation" class="detail-grid" width="100%" border="0" cellpadding="0" cellspacing="0"
                style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:6px 18px;margin-bottom:24px;">
                <tr>
                  <td style="padding:6px 0 0;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                      ${detailRows}
                      <!-- Reservation code row — highlighted -->
                      <tr>
                        <td style="padding:13px 0 6px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:0.03em;text-transform:uppercase;width:42%;vertical-align:middle;">Código</td>
                        <td style="padding:13px 0 6px 16px;vertical-align:middle;">
                          <span style="display:inline-block;background:rgba(215,255,0,0.07);border:1px solid rgba(215,255,0,0.18);border-radius:8px;padding:5px 12px;font-size:14px;font-weight:900;color:#D7FF00;letter-spacing:0.1em;font-family:'Courier New',monospace;">${code}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── Qué sigue ── -->
              <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.08em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">QUÉ SIGUE</p>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${stepRows}
              </table>

              <!-- ── CTA button ── -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="border-radius:11px;background:#D7FF00;">
                    <a href="${viewUrl}"
                      style="display:inline-block;padding:13px 28px;font-size:13.5px;font-weight:800;color:#000;text-decoration:none;letter-spacing:-0.02em;border-radius:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      Ver mi reserva →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="padding:0 28px;">
              <div style="height:1px;background:rgba(255,255,255,0.05);"></div>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:20px 28px 28px;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:13px;font-weight:900;color:rgba(255,255,255,0.6);letter-spacing:-0.03em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Tu<span style="color:#D7FF00;">Cancha</span></span>
                    <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.22);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Jugá hoy. Sin organizar nada.</p>
                  </td>
                  <td align="right" style="vertical-align:bottom;">
                    <a href="https://instagram.com/tucanchacr" style="font-size:11px;color:rgba(255,255,255,0.25);text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">@tucanchacr</a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:10.5px;color:rgba(255,255,255,0.15);line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Recibiste este correo porque realizaste una reserva en TuCancha.
                Si no realizaste esta reserva, contactanos a <a href="mailto:hola@tucanchacr.com" style="color:rgba(215,255,0,0.4);text-decoration:none;">hola@tucanchacr.com</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─── Plain text fallback ──────────────────────────────────────────────────────

function buildText(p: BookingConfirmationParams): string {
  const code    = shortCode(p.reservationCode || p.bookingId);
  const dateStr = formatDate(p.date);
  const total   = fmtColones(p.totalPaid);
  const dur     = p.duration === 1 ? '1 hora' : `${p.duration} horas`;
  const viewUrl = p.viewUrl ?? `${SITE}/reserva/${p.bookingId}`;

  return `
TuCancha — Reserva confirmada
==============================

Hola ${p.userName},

Tu reserva está confirmada. Tu cancha ya está reservada. ¡Te esperamos para jugar!

DETALLES DE LA RESERVA
-----------------------
Cancha:        ${p.courtName}
Deporte:       ${p.sport}
Fecha:         ${dateStr}
Hora:          ${p.time}
Duración:      ${dur}
Ubicación:     ${p.location}
Jugadores:     ${p.players}
Total pagado:  ${total}
Código:        ${code}
Estado:        Confirmada

QUÉ SIGUE
----------
1. Llegá 10 minutos antes de tu horario.
2. Mostrá este correo si te lo solicitan en la cancha.
3. Coordiná con tu equipo desde TuCancha.
4. Si necesitás cancelar, revisá la política de la cancha.

Ver mi reserva: ${viewUrl}

---
TuCancha — Jugá hoy. Sin organizar nada.
Instagram: @tucanchacr
  `.trim();
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Sends a TuCancha-branded booking confirmation email.
 * Returns { success: true, messageId } on success.
 * Returns { success: false, error } on failure — never throws.
 */
export async function sendBookingConfirmationEmail(
  params: BookingConfirmationParams,
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping confirmation email');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const { data, error } = await getResend().emails.send({
      from:    FROM,
      to:      params.to,
      subject: 'Tu reserva en TuCancha está confirmada ✅',
      html:    buildHtml(params),
      text:    buildText(params),
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('[email] Confirmation sent:', data?.id, '→', params.to);
    return { success: true, messageId: data?.id ?? undefined };

  } catch (err: any) {
    console.error('[email] Unexpected error:', err);
    return { success: false, error: err.message ?? 'Unknown error' };
  }
}

/**
 * Sends a test email to a developer address.
 * Use from a one-off script or admin route to verify rendering.
 */
export async function sendTestConfirmationEmail(to: string): Promise<EmailResult> {
  return sendBookingConfirmationEmail({
    to,
    userName:        'Alejandro (Test)',
    bookingId:       'test-00000000-0000-0000-0000-000000000001',
    courtName:       'Twelve Academy — Cancha 1',
    sport:           'Fútbol',
    date:            new Date().toISOString().split('T')[0],
    time:            '7:00 PM',
    duration:        1,
    location:        'San Rafael · Alajuela',
    players:         10,
    totalPaid:       25000,
    reservationCode: 'test-00000000-0000-0000-0000-000000000001',
    viewUrl:         `${SITE}/reserva/test`,
  });
}
