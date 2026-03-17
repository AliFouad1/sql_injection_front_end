import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Database, Globe, Lock, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';

export default function Home() {
  const { lang, user } = useApp();
  const t = translations[lang];

  const features = [
    { icon: <Shield size={22} />, title: t.feature1Title, desc: t.feature1Desc, color: 'red' },
    { icon: <Database size={22} />, title: t.feature2Title, desc: t.feature2Desc, color: 'blue' },
    { icon: <Lock size={22} />, title: t.feature3Title, desc: t.feature3Desc, color: 'green' },
    { icon: <Globe size={22} />, title: t.feature4Title, desc: t.feature4Desc, color: 'purple' },
  ];

  const iconBg = { red: 'var(--red-dim)', blue: 'var(--accent-dim)', green: 'var(--green-dim)', purple: 'var(--purple-dim)' };
  const iconColor = { red: 'var(--red)', blue: 'var(--accent)', green: 'var(--green)', purple: 'var(--purple)' };

  return (
    <div>
      {/* Hero */}
      <div className="hero scanline-container">
        <div className="hero-badge">
          <Activity size={12} /> LIVE PROTECTION ACTIVE
        </div>
        <h1>{t.welcomeTitle}</h1>
        <p style={{ fontSize: '1.15rem' }}>{t.welcomeSubtitle}</p>
        <p>{t.welcomeDesc}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!user && <>
            <Link to="/login" className="btn btn-primary btn-lg"><Shield size={18} />{t.signIn}</Link>
            <Link to="/register" className="btn btn-outline btn-lg">{t.signUp}</Link>
          </>}
          {user && <>
            <Link to="/logs" className="btn btn-primary btn-lg"><Activity size={18} />{t.attackLogs}</Link>
            {user.is_staff && <Link to="/admin" className="btn btn-outline btn-lg"><BarChart2 size={18} />{t.adminDashboard}</Link>}
          </>}
        </div>
      </div>

      {/* Features */}
      <div className="features-grid" style={{ padding: '0 0 60px' }}>
        {features.map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon" style={{ background: iconBg[f.color], color: iconColor[f.color] }}>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Architecture overview */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-header">
          <div className="card-title"><Shield size={16} style={{ color: 'var(--accent)' }} /> System Architecture</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { layer: '1', label: 'React Frontend', desc: 'Login / Register / Dashboard / Logs / About', color: 'var(--purple)' },
            { layer: '2', label: 'JWT Auth Layer', desc: 'Access & refresh tokens — role-based access', color: 'var(--accent)' },
            { layer: '3', label: 'WAF Middleware', desc: '15+ SQLi patterns — blocks & logs attacks', color: 'var(--red)' },
            { layer: '4', label: 'Django REST API', desc: 'ORM-only queries — CSRF protected', color: 'var(--green)' },
            { layer: '5', label: 'SQLite / PostgreSQL', desc: 'Users + AttackLog audit table', color: 'var(--yellow)' },
          ].map(item => (
            <div key={item.layer} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', borderTop: `3px solid ${item.color}` }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Layer {item.layer}</div>
              <div style={{ fontWeight: 700, marginBottom: 6, color: item.color }}>{item.label}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
