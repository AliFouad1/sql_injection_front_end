import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Eye, EyeOff, Lock, User, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import api from '../services/api';

// ─────────────────────────────────────────────────────────
// All attacks grouped by category for the demo selector
// ─────────────────────────────────────────────────────────
const ATTACK_GROUPS = [
  {
    category: 'Authentication Bypass',
    color: 'var(--red)',
    attacks: [
      { label: 'OR 1=1 (always true)',     payload: "' OR 1=1 --",              username: 'admin' },
      { label: "OR '1'='1' (string form)", payload: "' OR '1'='1' --",          username: 'admin' },
      { label: 'AND tautology',            payload: "' AND '1'='1' --",         username: 'admin' },
    ],
  },
  {
    category: 'Data Extraction',
    color: 'var(--accent)',
    attacks: [
      { label: 'UNION — dump all users',      payload: "' UNION SELECT username,password FROM auth_user --", username: 'admin' },
      { label: 'UNION — 2 column match',      payload: "' UNION SELECT username,email FROM auth_user --",   username: 'admin' },
      { label: 'Schema enumeration',          payload: "' UNION SELECT table_name,2 FROM information_schema.tables --", username: 'admin' },
      { label: 'Column enumeration',          payload: "' UNION SELECT column_name,2 FROM information_schema.columns --", username: 'admin' },
    ],
  },
  {
    category: 'Destructive (DDL/DML)',
    color: 'var(--red)',
    attacks: [
      { label: 'DROP TABLE users',             payload: "'; DROP TABLE auth_user; --",             username: 'admin' },
      { label: 'DELETE all records',           payload: "'; DELETE FROM auth_user WHERE 1=1; --",  username: 'admin' },
      { label: 'INSERT backdoor admin',        payload: "'; INSERT INTO auth_user(username,password,is_staff) VALUES('hacker','x',1); --", username: 'admin' },
      { label: 'UPDATE — change password',     payload: "'; UPDATE auth_user SET password='hacked' WHERE username='admin'; --", username: 'admin' },
    ],
  },
  {
    category: 'Blind — Time Based',
    color: 'var(--yellow)',
    attacks: [
      { label: 'SLEEP(5) — MySQL',             payload: "' AND SLEEP(5) --",                    username: 'admin' },
      { label: 'SLEEP with condition',         payload: "' AND IF(1=1, SLEEP(5), 0) --",        username: 'admin' },
      { label: 'WAITFOR DELAY — MSSQL',        payload: "'; WAITFOR DELAY '0:0:5' --",          username: 'admin' },
      { label: 'BENCHMARK timing — MySQL',     payload: "' AND BENCHMARK(5000000,MD5('x')) --", username: 'admin' },
    ],
  },
  {
    category: 'Blind — Boolean',
    color: 'var(--yellow)',
    attacks: [
      { label: 'IF true/false condition',      payload: "' AND IF(1=1,'a','b')='a' --",         username: 'admin' },
      { label: 'CASE WHEN true',               payload: "' AND CASE WHEN 1=1 THEN 1 ELSE 0 END=1 --", username: 'admin' },
    ],
  },
  {
    category: 'Obfuscation / Bypass',
    color: 'var(--purple)',
    attacks: [
      { label: 'Hex encoded "admin"',          payload: '0x61646d696e',                         username: 'admin' },
      { label: 'CHAR() obfuscation',           payload: "' OR username=CHAR(97,100,109,105,110) --", username: 'admin' },
      { label: 'Inline comment /**/ bypass',   payload: "ad/**/min' OR 1=1 --",                 username: 'test' },
      { label: 'Double-dash comment',          payload: "admin'--",                              username: 'admin' },
      { label: 'Hash comment (MySQL)',          payload: "admin'#",                               username: 'admin' },
    ],
  },
  {
    category: 'File System',
    color: 'var(--green)',
    attacks: [
      { label: 'Read /etc/passwd',             payload: "' UNION SELECT LOAD_FILE('/etc/passwd'),2 --", username: 'admin' },
      { label: 'Write web shell',              payload: "' UNION SELECT '<?php system($_GET[c]);?>',2 INTO OUTFILE '/var/www/shell.php' --", username: 'admin' },
    ],
  },
  {
    category: 'Stored Procedure (MSSQL)',
    color: 'var(--accent)',
    attacks: [
      { label: 'xp_cmdshell whoami',           payload: "'; EXEC xp_cmdshell('whoami'); --",    username: 'admin' },
      { label: 'xp_cmdshell net user',         payload: "'; EXEC xp_cmdshell('net user'); --",  username: 'admin' },
      { label: 'sp_ stored procedure',         payload: "'; EXEC sp_configure 'show advanced options', 1; --", username: 'admin' },
    ],
  },
];

