import { Icon } from '@/lib/klh';
import { Logo } from '@/ui/kit';
import '@/styles/login.css';

/**
 * Public page /app: download the student app for Android, install it, and create a login. The APK is served at
 * /download/ by the apk deployment (deploy/hostel/base/apk.yaml); the demo address gets the demo build.
 */
export default function AppDownload() {
  const demo = location.hostname.startsWith('demo-');
  const file = demo ? '/download/KL-Residencies-demo.apk' : '/download/KL-Residencies.apk';
  const step = (n: number, title: string, body: React.ReactNode) => (
    <li style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 10, alignItems: 'start' }}>
      <span style={{ width: 28, height: 28, borderRadius: 999, background: '#0B7A71', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>{n}</span>
      <span><b style={{ display: 'block', fontSize: 15 }}>{title}</b><span style={{ fontSize: 13.5, color: 'var(--ink-2, #475467)', lineHeight: 1.45 }}>{body}</span></span>
    </li>
  );
  return (
    <div className="login" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <section className="login-side" style={{ minHeight: '100vh' }}>
        <div className="login-card" style={{ maxWidth: 520 }}>
          <div style={{ marginBottom: 18 }}><Logo cut="full" height={44} /></div>
          <div className="login-head"><span className="login-hello">{demo ? 'Training app' : 'For residents'}</span><h2>KL Residencies student app</h2>
            <p>Outings, sick leave, weekly meal choice, fees, repairs and your room, on your Android phone.{demo ? ' This build uses the training data.' : ''}</p></div>
          <a className="login-submit" href={file} download style={{ textDecoration: 'none' }}><Icon name="download" size={18} />Download for Android · 56 MB</a>
          <h3 style={{ margin: '22px 0 10px', fontSize: 16 }}>Install it</h3>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {step(1, 'Download', 'Tap the button above. Use Wi-Fi if you can. If Chrome warns "this type of file can harm your device", tap Download anyway.')}
            {step(2, 'Open the file', 'When the download finishes, tap Open (or find KL-Residencies.apk in Files > Downloads).')}
            {step(3, 'Allow this one install', 'Android asks to allow apps from this source: tap Settings, switch on "Allow from this source", then press Back.')}
            {step(4, 'Install', 'Tap Install. If Play Protect asks, tap "More details" then "Install anyway". Then tap Open.')}
          </ol>
          <h3 style={{ margin: '22px 0 10px', fontSize: 16 }}>Create your login (first time or forgot password)</h3>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {step(1, 'Tap "Create my login"', 'On the app\'s sign-in screen, below the Sign in button.')}
            {step(2, 'Type your university ID', 'For example 2600040012, then tap Send me a code.')}
            {step(3, 'Open your university mail', <>The 6-digit code comes to <b>yourID@kluniversity.in</b> within a minute. Not there? Check Junk or Spam. It works for 10 minutes.</>)}
            {step(4, 'Type the code and a new password', '8 characters or more, with a letter and a digit. You are signed in straight away; next time sign in with your ID and this password.')}
          </ol>
          <p className="login-hint" style={{ marginTop: 18 }}>No Android phone, or an iPhone? Use the same steps on the website: <a href="/register"><b>Create my login</b></a>, then <a href="/">sign in</a>.</p>
          <p className="login-foot"><Icon name="lock" size={13} />Only download the app from this page. Nobody from the residency office will ask for your code or password.</p>
        </div>
      </section>
    </div>
  );
}
