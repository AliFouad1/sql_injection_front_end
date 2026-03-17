import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Shield, Activity, Wifi, Zap, Users, RefreshCw, AlertTriangle, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import api from '../services/api';

const COLORS = ['#ff3860', '#00d4ff', '#ffd600', '#00e676', '#7c3aed', '#ff9800'];

function StatCard({ value, label, icon, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: '0.82rem' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--accent)', fontWeight: 700 }}>{payload[0].value} attacks</div>
    </div>
  );
};

export default function AdminDashboard() {
  const { lang, user } = useApp();
  const t = translations[lang];

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testMsg, setTestMsg] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/logs/stats/'),
        api.get('/users/')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fireTestAttack = async () => {
    setTestLoading(true); setTestMsg('');
    const payloads = [
      { payload: "' OR 1=1 --", reason: "Tautology (OR 1=1)" },
      { payload: "' UNION SELECT * FROM users --", reason: "UNION SELECT attack" },
      { payload: "'; DROP TABLE users; --", reason: "Stacked queries (semicolon)" },
      { payload: "' AND SLEEP(5) --", reason: "Time-based blind SQLi (SLEEP/WAITFOR)" },
    ];
    const pick = payloads[Math.floor(Math.random() * payloads.length)];
    try {
      await api.post('/logs/test-attack/', pick);
      setTestMsg('✅ ' + t.testAttackSent);
      setTimeout(() => { fetchData(); setTestMsg(''); }, 1200);
    } catch (e) {
      setTestMsg('❌ Failed');
    } finally {
      setTestLoading(false);
    }
  };

  if (!user?.is_staff) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <AlertTriangle size={48} style={{ color: 'var(--red)', marginBottom: 16 }} />
        <h2>{t.adminOnly}</h2>
      </div>
    );
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" />{t.loading}</div>;

  const endpointData = (stats?.top_endpoints || []).map(e => ({
    name: e.endpoint.replace('/api/', '').replace('/', '').slice(0, 18) || '/',
    count: e.count
  }));

  const patternData = (stats?.top_patterns || []).map((p, i) => ({
    name: p.reason.slice(0, 22),
    value: p.count,
    fill: COLORS[i % COLORS.length]
  }));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1><Shield size={22} style={{ color: 'var(--accent)' }} />{t.adminDashboard}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time WAF analytics and threat intelligence</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {testMsg && <span style={{ color: 'var(--green)', alignSelf: 'center', fontSize: '0.88rem' }}>{testMsg}</span>}
          <button className="btn btn-danger btn-sm" onClick={fireTestAttack} disabled={testLoading}>
            <Play size={14} />{t.fireTestAttack}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard value={stats.total_attacks} label={t.totalAttacks} icon={<Shield size={20} />} color="red" />
        <StatCard value={stats.attacks_today} label={t.todayAttacks} icon={<Zap size={20} />} color="blue" />
        <StatCard value={stats.unique_ips} label={t.uniqueIPs} icon={<Wifi size={20} />} color="green" />
        <StatCard value={users.length} label={t.users} icon={<Users size={20} />} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Activity size={14} style={{ color: 'var(--accent)' }} />{t.topEndpoints}</div>
          </div>
          {endpointData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={endpointData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t.noData}</div>}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><Shield size={14} style={{ color: 'var(--red)' }} />{t.topPatterns}</div>
          </div>
          {patternData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={patternData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                  {patternData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ' attacks', n]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.8rem' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t.noData}</div>}
        </div>
      </div>

      {/* Recent attacks + Users */}
      <div className="grid-2">
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <div className="card-title"><Activity size={14} style={{ color: 'var(--red)' }} />{t.recentAttacks}</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.ipAddress}</th>
                  <th>{t.reason}</th>
                  <th>{t.timestamp}</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_attacks || []).map(a => (
                  <tr key={a.id}>
                    <td className="mono">{a.ip_address || '—'}</td>
                    <td><span className="badge badge-red" style={{ fontSize: '0.68rem' }}>{a.reason?.slice(0, 25)}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <div className="card-title"><Users size={14} style={{ color: 'var(--purple)' }} />{t.users}</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.username}</th>
                  <th>{t.email}</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="mono">{u.username}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.is_staff ? 'badge-red' : 'badge-blue'}`}>
                        {u.is_staff ? 'Admin' : 'User'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
