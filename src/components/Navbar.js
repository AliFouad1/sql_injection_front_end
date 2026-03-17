import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, LogOut, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';

export default function Navbar() {
  const { user, lang, logout, toggleLang } = useApp();
  const t = translations[lang];
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <Shield size={22} className="shield-icon" />
        <span>WAF<span style={{ color: 'var(--text-secondary)' }}>·</span>SHIELD</span>
      </NavLink>

      <div className="navbar-links">
        {user && <>
          <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>{t.home}</NavLink>
          <NavLink to="/logs" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>{t.attackLogs}</NavLink>
          {user.is_staff && (
            <NavLink to="/admin" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>{t.adminDashboard}</NavLink>
          )}
          <NavLink to="/about" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>{t.about}</NavLink>
        </>}
      </div>

      <div className="navbar-actions">
        <button className="btn btn-ghost btn-sm" onClick={toggleLang} title="Toggle language">
          <Globe size={15} />
          {lang === 'en' ? 'عربي' : 'EN'}
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <span className="pulse-dot" style={{ display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />
              {user.username}
            </span>
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>
              <LogOut size={14} /> {t.logout}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <NavLink to="/login" className="btn btn-ghost btn-sm">{t.login}</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm">{t.register}</NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}
