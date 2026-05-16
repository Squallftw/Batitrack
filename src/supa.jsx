// ============================================================================
//  Batitrack — Supabase client, auth, and persistence layer
//  Loaded BEFORE any application module. Exposes window.bati.* helpers.
// ============================================================================

(function () {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────────
  // The publishable (anon) key is safe to embed in client code — security
  // relies on Row-Level Security policies on the Supabase side, not on
  // hiding this key. NEVER put a service_role key in this file.
  const SUPABASE_URL  = 'https://yaarnpduwcsmrxmrhrvw.supabase.co';
  const SUPABASE_KEY  = 'sb_publishable_ShDSm2hH-O6Hq1_Qzf9E3A_yn0GEaFh';
  const SAVE_DEBOUNCE = 1200;     // ms between auto-saves
  const SAVE_MAX_WAIT = 8000;     // ms — force save even if user keeps typing
  const IDLE_TIMEOUT  = 1000*60*60*8; // 8 h of inactivity → forced re-auth

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[batitrack] Supabase SDK missing. Check the <script> tag order.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession:   true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'batitrack.auth',
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-client-info': 'batitrack-web/1.0' },
    },
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function clamp(s, n) { return typeof s === 'string' ? s.slice(0, n) : s; }

  // Email validation: light client-side check; server is the real authority.
  function validEmail(s) {
    return typeof s === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim()) &&
      s.length <= 254;
  }

  // Password rules — keep moderate for testing; tighten before production.
  function passwordIssues(pw) {
    const issues = [];
    if (typeof pw !== 'string')              issues.push('Mot de passe invalide.');
    if (pw.length < 8)                        issues.push('Minimum 8 caractères.');
    if (pw.length > 128)                      issues.push('Maximum 128 caractères.');
    if (!/[A-Za-z]/.test(pw))                 issues.push('Au moins une lettre.');
    if (!/[0-9]/.test(pw))                    issues.push('Au moins un chiffre.');
    return issues;
  }

  // Human-readable error mapping (FR)
  function friendlyError(err) {
    if (!err) return null;
    const m = (err.message || '').toLowerCase();
    if (m.includes('invalid login'))          return 'Email ou mot de passe incorrect.';
    if (m.includes('email not confirmed'))    return 'Veuillez confirmer votre email avant de vous connecter.';
    if (m.includes('already registered'))     return 'Un compte existe déjà avec cet email.';
    if (m.includes('rate limit'))             return 'Trop de tentatives. Réessayez dans quelques minutes.';
    if (m.includes('network'))                return 'Problème de réseau. Vérifiez votre connexion.';
    if (m.includes('user not found'))         return 'Aucun compte avec cet email.';
    if (m.includes('weak password'))          return 'Mot de passe trop faible.';
    return err.message || 'Une erreur inattendue est survenue.';
  }

  // ── Session bootstrap ────────────────────────────────────────────────────
  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) { console.warn('[batitrack] getSession', error); return null; }
    return data.session || null;
  }

  async function signIn(email, password) {
    if (!validEmail(email))      return { error: 'Email invalide.' };
    const pwIssues = passwordIssues(password);
    if (pwIssues.length)         return { error: pwIssues[0] };
    const { data, error } = await client.auth.signInWithPassword({
      email: clamp(email.trim(), 254),
      password,
    });
    if (error) return { error: friendlyError(error) };
    return { session: data.session };
  }

  async function signUp(email, password) {
    if (!validEmail(email))      return { error: 'Email invalide.' };
    const pwIssues = passwordIssues(password);
    if (pwIssues.length)         return { error: pwIssues[0] };
    const { data, error } = await client.auth.signUp({
      email: clamp(email.trim(), 254),
      password,
      options: { emailRedirectTo: window.location.href.split('#')[0] },
    });
    if (error) return { error: friendlyError(error) };
    return { session: data.session, user: data.user, needsEmailConfirm: !data.session };
  }

  async function signOut() {
    try { await client.auth.signOut(); } catch (e) { console.warn(e); }
    try { localStorage.removeItem('batitrack.auth'); } catch (_) {}
    location.reload();
  }

  async function resetPassword(email) {
    if (!validEmail(email)) return { error: 'Email invalide.' };
    const { error } = await client.auth.resetPasswordForEmail(clamp(email.trim(), 254), {
      redirectTo: window.location.href.split('#')[0],
    });
    if (error) return { error: friendlyError(error) };
    return { ok: true };
  }

  // ── User state (JSONB blob) ──────────────────────────────────────────────
  async function loadUserState(userId) {
    const { data, error } = await client
      .from('user_state')
      .select('data, schema_ver, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('[batitrack] loadUserState', error);
      return { error: error.message };
    }
    if (!data) {
      // Trigger should have created the row — try inserting if missing.
      const ins = await client
        .from('user_state')
        .insert({ user_id: userId, data: {} })
        .select('data, schema_ver, updated_at')
        .single();
      if (ins.error) return { error: ins.error.message };
      return { state: ins.data.data || {}, updatedAt: ins.data.updated_at };
    }
    return { state: data.data || {}, updatedAt: data.updated_at };
  }

  async function saveUserStateNow(userId, state) {
    const payload = state || {};
    // Client-side soft cap. Server has hard 4 MiB cap.
    const approx = JSON.stringify(payload).length;
    if (approx > 3_500_000) {
      console.warn('[batitrack] state blob is large:', approx, 'bytes');
    }
    const { error } = await client
      .from('user_state')
      .upsert({ user_id: userId, data: payload }, { onConflict: 'user_id' });
    if (error) {
      console.error('[batitrack] saveUserState', error);
      window.dispatchEvent(new CustomEvent('bati:save-error', { detail: error.message }));
      return { error: error.message };
    }
    window.dispatchEvent(new CustomEvent('bati:saved'));
    return { ok: true };
  }

  // Debounced + max-wait save scheduler
  function makeSaver(userId) {
    let timer = null;
    let firstScheduled = 0;
    let pending = null;
    let saving = false;

    async function flush() {
      if (timer) { clearTimeout(timer); timer = null; }
      firstScheduled = 0;
      if (!pending || saving) return;
      saving = true;
      const snap = pending; pending = null;
      try {
        await saveUserStateNow(userId, snap);
      } finally {
        saving = false;
        // If something was queued during the save, flush again.
        if (pending) schedule(pending);
      }
    }

    function schedule(state) {
      pending = state;
      const now = Date.now();
      if (!firstScheduled) firstScheduled = now;
      if (timer) clearTimeout(timer);
      const sinceFirst = now - firstScheduled;
      const wait = sinceFirst >= SAVE_MAX_WAIT ? 0 : SAVE_DEBOUNCE;
      window.dispatchEvent(new CustomEvent('bati:saving'));
      timer = setTimeout(flush, wait);
    }

    // Persist on page hide too
    window.addEventListener('pagehide', () => { if (pending) flush(); });
    window.addEventListener('beforeunload', () => { if (pending) flush(); });

    return { schedule, flush };
  }

  // ── Audit log (append-only) ──────────────────────────────────────────────
  async function logAudit(userId, action, entity, label, meta) {
    try {
      await client.from('audit_log').insert({
        user_id: userId,
        action: clamp(String(action || ''), 64),
        entity: clamp(String(entity || ''), 64),
        label:  label ? clamp(String(label), 512) : null,
        meta:   meta || {},
      });
    } catch (e) { /* best-effort */ }
  }

  // ── Idle session expiry ──────────────────────────────────────────────────
  function startIdleWatch() {
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    ['mousemove','keydown','click','touchstart','visibilitychange']
      .forEach(ev => window.addEventListener(ev, bump, { passive: true }));
    setInterval(() => {
      if (Date.now() - last > IDLE_TIMEOUT) signOut();
    }, 60_000);
  }

  // ── Expose ───────────────────────────────────────────────────────────────
  window.bati = {
    client,
    getSession, signIn, signUp, signOut, resetPassword,
    loadUserState, saveUserStateNow,
    makeSaver,
    logAudit,
    startIdleWatch,
    // Validators (also usable by forms)
    validEmail, passwordIssues, clamp,
    friendlyError,
  };
})();