export default function Login() {
  const { login, lang } = useApp();
  const t = translations[lang];
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [blockedPayload, setBlockedPayload] = useState('');
  const [openGroup, setOpenGroup] = useState(null);
  const [selected, setSelected] = useState(null); // { groupIdx, attackIdx }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBlocked(false); setBlockedPayload('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login/', form);
      login(res.data.user, res.data.tokens);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.blocked) {
        setBlocked(true);
        setBlockedPayload(form.password);
      } else {
        setError(err.response?.data?.error || t.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const injectAttack = (attack, groupIdx, attackIdx) => {
    setForm({ username: attack.username, password: attack.payload });
    setSelected({ groupIdx, attackIdx });
    setError(''); setBlocked(false); setBlockedPayload('');
  };

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40 }}>
      <div style={{ width: '100%', maxWidth: 960, display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24, margin: '0 auto' }}>

        {/* ── LEFT: Login form ── */}
        <div className="auth-box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 24 }}>
          <div className="auth-logo">
            <div className="shield">🛡️</div>
            <h1>{t.loginTitle}</h1>
            <p>{t.loginSubtitle}</p>
          </div>

          {blocked && (
            <div className="alert alert-error" style={{ flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <AlertTriangle size={16} /> {t.blocked}
              </div>
              <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>
                🚫 تم حظر الطلب المشبوه
              </div>
              {blockedPayload && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--yellow)', background: 'rgba(0,0,0,0.3)', padding: '5px 8px', borderRadius: 4, wordBreak: 'break-all', marginTop: 2 }}>
                  {blockedPayload.slice(0, 80)}{blockedPayload.length > 80 ? '…' : ''}
                </div>
              )}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                This attempt has been logged to the attack database.
              </div>
            </div>
          )}
          {error && !blocked && (
            <div className="alert alert-error"><AlertTriangle size={15} />{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t.username}</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  placeholder="username"
                  required autoFocus autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t.password}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  required autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><div className="spinner" />{t.loggingIn}</> : <><Shield size={16} />{t.signIn}</>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 14, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            {t.noAccount} <Link to="/register" style={{ color: 'var(--accent)' }}>{t.signUp}</Link>
          </p>

          <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            💡 Real credentials: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>admin / Admin@12345</span>
            &nbsp;·&nbsp;
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>demo / Demo@12345</span>
          </div>
        </div>

        {/* ── RIGHT: Attack selector ── */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1rem' }}>⚡</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>SQL Injection Demo Launcher</span>
              <span style={{ fontSize: '0.72rem', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,212,255,0.3)', padding: '2px 8px', borderRadius: 12 }}>
                {ATTACK_GROUPS.reduce((s, g) => s + g.attacks.length, 0)} attacks
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              Click any attack to load it into the form, then click Sign In to fire it at the WAF.
            </p>
          </div>

          {ATTACK_GROUPS.map((group, gi) => (
            <div key={group.category} style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {/* Group header */}
              <button
                onClick={() => setOpenGroup(openGroup === gi ? null : gi)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: openGroup === gi ? 'rgba(0,0,0,0.3)' : 'var(--bg-card)',
                  border: 'none', cursor: 'pointer', borderBottom: openGroup === gi ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{group.category}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{group.attacks.length} attacks</span>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: openGroup === gi ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Attack list */}
              {openGroup === gi && (
                <div style={{ background: 'rgba(0,0,0,0.15)' }}>
                  {group.attacks.map((attack, ai) => {
                    const isSelected = selected?.groupIdx === gi && selected?.attackIdx === ai;
                    return (
                      <button
                        key={ai}
                        onClick={() => injectAttack(attack, gi, ai)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '10px 14px', background: isSelected ? `${group.color}18` : 'transparent',
                          border: 'none', borderBottom: '1px solid rgba(26,58,92,0.4)',
                          cursor: 'pointer', textAlign: 'left',
                          borderLeft: isSelected ? `3px solid ${group.color}` : '3px solid transparent',
                          transition: '0.15s',
                        }}
                      >
                        <div style={{ paddingTop: 2 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%', marginTop: 3,
                            background: isSelected ? group.color : 'var(--text-muted)',
                            boxShadow: isSelected ? `0 0 6px ${group.color}` : 'none',
                          }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 3 }}>
                            {attack.label}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: isSelected ? group.color : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {attack.payload.slice(0, 65)}{attack.payload.length > 65 ? '…' : ''}
                          </div>
                        </div>
                        {isSelected && (
                          <span style={{ fontSize: '0.7rem', color: group.color, fontWeight: 700, flexShrink: 0, paddingTop: 2 }}>LOADED ✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>How to demo:</strong> Open a category → click an attack → it loads into the login form → click Sign In → WAF blocks it and logs it → check Attack Logs page to see the entry.
          </div>
        </div>
      </div>
    </div>
  );
}
