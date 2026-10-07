/**
 * sherin.fun contact form: Google Apps Script web app.
 *
 * Every message from the walkie-talkie form is saved as a row in the Sheet this script belongs
 * to, and emailed to you. The site reads the answer ({ ok: true } or { ok: false, error }) to
 * show "message received" or "failed".
 *
 * Set up (once):
 *   1. Create a Google Sheet, then Extensions → Apps Script, and paste this file in.
 *   2. Deploy → New deployment → type "Web app".
 *      Execute as: Me.  Who has access: Anyone.  Deploy, allow the permissions it asks for.
 *   3. Copy the Web app URL (ends in /exec) into FORM_URL in src/data.js.
 *   4. To send as admin@sherin.fun: in that Google account's Gmail, Settings → Accounts →
 *      "Send mail as" → add admin@sherin.fun, using Zoho's server (smtp.zoho.eu, port 465, SSL).
 * After changing this code: Deploy → Manage deployments → edit → Version: New version, so the
 * same URL keeps working.
 */

const SHEET_NAME = 'Messages'
// Where new messages are emailed. Empty = the Google account that deployed the script.
const NOTIFY_EMAIL = 'admin@sherin.fun'
// The address the email comes from. It must be added in Gmail as a "Send mail as" address
// (Gmail → Settings → Accounts → Send mail as); until it is, mail comes from the Gmail account.
const FROM_EMAIL = 'admin@sherin.fun'
const MAX = { names: 100, email: 200, message: 5000 }
const PER_EMAIL_LIMIT = 3 // messages per address…
const PER_EMAIL_WINDOW = 600 // …per this many seconds
// Confirmation emails to visitors per day, so the form can't be used to mail lots of strangers
const CONFIRM_PER_DAY = 50

function doPost(e) {
  try {
    const p = (e && e.parameter) || {}

    // Spam trap: a hidden field people never see; bots fill in everything
    if (p.website) return reply({ ok: true })

    const names = clean(p.names, MAX.names)
    const email = clean(p.email, MAX.email)
    const message = clean(p.message, MAX.message)
    const page = clean(p.page, 300)
    if (!names || !message || !/^\S+@\S+\.\S+$/.test(email)) {
      return reply({ ok: false, error: 'missing-fields' })
    }

    // A few messages per address now and then are fine; a flood is not
    const cache = CacheService.getScriptCache()
    const key = 'n:' + email.toLowerCase()
    const count = Number(cache.get(key) || 0)
    if (count >= PER_EMAIL_LIMIT) return reply({ ok: false, error: 'too-many' })
    cache.put(key, String(count + 1), PER_EMAIL_WINDOW)

    const lock = LockService.getScriptLock()
    lock.waitLock(10000)
    try {
      sheet().appendRow([new Date(), names, email, message, page])
    } finally {
      lock.releaseLock()
    }

    notify({
      to: NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
      replyTo: email,
      subject: 'Incoming on CH 04: new message from ' + names,
      body: names + ' <' + email + '> wrote:\n\n' + message + '\n\n— sent from ' + (page || 'sherin.fun'),
      htmlBody: walkieMail({
        led: '#ff5a36',
        top: '▶ INCOMING ON CH 04',
        title: 'NEW MESSAGE FROM ' + names.toUpperCase(),
        quote: message,
        note: '<b>' + esc(names) + '</b> &lt;' + esc(email) + '&gt;<br>Sent from ' + esc(page || 'sherin.fun') + '. Hit <b>Reply</b> to answer on the same channel.',
      }),
    })

    // A copy back to the visitor, so they know it arrived (a failure here never fails the message)
    try {
      if (underDailyLimit()) confirmTo(names, email, message)
    } catch (err) {
      console.error('confirmation not sent', err)
    }

    return reply({ ok: true })
  } catch (err) {
    console.error(err)
    return reply({ ok: false, error: 'server' })
  }
}

// Send as admin@sherin.fun when Gmail has it as a "Send mail as" address, otherwise as the Gmail account
function notify({ to, replyTo, subject, body, htmlBody, name = 'sherin.fun walkie-talkie' }) {
  const extra = htmlBody ? { htmlBody } : {}
  if (FROM_EMAIL && GmailApp.getAliases().indexOf(FROM_EMAIL) !== -1) {
    GmailApp.sendEmail(to, subject, body, Object.assign({ from: FROM_EMAIL, name, replyTo }, extra))
  } else {
    MailApp.sendEmail(Object.assign({ to, replyTo, name, subject, body }, extra))
  }
}

// Thank-you email to the visitor, from admin@sherin.fun: the walkie-talkie answers back
function confirmTo(names, email, message) {
  const first = names.split(/\s+/)[0]
  // No emoji in subjects: they arrive garbled through the Zoho "Send mail as" route
  const subject = 'Roger that, ' + first + '!'
  const body =
    'ROGER THAT, ' + first.toUpperCase() + '!\n\n' +
    'Your message came through loud and clear on channel 04. I will call back on this channel soon.\n\n' +
    'What you sent:\n' + message + '\n\n' +
    'Over and out,\nSherin\nhttps://sherin.fun'
  const htmlBody = walkieMail({
    led: '#3ddc84',
    top: '▶ INCOMING · MESSAGE RECEIVED',
    title: 'ROGER THAT, ' + first.toUpperCase() + '!',
    quote: message,
    note: 'Loud and clear. I will call back on this channel soon.<br><b>Over and out — Sherin</b>',
    footer: 'You are getting this because this address was used on the walkie-talkie at sherin.fun.',
  })
  notify({ to: email, replyTo: FROM_EMAIL || undefined, subject, body, htmlBody, name: 'Sherin Varghese' })
}

