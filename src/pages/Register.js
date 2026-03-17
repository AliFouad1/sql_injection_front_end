import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import api from '../services/api';

export default function Register() {
  const { login, lang } = useApp();
  const t = translations[lang];
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '', password2: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [blocked, setBlocked] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); setBlocked(false);
    setLoading(true);
    try {
      const res = await api.post('/auth/register/', form);
      login(res.data.user, res.data.tokens);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.blocked) {
        setBlocked(true);
      } else if (err.response?.data) {
        setErrors(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const F = ({ name, label, type = 'text', placeholder = '' }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className={`form-input${errors[name] ? ' error' : ''}`}
          type={name.includes('password') ? (showPass ? 'text' : 'password') : type}
          value={form[name]}
          onChange={e => set(name, e.target.value)}
          placeholder={placeholder}
          autoComplete={name}
          style={name.includes('password') ? { paddingRight: 40 } : {}}
        />
        {name === 'password' && (
          <button type="button" onClick={() => setShowPass(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {errors[name] && <div className="form-error">{Array.isArray(errors[name]) ? errors[name][0] : errors[name]}</div>}
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="shield">🛡️</div>
          <h1>{t.registerTitle}</h1>
          <p>{t.registerSubtitle}</p>
        </div>

        {blocked && (
          <div className="alert alert-error">
            <AlertTriangle size={16} />
            <div>
              <div style={{ fontWeight: 700 }}>{t.blocked}</div>
              <div style={{ fontSize: '0.82rem' }}>تم حظر الطلب المشبوه — SQL injection detected.</div>
            </div>
          </div>
        )}
        {errors.non_field_errors && (
          <div className="alert alert-error"><AlertTriangle size={15} />{errors.non_field_errors[0]}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: 12 }}>
            <F name="first_name" label={t.firstName} placeholder="John" />
            <F name="last_name" label={t.lastName} placeholder="Doe" />
          </div>
          <F name="username" label={t.username} placeholder="johndoe" />
          <F name="email" label={t.email} type="email" placeholder="john@example.com" />
          <F name="password" label={t.password} placeholder="••••••••" />
          <F name="password2" label={t.confirmPassword} placeholder="••••••••" />

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading
              ? <><div className="spinner" />{t.registering}</>
              : <><CheckCircle size={16} />{t.signUp}</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          {t.hasAccount} <Link to="/login" style={{ color: 'var(--accent)' }}>{t.signIn}</Link>
        </p>
      </div>
    </div>
  );
}
