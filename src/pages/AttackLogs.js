import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import api from '../services/api';

const METHOD_COLORS = { GET: 'badge-blue', POST: 'badge-green', PUT: 'badge-yellow', DELETE: 'badge-red', PATCH: 'badge-purple' };

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

export default function AttackLogs() {
  const { lang } = useApp();
  const t = translations[lang];

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [patternFilter, setPatternFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  const pageSize = 15;
  const totalPages = Math.ceil(total / pageSize);

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (ipFilter) params.append('ip', ipFilter);
      if (patternFilter) params.append('pattern', patternFilter);
      const res = await api.get(`/logs/?${params}`);
      setLogs(res.data.results);
      setTotal(res.data.total);
    } catch (e) {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [page, ipFilter, patternFilter, t.error]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchLogs(); };
  const clearFilters = () => { setIpFilter(''); setPatternFilter(''); setPage(1); };

  return (
    <div>
      <div className="page-header">
        <h1><AlertTriangle size={22} style={{ color: 'var(--red)' }} />{t.attackLogs}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {total} total blocked requests logged by the WAF middleware
        </p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="filters">
        <input
          className="filter-input"
          placeholder={t.filterByIP}
          value={ipFilter}
          onChange={e => setIpFilter(e.target.value)}
        />
        <input
          className="filter-input"
          placeholder={t.filterByPattern}
          value={patternFilter}
          onChange={e => setPatternFilter(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" type="submit"><Search size={14} />{t.search}</button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={clearFilters}><X size={14} />{t.clear}</button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={fetchLogs}><RefreshCw size={14} /></button>
      </form>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-spinner"><div className="spinner" />{t.loading}</div>
        ) : error ? (
          <div className="alert alert-error" style={{ margin: 16 }}><AlertTriangle size={15} />{error}</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>{t.noLogs}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.timestamp}</th>
                  <th>{t.ipAddress}</th>
                  <th>{t.method}</th>
                  <th>{t.endpoint}</th>
                  <th>{t.reason}</th>
                  <th>{t.user}</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                      <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{formatDate(log.timestamp)}</td>
                      <td className="mono">{log.ip_address || '—'}</td>
                      <td><span className={`badge ${METHOD_COLORS[log.http_method] || 'badge-blue'}`}>{log.http_method}</span></td>
                      <td className="truncate mono" style={{ maxWidth: 180 }}>{log.endpoint}</td>
                      <td>
                        <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>{log.reason}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {log.associated_username || '—'}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                          {expanded === log.id ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--bg-primary)', padding: '16px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{t.payload}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--red)', background: 'rgba(255,56,96,0.08)', padding: '8px 12px', borderRadius: 4, wordBreak: 'break-all' }}>
                                {log.suspicious_payload}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{t.pattern}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--yellow)', background: 'rgba(255,214,0,0.08)', padding: '8px 12px', borderRadius: 4 }}>
                                {log.pattern_matched || '—'}
                              </div>
                              {log.user_agent && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>USER AGENT</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{log.user_agent}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={14} />
          </button>
          <span>{t.page} {page} {t.of} {totalPages}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
