import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const ROLES = [
    { v: 'pdg',          l: 'PDG',              color: '#f59e0b' },
    { v: 'directeur',    l: 'Directeur',        color: '#06b6d4' },
    { v: 'chef_service', l: 'Chef de Service',  color: '#8b5cf6' },
    { v: 'employe',      l: 'Employé',          color: '#9ca3af' },
    { v: 'admin',        l: 'Administrateur',   color: '#7c5cff' },
];
const roleLabel = (v) => ROLES.find((r) => r.v === v)?.l || v;
const roleColor = (v) => ROLES.find((r) => r.v === v)?.color || '#7c5cff';
const getInitials = (n) => n?.split(' ').map((x) => x[0]).join('').substring(0, 2).toUpperCase() || '?';

/* ========================================================================
   Main Admin Shell
======================================================================== */
export default function Admin() {
    const [tab, setTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [depts, setDepts] = useState([]);
    const [convs, setConvs] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(false);
    const [userModal, setUserModal] = useState(null);
    const [deptModal, setDeptModal] = useState(null);
    const [convModal, setConvModal] = useState(null);
    const [toast, setToast] = useState(null);

    const notify = (msg, type = 'ok') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadStats = () => api.get('/admin/stats').then((r) => setStats(r.data)).catch(console.error);
    const loadUsers = () => api.get('/admin/users', { params: { q } }).then((r) => setUsers(r.data.data || r.data)).catch(console.error);
    const loadDepts = () => api.get('/admin/departments').then((r) => setDepts(r.data)).catch(console.error);
    const loadConvs = () => api.get('/admin/conversations', { params: { q } }).then((r) => setConvs(r.data.data || r.data)).catch(console.error);

    useEffect(() => {
        setLoading(true);
        Promise.all([loadStats(), loadUsers(), loadDepts(), loadConvs()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            if (tab === 'users') loadUsers();
            if (tab === 'conversations') loadConvs();
        }, 200);
        return () => clearTimeout(t);
    }, [q]);

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch (e) {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const saveUser = async (data) => {
        try {
            if (data.id) await api.put(`/admin/users/${data.id}`, data);
            else await api.post('/admin/users', data);
            setUserModal(null);
            notify(data.id ? 'Utilisateur mis à jour' : 'Utilisateur créé');
            loadUsers(); loadStats();
        } catch (e) {
            notify(e?.response?.data?.message || 'Erreur', 'err');
        }
    };

    const deleteUser = async (u) => {
        if (!confirm(`Supprimer ${u.name} ?`)) return;
        try {
            await api.delete(`/admin/users/${u.id}`);
            notify('Utilisateur supprimé');
            loadUsers(); loadStats();
        } catch (e) { notify(e?.response?.data?.message || 'Erreur', 'err'); }
    };

    const saveDept = async (data) => {
        try {
            if (data.id) await api.put(`/admin/departments/${data.id}`, data);
            else await api.post('/admin/departments', data);
            setDeptModal(null);
            notify(data.id ? 'Département mis à jour' : 'Département créé');
            loadDepts(); loadStats();
        } catch (e) { notify(e?.response?.data?.message || 'Erreur', 'err'); }
    };

    const deleteDept = async (d) => {
        if (!confirm(`Supprimer le département "${d.name}" ?`)) return;
        try {
            await api.delete(`/admin/departments/${d.id}`);
            notify('Département supprimé');
            loadDepts(); loadStats();
        } catch (e) { notify(e?.response?.data?.message || 'Erreur', 'err'); }
    };

    const deleteConv = async (c) => {
        if (!confirm('Supprimer cette conversation et tous ses messages ?')) return;
        try {
            await api.delete(`/admin/conversations/${c.id}`);
            notify('Conversation supprimée');
            loadConvs(); loadStats();
        } catch (e) { notify(e?.response?.data?.message || 'Erreur', 'err'); }
    };

    return (
        <div className="admin-shell">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <div className="admin-brand-logo">S</div>
                    <div>
                        <div className="admin-brand-name">SecureChat</div>
                        <div className="admin-brand-tag">Console Admin</div>
                    </div>
                </div>

                <nav className="admin-nav">
                    {[
                        { id: 'dashboard',     label: 'Tableau de bord', icon: <IconGrid /> },
                        { id: 'users',         label: 'Utilisateurs',    icon: <IconUsers />, count: stats?.users },
                        { id: 'departments',   label: 'Départements',    icon: <IconBuilding />, count: stats?.departments },
                        { id: 'conversations', label: 'Conversations',   icon: <IconChat />, count: stats?.conversations },
                    ].map((t) => (
                        <button key={t.id} onClick={() => setTab(t.id)} className={`admin-nav-item ${tab === t.id ? 'active' : ''}`}>
                            <span className="admin-nav-icon">{t.icon}</span>
                            <span className="admin-nav-label">{t.label}</span>
                            {t.count !== undefined && <span className="admin-nav-count">{t.count}</span>}
                        </button>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <ThemeToggle />
                    <button onClick={handleLogout} className="admin-logout" title="Déconnexion">
                        <IconLogout /><span>Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1 className="admin-title">
                            {tab === 'dashboard' && 'Tableau de bord'}
                            {tab === 'users' && 'Utilisateurs'}
                            {tab === 'departments' && 'Départements'}
                            {tab === 'conversations' && 'Conversations'}
                        </h1>
                        <p className="admin-subtitle">
                            {tab === 'dashboard' && "Vue d'ensemble de la plateforme"}
                            {tab === 'users' && 'Gérer les comptes, rôles et affectations'}
                            {tab === 'departments' && 'Structure organisationnelle'}
                            {tab === 'conversations' && 'Surveillance des échanges'}
                        </p>
                    </div>
                    {(tab === 'users' || tab === 'conversations') && (
                        <div className="admin-search">
                            <IconSearch />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder={tab === 'users' ? 'Rechercher par nom, email, poste...' : 'Rechercher par participant...'}
                            />
                        </div>
                    )}
                    {tab === 'users' && (
                        <button onClick={() => setUserModal({})} className="admin-btn-primary">
                            <IconPlus /><span>Nouvel utilisateur</span>
                        </button>
                    )}
                    {tab === 'departments' && (
                        <button onClick={() => setDeptModal({})} className="admin-btn-primary">
                            <IconPlus /><span>Nouveau département</span>
                        </button>
                    )}
                </header>

                <section className="admin-content">
                    {loading && !stats ? (
                        <div className="admin-loading"><div className="spinner" /></div>
                    ) : (
                        <>
                            {tab === 'dashboard'     && <Dashboard stats={stats} />}
                            {tab === 'users'         && <UsersList users={users} depts={depts} onEdit={setUserModal} onDelete={deleteUser} />}
                            {tab === 'departments'   && <DeptsList depts={depts} onEdit={setDeptModal} onDelete={deleteDept} />}
                            {tab === 'conversations' && <ConvsList convs={convs} onView={setConvModal} onDelete={deleteConv} />}
                        </>
                    )}
                </section>
            </main>

            {userModal && <UserModal user={userModal} depts={depts} onClose={() => setUserModal(null)} onSave={saveUser} />}
            {deptModal && <DeptModal dept={deptModal}   depts={depts} onClose={() => setDeptModal(null)} onSave={saveDept} />}
            {convModal && <ConvModal conv={convModal}                 onClose={() => setConvModal(null)} />}
            {toast && <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>}

            <AdminStyles />
        </div>
    );
}

/* ========================================================================
   Dashboard
======================================================================== */
function Dashboard({ stats }) {
    if (!stats) return null;
    const maxY = Math.max(1, ...stats.series.map((s) => s.total));

    return (
        <>
            <div className="stats-grid">
                <StatCard label="Utilisateurs"   value={stats.users}         trend={`${stats.active_users || 0} actifs`} icon={<IconUsers />}    color="#7c5cff" />
                <StatCard label="Départements"   value={stats.departments}   trend="Structure org."                     icon={<IconBuilding />} color="#22d3ee" />
                <StatCard label="Conversations"  value={stats.conversations} trend="Échanges privés + groupes"          icon={<IconChat />}     color="#f59e0b" />
                <StatCard label="Messages 24 h"  value={stats.messages_24h}  trend={`${stats.messages_7d} sur 7 j`}     icon={<IconFlash />}    color="#22c55e" />
            </div>

            <div className="grid-2col">
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Activité des messages</h3>
                            <p className="card-subtitle">7 derniers jours</p>
                        </div>
                        <span className="chip">{stats.messages_7d} messages</span>
                    </div>
                    <div className="chart">
                        {stats.series.map((d, i) => (
                            <div key={i} className="chart-bar-wrap">
                                <div className="chart-value">{d.total}</div>
                                <div className="chart-bar" style={{ height: `${(d.total / maxY) * 100}%` }} />
                                <div className="chart-label">{d.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Par rôle</h3>
                            <p className="card-subtitle">Répartition des utilisateurs</p>
                        </div>
                    </div>
                    <div className="role-list">
                        {ROLES.map((r) => {
                            const count = stats.by_role?.[r.v] || 0;
                            const pct = stats.users ? (count / stats.users) * 100 : 0;
                            return (
                                <div key={r.v} className="role-row">
                                    <div className="role-row-top">
                                        <span className="role-dot" style={{ background: r.color }} />
                                        <span className="role-name">{r.l}</span>
                                        <span className="role-count">{count}</span>
                                    </div>
                                    <div className="role-bar"><div style={{ width: `${pct}%`, background: r.color }} /></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div>
                        <h3 className="card-title">Départements</h3>
                        <p className="card-subtitle">Effectifs par unité</p>
                    </div>
                </div>
                <div className="dept-grid">
                    {stats.by_department.map((d) => (
                        <div key={d.code} className="dept-chip">
                            <div className="dept-chip-code">{d.code}</div>
                            <div className="dept-chip-name">{d.name}</div>
                            <div className="dept-chip-count">{d.total} membres</div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function StatCard({ label, value, trend, icon, color }) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ background: `${color}20`, color }}>{icon}</div>
            <div className="stat-value">{value ?? 0}</div>
            <div className="stat-label">{label}</div>
            <div className="stat-trend">{trend}</div>
        </div>
    );
}

/* ========================================================================
   Users
======================================================================== */
function UsersList({ users, depts, onEdit, onDelete }) {
    if (users.length === 0) {
        return <EmptyState icon={<IconUsers />} title="Aucun utilisateur" />;
    }
    return (
        <div className="card table-card">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Utilisateur</th>
                        <th>Rôle</th>
                        <th>Département</th>
                        <th>Poste</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td>
                                <div className="user-cell">
                                    <div className="avatar" style={{ background: `linear-gradient(135deg, ${roleColor(u.role)}, #7c5cff)` }}>
                                        {getInitials(u.name)}
                                    </div>
                                    <div>
                                        <div className="user-name">{u.name}</div>
                                        <div className="user-email">{u.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span className="role-badge" style={{ color: roleColor(u.role), background: `${roleColor(u.role)}18` }}>{roleLabel(u.role)}</span></td>
                            <td className="td-muted">{u.department?.name || '—'}</td>
                            <td className="td-muted">{u.poste || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                                <button className="icon-btn" onClick={() => onEdit(u)} title="Modifier"><IconEdit /></button>
                                <button className="icon-btn danger" onClick={() => onDelete(u)} title="Supprimer"><IconTrash /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ========================================================================
   Departments
======================================================================== */
function DeptsList({ depts, onEdit, onDelete }) {
    if (depts.length === 0) return <EmptyState icon={<IconBuilding />} title="Aucun département" />;
    return (
        <div className="cards-grid">
            {depts.map((d) => (
                <div key={d.id} className="card dept-card">
                    <div className="dept-card-head">
                        <div className="dept-card-icon">{d.code}</div>
                        <div style={{ flex: 1 }}>
                            <div className="dept-card-name">{d.name}</div>
                            {d.parent && <div className="td-muted" style={{ fontSize: 12 }}>↳ sous-dépt de {d.parent.name}</div>}
                        </div>
                    </div>
                    {d.description && <p className="dept-card-desc">{d.description}</p>}
                    <div className="dept-card-meta">
                        <span className="chip"><IconUsers /> {d.members_count || 0} membres</span>
                        <span className="chip">Niveau {d.level}</span>
                    </div>
                    <div className="dept-card-actions">
                        <button className="btn-ghost" onClick={() => onEdit(d)}><IconEdit /> Modifier</button>
                        <button className="btn-ghost danger" onClick={() => onDelete(d)}><IconTrash /> Supprimer</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ========================================================================
   Conversations (qui parle à qui)
======================================================================== */
function ConvsList({ convs, onView, onDelete }) {
    if (convs.length === 0) return <EmptyState icon={<IconChat />} title="Aucune conversation" />;
    return (
        <div className="card table-card">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Participants</th>
                        <th>Type</th>
                        <th>Messages</th>
                        <th>Dernier échange</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {convs.map((c) => (
                        <tr key={c.id}>
                            <td>
                                <div className="participants">
                                    {(c.users || []).slice(0, 4).map((u) => (
                                        <div key={u.id} className="avatar avatar-sm stack" style={{ background: `linear-gradient(135deg, ${roleColor(u.role)}, #7c5cff)` }} title={u.name}>
                                            {getInitials(u.name)}
                                        </div>
                                    ))}
                                    {(c.users?.length || 0) > 4 && <div className="avatar avatar-sm stack plus">+{c.users.length - 4}</div>}
                                    <div className="participants-names">
                                        {(c.users || []).map((u) => u.name).join(' · ')}
                                    </div>
                                </div>
                            </td>
                            <td><span className="chip">{c.type === 'group' ? 'Groupe' : 'Privée'}</span></td>
                            <td className="td-muted">{c.messages_count || 0}</td>
                            <td className="td-muted">{c.messages_max_created_at ? new Date(c.messages_max_created_at).toLocaleString('fr-FR') : '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                                <button className="icon-btn" onClick={() => onView(c)} title="Consulter"><IconEye /></button>
                                <button className="icon-btn danger" onClick={() => onDelete(c)} title="Supprimer"><IconTrash /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ========================================================================
   Modals
======================================================================== */
function UserModal({ user, depts, onClose, onSave }) {
    const [f, setF] = useState({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'employe',
        department_id: user.department_id || '',
        poste: user.poste || '',
    });
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const submit = (e) => {
        e.preventDefault();
        const data = { ...f, id: user.id };
        if (!data.password) delete data.password;
        if (!data.department_id) data.department_id = null;
        onSave(data);
    };
    return (
        <Modal onClose={onClose} title={user.id ? 'Modifier utilisateur' : 'Nouvel utilisateur'}>
            <form onSubmit={submit} className="form">
                <Field label="Nom complet"><input className="inp" value={f.name} onChange={set('name')} required /></Field>
                <Field label="Email"><input className="inp" type="email" value={f.email} onChange={set('email')} required /></Field>
                <Field label={user.id ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}>
                    <input className="inp" type="password" value={f.password} onChange={set('password')} required={!user.id} minLength={8} />
                </Field>
                <div className="row2">
                    <Field label="Rôle">
                        <select className="inp" value={f.role} onChange={set('role')}>
                            {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                        </select>
                    </Field>
                    <Field label="Département">
                        <select className="inp" value={f.department_id} onChange={set('department_id')}>
                            <option value="">Aucun</option>
                            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </Field>
                </div>
                <Field label="Poste"><input className="inp" value={f.poste} onChange={set('poste')} /></Field>
                <div className="form-actions">
                    <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
                    <button type="submit" className="admin-btn-primary">{user.id ? 'Enregistrer' : 'Créer'}</button>
                </div>
            </form>
        </Modal>
    );
}

function DeptModal({ dept, depts, onClose, onSave }) {
    const [f, setF] = useState({
        name: dept.name || '',
        code: dept.code || '',
        description: dept.description || '',
        parent_id: dept.parent_id || '',
        level: dept.level ?? 0,
    });
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const submit = (e) => {
        e.preventDefault();
        const data = { ...f, id: dept.id };
        if (!data.parent_id) data.parent_id = null;
        data.level = Number(data.level) || 0;
        onSave(data);
    };
    return (
        <Modal onClose={onClose} title={dept.id ? 'Modifier département' : 'Nouveau département'}>
            <form onSubmit={submit} className="form">
                <div className="row2">
                    <Field label="Nom"><input className="inp" value={f.name} onChange={set('name')} required /></Field>
                    <Field label="Code"><input className="inp" value={f.code} onChange={set('code')} required style={{ textTransform: 'uppercase' }} /></Field>
                </div>
                <Field label="Description">
                    <textarea className="inp" rows={3} value={f.description} onChange={set('description')} />
                </Field>
                <div className="row2">
                    <Field label="Département parent">
                        <select className="inp" value={f.parent_id} onChange={set('parent_id')}>
                            <option value="">Aucun (racine)</option>
                            {depts.filter((d) => d.id !== dept.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Niveau"><input className="inp" type="number" min={0} value={f.level} onChange={set('level')} /></Field>
                </div>
                <div className="form-actions">
                    <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
                    <button type="submit" className="admin-btn-primary">{dept.id ? 'Enregistrer' : 'Créer'}</button>
                </div>
            </form>
        </Modal>
    );
}

function ConvModal({ conv, onClose }) {
    const [data, setData] = useState(null);
    useEffect(() => {
        api.get(`/admin/conversations/${conv.id}`).then((r) => setData(r.data)).catch(console.error);
    }, [conv.id]);
    return (
        <Modal onClose={onClose} title="Consultation de la conversation" large>
            {!data ? <div className="admin-loading"><div className="spinner" /></div> : (
                <>
                    <div className="conv-head">
                        <div className="conv-head-participants">
                            {data.conversation.users.map((u) => (
                                <div key={u.id} className="conv-participant">
                                    <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${roleColor(u.role)}, #7c5cff)` }}>{getInitials(u.name)}</div>
                                    <div>
                                        <div className="user-name">{u.name}</div>
                                        <div className="td-muted" style={{ fontSize: 11 }}>{roleLabel(u.role)} · {u.department?.name || '—'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <span className="chip">{data.total_messages} messages</span>
                    </div>
                    <div className="conv-msgs">
                        {data.messages.length === 0 ? <div className="td-muted" style={{ textAlign: 'center', padding: 24 }}>Aucun message</div> :
                            [...data.messages].reverse().map((m) => (
                                <div key={m.id} className="conv-msg">
                                    <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${roleColor(m.user?.role)}, #7c5cff)` }}>{getInitials(m.user?.name)}</div>
                                    <div className="conv-msg-body">
                                        <div className="conv-msg-meta">
                                            <span style={{ color: roleColor(m.user?.role), fontWeight: 600 }}>{m.user?.name}</span>
                                            <span className="td-muted">{new Date(m.created_at).toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="conv-msg-text">{m.encrypted_content}</div>
                                    </div>
                                </div>
                            ))}
                    </div>
                    <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-subtle)', borderTop: '1px solid var(--border)' }}>
                        ⚠ Accès admin : consultation à des fins de supervision uniquement.
                    </div>
                </>
            )}
        </Modal>
    );
}

function Modal({ children, onClose, title, large }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className={`modal ${large ? 'modal-lg' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="icon-btn"><IconClose /></button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return <label className="field"><span>{label}</span>{children}</label>;
}

function EmptyState({ icon, title }) {
    return (
        <div className="empty">
            <div className="empty-icon">{icon}</div>
            <p>{title}</p>
        </div>
    );
}

/* ========================================================================
   Icons
======================================================================== */
const I = (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p} />;
const IconGrid     = () => <I><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></I>;
const IconUsers    = () => <I><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></I>;
const IconBuilding = () => <I><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" /></I>;
const IconChat     = () => <I><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></I>;
const IconFlash    = () => <I><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></I>;
const IconSearch   = () => <I><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></I>;
const IconPlus     = () => <I><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></I>;
const IconEdit     = () => <I><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></I>;
const IconTrash    = () => <I><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></I>;
const IconEye      = () => <I><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></I>;
const IconClose    = () => <I><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></I>;
const IconLogout   = () => <I><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></I>;

/* ========================================================================
   Styles
======================================================================== */
function AdminStyles() {
    return (
        <style>{`
.admin-shell { display: flex; min-height: 100vh; background: var(--bg); color: var(--text); }
.admin-sidebar { width: 260px; background: var(--bg-elev); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 24px 16px; position: sticky; top: 0; height: 100vh; }
.admin-brand { display: flex; align-items: center; gap: 12px; padding: 0 8px 20px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
.admin-brand-logo { width: 40px; height: 40px; border-radius: 12px; background: var(--grad-primary); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; font-size: 18px; }
.admin-brand-name { font-weight: 700; font-size: 15px; }
.admin-brand-tag { font-size: 11px; color: var(--text-subtle); }
.admin-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.admin-nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 10px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; text-align: left; font-size: 14px; transition: all 0.15s; }
.admin-nav-item:hover { background: var(--panel-hover); color: var(--text); }
.admin-nav-item.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
.admin-nav-icon { display: flex; }
.admin-nav-label { flex: 1; }
.admin-nav-count { font-size: 11px; padding: 2px 8px; background: var(--border); border-radius: 999px; color: var(--text-muted); font-weight: 600; }
.admin-nav-item.active .admin-nav-count { background: var(--primary); color: #fff; }
.admin-sidebar-footer { border-top: 1px solid var(--border); padding-top: 12px; display: flex; align-items: center; gap: 8px; }
.admin-logout { flex: 1; display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 10px; background: transparent; border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; font-size: 13px; }
.admin-logout:hover { color: var(--danger); border-color: var(--danger); }

.admin-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.admin-header { display: flex; align-items: center; gap: 16px; padding: 24px 32px; border-bottom: 1px solid var(--border); background: var(--bg); position: sticky; top: 0; z-index: 10; }
.admin-title { font-size: 22px; font-weight: 700; margin: 0; }
.admin-subtitle { font-size: 13px; color: var(--text-muted); margin: 2px 0 0; }
.admin-search { flex: 1; max-width: 400px; margin-left: auto; display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-elev); }
.admin-search svg { color: var(--text-subtle); }
.admin-search input { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 14px; }
.admin-btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 10px; background: var(--primary); color: #fff; border: none; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.15s; white-space: nowrap; }
.admin-btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: var(--shadow-glow); }

.admin-content { padding: 24px 32px; display: flex; flex-direction: column; gap: 24px; flex: 1; }
.admin-loading { display: flex; justify-content: center; padding: 60px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.stat-card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
.stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.stat-value { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
.stat-label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-top: 2px; }
.stat-trend { font-size: 11px; color: var(--text-subtle); margin-top: 8px; }

.grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 900px) { .grid-2col { grid-template-columns: 1fr; } .admin-sidebar { display: none; } }

.card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
.card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
.card-title { font-size: 15px; font-weight: 700; margin: 0; }
.card-subtitle { font-size: 12px; color: var(--text-subtle); margin: 2px 0 0; }

.chart { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; height: 180px; padding-top: 20px; }
.chart-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.chart-value { font-size: 11px; color: var(--text-muted); font-weight: 600; }
.chart-bar { width: 100%; max-width: 32px; background: var(--grad-primary); border-radius: 6px 6px 0 0; min-height: 4px; transition: all 0.3s; }
.chart-label { font-size: 11px; color: var(--text-subtle); text-transform: capitalize; }

.role-list { display: flex; flex-direction: column; gap: 14px; }
.role-row-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; }
.role-dot { width: 8px; height: 8px; border-radius: 999px; }
.role-name { flex: 1; font-weight: 500; }
.role-count { font-weight: 700; font-size: 13px; }
.role-bar { height: 6px; background: var(--border); border-radius: 999px; overflow: hidden; }
.role-bar > div { height: 100%; border-radius: 999px; transition: width 0.4s; }

.dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.dept-chip { padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); }
.dept-chip-code { font-size: 11px; color: var(--primary); font-weight: 700; letter-spacing: 0.05em; }
.dept-chip-name { font-weight: 600; font-size: 14px; margin-top: 2px; }
.dept-chip-count { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.dept-card { display: flex; flex-direction: column; gap: 12px; }
.dept-card-head { display: flex; align-items: center; gap: 12px; }
.dept-card-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; letter-spacing: 0.04em; }
.dept-card-name { font-weight: 700; font-size: 15px; }
.dept-card-desc { font-size: 13px; color: var(--text-muted); margin: 0; }
.dept-card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.dept-card-actions { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border); }

.table-card { padding: 0; overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { text-align: left; padding: 14px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-subtle); border-bottom: 1px solid var(--border); background: var(--bg); }
.data-table td { padding: 14px 20px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover { background: var(--panel-hover); }

.user-cell { display: flex; align-items: center; gap: 12px; }
.user-name { font-weight: 600; color: var(--text); }
.user-email { font-size: 12px; color: var(--text-muted); }
.td-muted { color: var(--text-muted); }

.avatar { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.avatar.avatar-sm { width: 28px; height: 28px; font-size: 11px; border-radius: 8px; }

.role-badge { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }

.icon-btn { width: 32px; height: 32px; border-radius: 8px; background: transparent; border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-left: 6px; transition: all 0.15s; }
.icon-btn:hover { background: var(--panel-hover); color: var(--text); }
.icon-btn.danger:hover { color: var(--danger); border-color: var(--danger); }

.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 8px; background: transparent; border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; font-size: 12px; font-weight: 500; }
.btn-ghost:hover { background: var(--panel-hover); color: var(--text); }
.btn-ghost.danger:hover { color: var(--danger); border-color: var(--danger); }

.chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 11px; color: var(--text-muted); background: var(--border); font-weight: 500; }

.participants { display: flex; align-items: center; gap: 8px; }
.avatar.stack { border: 2px solid var(--bg-elev); margin-left: -10px; }
.avatar.stack:first-child { margin-left: 0; }
.avatar.stack.plus { background: var(--border); color: var(--text-muted); font-size: 10px; }
.participants-names { font-size: 13px; font-weight: 500; margin-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }

.empty { padding: 60px 20px; text-align: center; color: var(--text-muted); }
.empty-icon { display: inline-flex; padding: 16px; background: var(--bg-elev); border-radius: 16px; margin-bottom: 12px; color: var(--text-subtle); }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 520px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); }
.modal-lg { max-width: 760px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); }
.modal-head h2 { font-size: 16px; font-weight: 700; margin: 0; }
.modal-body { padding: 20px 24px; overflow-y: auto; }

.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-muted); font-weight: 500; }
.inp { padding: 10px 12px; border-radius: 10px; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 14px; font-family: inherit; outline: none; }
.inp:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border); margin-top: 8px; }

.conv-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--border); margin-bottom: 14px; }
.conv-head-participants { display: flex; gap: 16px; flex-wrap: wrap; }
.conv-participant { display: flex; align-items: center; gap: 8px; }
.conv-msgs { max-height: 55vh; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
.conv-msg { display: flex; gap: 10px; }
.conv-msg-body { flex: 1; min-width: 0; }
.conv-msg-meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
.conv-msg-text { padding: 8px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; font-size: 13px; white-space: pre-wrap; word-break: break-word; }

.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 999px; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.admin-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 18px; border-radius: 10px; background: var(--bg-elev); border: 1px solid var(--border); color: var(--text); font-size: 13px; font-weight: 500; z-index: 200; box-shadow: var(--shadow-lg); animation: slideUp 0.2s; }
.admin-toast.err { border-color: var(--danger); color: var(--danger); }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } }
        `}</style>
    );
}
