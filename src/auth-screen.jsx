// ============================================================================
//  Batitrack — Auth screen (Login / Signup / Reset)
//  Rendered into #root BEFORE the rest of the app loads.
// ============================================================================

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = React.useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [password2, setPassword2] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [info, setInfo] = React.useState(null);
  const [showPw, setShowPw] = React.useState(false);

  // Light client-side throttle to discourage rapid retries
  const lastAttempt = React.useRef(0);
  const cooldown = 700; // ms

  function reset() { setError(null); setInfo(null); }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const now = Date.now();
    if (now - lastAttempt.current < cooldown) return;
    lastAttempt.current = now;
    reset();
    setBusy(true);
    try {
      if (mode === 'signin') {
        const r = await window.bati.signIn(email, password);
        if (r.error) { setError(r.error); return; }
        onAuthed();
      } else if (mode === 'signup') {
        if (password !== password2) { setError('Les mots de passe ne correspondent pas.'); return; }
        const r = await window.bati.signUp(email, password);
        if (r.error) { setError(r.error); return; }
        if (r.needsEmailConfirm) {
          setInfo('Compte créé. Vérifiez votre email pour confirmer votre adresse, puis connectez-vous.');
          setMode('signin');
        } else {
          onAuthed();
        }
      } else if (mode === 'reset') {
        const r = await window.bati.resetPassword(email);
        if (r.error) { setError(r.error); return; }
        setInfo('Si un compte existe pour cet email, un lien de réinitialisation vient d\'être envoyé.');
      }
    } finally {
      setBusy(false);
    }
  }

  const pwIssues = mode === 'signup' && password ? window.bati.passwordIssues(password) : [];
  const emailOk = !email || window.bati.validEmail(email);

  return (
    <div style={authStyles.page}>
      <div style={authStyles.motif}/>
      <div style={authStyles.card}>
        <header style={authStyles.header}>
          <div style={authStyles.brandRow}>
            <div style={authStyles.brandMark}>B</div>
            <div>
              <div style={authStyles.brandName}>Batitrack</div>
              <div style={authStyles.brandTag}>Suivi des coûts main d'œuvre</div>
            </div>
          </div>
        </header>

        <div style={authStyles.tabs}>
          <button type="button" onClick={() => { reset(); setMode('signin'); }}
                  style={{ ...authStyles.tab, ...(mode==='signin' ? authStyles.tabActive : {}) }}>
            Connexion
          </button>
          <button type="button" onClick={() => { reset(); setMode('signup'); }}
                  style={{ ...authStyles.tab, ...(mode==='signup' ? authStyles.tabActive : {}) }}>
            Créer un compte
          </button>
        </div>

        <form onSubmit={submit} style={authStyles.form} autoComplete="on" noValidate>
          <label style={authStyles.field}>
            <span style={authStyles.label}>Email</span>
            <input type="email" name="email" value={email}
                   onChange={e => setEmail(e.target.value)}
                   autoComplete={mode==='signup' ? 'email' : 'username'}
                   maxLength={254}
                   placeholder="vous@entreprise.ma"
                   required
                   style={{ ...authStyles.input, ...(email && !emailOk ? authStyles.inputErr : {}) }}/>
          </label>

          {mode !== 'reset' && (
            <label style={authStyles.field}>
              <span style={authStyles.label}>Mot de passe</span>
              <div style={authStyles.pwRow}>
                <input type={showPw ? 'text' : 'password'} name="password" value={password}
                       onChange={e => setPassword(e.target.value)}
                       autoComplete={mode==='signup' ? 'new-password' : 'current-password'}
                       maxLength={128}
                       minLength={8}
                       placeholder={mode==='signup' ? '8+ caractères, lettres et chiffres' : '••••••••'}
                       required
                       style={authStyles.input}/>
                <button type="button" onClick={() => setShowPw(s => !s)} style={authStyles.pwToggle}
                        aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showPw ? 'Masquer' : 'Voir'}
                </button>
              </div>
              {mode==='signup' && pwIssues.length > 0 && (
                <ul style={authStyles.pwHints}>
                  {pwIssues.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              )}
            </label>
          )}

          {mode === 'signup' && (
            <label style={authStyles.field}>
              <span style={authStyles.label}>Confirmer le mot de passe</span>
              <input type={showPw ? 'text' : 'password'} value={password2}
                     onChange={e => setPassword2(e.target.value)}
                     autoComplete="new-password"
                     maxLength={128}
                     required
                     style={{ ...authStyles.input,
                              ...(password2 && password !== password2 ? authStyles.inputErr : {}) }}/>
            </label>
          )}

          {error && <div style={authStyles.alertErr} role="alert">{error}</div>}
          {info  && <div style={authStyles.alertInfo} role="status">{info}</div>}

          <button type="submit" disabled={busy} style={{ ...authStyles.submit, ...(busy ? authStyles.submitBusy : {}) }}>
            {busy ? 'Veuillez patienter…' :
              mode==='signin' ? 'Se connecter' :
              mode==='signup' ? 'Créer mon compte' :
              'Envoyer le lien de réinitialisation'}
          </button>

          <div style={authStyles.linksRow}>
            {mode === 'signin' && (
              <button type="button" style={authStyles.linkBtn}
                      onClick={() => { reset(); setMode('reset'); }}>
                Mot de passe oublié ?
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" style={authStyles.linkBtn}
                      onClick={() => { reset(); setMode('signin'); }}>
                ← Retour à la connexion
              </button>
            )}
          </div>
        </form>

        <footer style={authStyles.foot}>
          <div>Vos données sont privées : chaque compte ne voit que ses propres chantiers.</div>
          <div style={authStyles.footMuted}>Connexion sécurisée via Supabase · v1.0</div>
        </footer>
      </div>
    </div>
  );
}