// The yellow toy walkie-talkie from the site's contact section, built from tables and inline
// styles so it holds together in Gmail, Outlook and phone mail apps.
//   led: colour of the little light   top / title / quote: lines on the green screen
//   note: line under the screen (HTML)   footer: small print under the walkie (optional)
function walkieMail({ led, top, title, quote, note, footer }) {
  const INK = '#141312'
  const MONO = "font-family:'Courier New',Courier,monospace;"
  const SANS = 'font-family:Arial,Helvetica,sans-serif;'
  const grille = new Array(16).fill('<span style="display:inline-block;width:6px;height:34px;margin-right:7px;background:' + INK + ';border-radius:3px"></span>').join('')
  const tag = (t) => '<span style="display:inline-block;padding:4px 9px;border-radius:7px;background:' + INK + ';color:#ffc531;' + SANS + 'font-weight:bold;font-size:11px;letter-spacing:2px;vertical-align:middle">' + t + '</span>'
  const bars = [8, 12, 16, 20].map((h) => '<span style="display:inline-block;width:4px;height:' + h + 'px;margin-left:3px;background:' + INK + ';border-radius:1px;vertical-align:bottom"></span>').join('')
  // The site's logo, with the same styles as .brand / .brand-blocks in src/index.css
  const BRAND = "font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;"
  const block = (ch, bg, fg) => '<b style="display:inline-block;width:19px;height:23px;margin-left:2px;border-radius:5px;background:' + bg + ';color:' + fg + ';text-align:center;line-height:22px;font-size:15px;font-weight:800;box-shadow:inset 0 -3px 0 rgba(0,0,0,.22);vertical-align:middle;' + BRAND + '">' + ch + '</b>'
  const logo = '<a href="https://sherin.fun" style="text-decoration:none;white-space:nowrap">' +
    '<span style="' + BRAND + 'font-weight:700;font-size:18px;color:' + INK + ';vertical-align:middle">sherin<i style="font-style:normal;color:#ff5a36;margin:0 1px">.</i></span>' +
    block('f', '#ff5a36', '#f2ede4') + block('u', '#ffc531', INK) + block('n', '#3d5afe', '#f2ede4') + '</a>'
  return (
    // Ask mail apps that honour it (Apple Mail, Outlook) to keep the light colours in dark mode
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<style>@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&display=swap"); :root { color-scheme: light only; supported-color-schemes: light only; }</style>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ede4"><tr><td align="center" style="padding:32px 14px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffc531;border:4px solid ' + INK + ';border-radius:34px">' +
        '<tr><td style="padding:22px 22px 6px">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
            '<td style="white-space:nowrap"><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:' + led + ';border:2px solid ' + INK + ';margin-right:8px;vertical-align:middle"></span>' + tag('SHERIN · FUN') + '</td>' +
            '<td align="right" style="white-space:nowrap">' + tag('CH 04') + ' ' + bars + '</td>' +
          '</tr></table>' +
        '</td></tr>' +
        '<tr><td style="padding:10px 22px 0;font-size:0;line-height:0;white-space:nowrap;overflow:hidden">' + grille + '</td></tr>' +
        '<tr><td style="padding:16px 22px 0">' +
          // Dark green LCD with bright text: Gmail's dark mode leaves dark backgrounds and light text
          // alone, so the screen looks the same in light and dark mode
          '<div style="background:#0f2e14;border:3px solid ' + INK + ';border-radius:14px;padding:16px">' +
            '<div style="' + MONO + 'font-size:12px;font-weight:bold;letter-spacing:1px;color:#7ee08a">' + esc(top) + '</div>' +
            '<div style="' + MONO + 'font-size:20px;font-weight:bold;color:#b8f5a8;margin:8px 0">' + esc(title) + '</div>' +
            '<div style="' + MONO + 'font-size:13px;line-height:1.55;color:#8fd48f;white-space:pre-wrap">&ldquo;' + esc(quote) + '&rdquo;</div>' +
          '</div>' +
        '</td></tr>' +
        '<tr><td style="padding:14px 22px 22px"><div style="background:#fffdf3;border:3px solid ' + INK + ';border-radius:14px;padding:12px 16px;' + SANS + 'font-size:15px;line-height:1.6;color:' + INK + '">' + note + '</div></td></tr>' +
      '</table>' +
      '<div style="margin-top:18px">' + logo + '</div>' +
      (footer ? '<p style="margin:14px 0 0;' + SANS + 'font-size:12px;color:#8a8070">' + esc(footer) + '</p>' : '') +
    '</td></tr></table>'
  )
}

// Counts today's confirmation emails; false once the day's limit is reached
function underDailyLimit() {
  const props = PropertiesService.getScriptProperties()
  const today = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd')
  const key = 'confirm:' + today
  const sent = Number(props.getProperty(key) || 0)
  if (sent >= CONFIRM_PER_DAY) return false
  props.setProperty(key, String(sent + 1))
  return true
}

// Visitor text placed into the email's HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Opening the URL in a browser just says it is running
function doGet() {
  return reply({ ok: true, service: 'sherin.fun contact form' })
}

function sheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet()
  let s = book.getSheetByName(SHEET_NAME)
  if (!s) {
    s = book.insertSheet(SHEET_NAME)
    s.appendRow(['Time', 'Name', 'Email', 'Message', 'Page'])
    s.setFrozenRows(1)
    s.getRange('1:1').setFontWeight('bold')
  }
  return s
}

// Trimmed, length-capped, and never starting with = + - @ (so the Sheet never runs it as a formula)
function clean(v, max) {
  const s = String(v || '').trim().slice(0, max)
  return /^[=+\-@]/.test(s) ? "'" + s : s
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