const authStyles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', background: '#FAF7F1', position: 'relative', overflow: 'hidden',
    fontFamily: "'Manrope', system-ui, sans-serif", color: '#1F2421',
  },
  motif: {
    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
    backgroundImage:
      'repeating-linear-gradient(45deg, rgba(14,84,96,0.04) 0 2px, transparent 2px 14px),' +
      'repeating-linear-gradient(-45deg, rgba(14,84,96,0.04) 0 2px, transparent 2px 14px)',
  },
  card: {
    position: 'relative', width: '100%', maxWidth: 420,
    background: '#FFFFFF', border: '1px solid #E8E2D8', borderRadius: 16,
    padding: '28px 28px 22px', boxShadow: '0 10px 40px -12px rgba(31,36,33,0.18)',
  },
  header: { marginBottom: 18 },
  brandRow: { display: 'flex', alignItems: 'center', gap: 12 },
  brandMark: {
    width: 44, height: 44, borderRadius: 12, background: '#0E5460', color: '#fff',
    display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22, letterSpacing: -0.5,
  },
  brandName: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  brandTag:  { fontSize: 12, color: '#6B6359', marginTop: 1 },
  tabs: {
    display: 'flex', gap: 4, background: '#F5EFE3', padding: 4, borderRadius: 10, marginBottom: 18,
  },
  tab: {
    flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent',
    fontSize: 13, fontWeight: 600, color: '#6B6359', cursor: 'pointer',
    fontFamily: 'inherit',
  },
  tabActive: { background: '#FFFFFF', color: '#1F2421', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: '#6B6359', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: '#fff', border: '1px solid #E8E2D8', borderRadius: 9,
    padding: '10px 12px', fontSize: 14, color: '#1F2421',
    fontFamily: 'inherit', outline: 'none',
  },
  inputErr: { borderColor: '#C25B3F', boxShadow: '0 0 0 3px rgba(194,91,63,0.12)' },
  pwRow: { display: 'flex', gap: 6, alignItems: 'stretch' },
  pwToggle: {
    border: '1px solid #E8E2D8', background: '#fff', borderRadius: 9, padding: '0 10px',
    fontSize: 12, color: '#6B6359', cursor: 'pointer', fontFamily: 'inherit',
  },
  pwHints: { margin: '4px 0 0 2px', padding: 0, listStyle: 'none', fontSize: 11, color: '#6B6359', lineHeight: 1.5 },
  alertErr:  { padding: '10px 12px', background: '#F8E1D9', color: '#7A2814', borderRadius: 9, fontSize: 13, border: '1px solid #ECC2B3' },
  alertInfo: { padding: '10px 12px', background: '#D8E5E7', color: '#0B3A43', borderRadius: 9, fontSize: 13, border: '1px solid #B6CCD0' },
  submit: {
    marginTop: 4, padding: '11px 14px', background: '#0E5460', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  submitBusy: { opacity: 0.7, cursor: 'wait' },
  linksRow: { display: 'flex', justifyContent: 'space-between', marginTop: 2 },
  linkBtn:  {
    background: 'none', border: 'none', color: '#0E5460', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', padding: 0, fontFamily: 'inherit',
  },
  foot: {
    marginTop: 20, paddingTop: 16, borderTop: '1px solid #F0EAE0',
    fontSize: 11, color: '#6B6359', lineHeight: 1.6, textAlign: 'center',
  },
  footMuted: { color: '#9A9085', marginTop: 4 },
};

// Splash shown while user state is being loaded after auth
function AuthLoading() {
  return (
    <div style={authStyles.page}>
      <div style={{ ...authStyles.card, textAlign: 'center', padding: '40px 28px' }}>
        <div style={{ ...authStyles.brandMark, margin: '0 auto 14px' }}>B</div>
        <div style={{ fontSize: 14, color: '#6B6359' }}>Chargement de votre espace…</div>
      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
window.AuthLoading = AuthLoading;
