import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((c) => {
    const t = localStorage.getItem('token');
    if (t) c.headers.Authorization = `Bearer ${t}`;
    return c;
});

const ROLES = [
    { v: 'admin', l: 'Administrateur' },
    { v: 'pdg', l: 'PDG' },
    { v: 'directeur', l: 'Directeur' },
    { v: 'chef_service', l: 'Chef de Service' },
    { v: 'employe', l: 'Employé' },
];

export default function Admin() {
    const [tab, setTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [depts, setDepts] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(false);

    // Modales
    const [userModal, setUserModal] = useState(null);
    const [deptModal, setDeptModal] = useState(null);

    const loadStats = () => api.get('/admin/stats').then((r) => setStats(r.data));
    const loadUsers = () => api.get('/admin/users', { params: { q } }).then((r) => setUsers(r.data.data || r.data));
    const loadDepts = () => api.get('/admin/departments').then((r) => setDepts(r.data));

    useEffect(() => {
        loadStats().catch(handleAuthError);
    }, []);

    useEffect(() => {
        if (tab === 'users') loadUsers();
        if (tab === 'departments') loadDepts();
    }, [tab, q]);

    function handleAuthError(e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
            alert(e?.response?.data?.message || 'Accès refusé.');
            window.location.href = '/login';
        }
    }

    const saveUser = async (data) => {
        setLoading(true);
        try {
            if (data.id) await api.put(`/admin/users/${data.id}`, data);
            else await api.post('/admin/users', data);
            setUserModal(null);
            loadUsers();
            loadStats();
        } catch (e) {
            alert(e?.response?.data?.message || 'Erreur');
        } finally { setLoading(false); }
    };

    const deleteUser = async (u) => {
        if (!confirm(`Supprimer ${u.name} ?`)) return;
        await api.delete(`/admin/users/${u.id}`).catch((e) => alert(e?.response?.data?.message || 'Erreur'));
        loadUsers(); loadStats();
    };

    const saveDept = async (data) => {
        setLoading(true);
        try {
            if (data.id) await api.put(`/admin/departments/${data.id}`, data);
            else await api.post('/admin/departments', data);
            setDeptModal(null);
            loadDepts();
            loadStats();
        } catch (e) {
            alert(e?.response?.data?.message || 'Erreur');
        } finally { setLoading(false); }
    };

    const deleteDept = async (d) => {
        if (!confirm(`Supprimer ${d.name} ?`)) return;
        await api.delete(`/admin/departments/${d.id}`).catch((e) => alert(e?.response?.data?.message || 'Erreur'));
        loadDepts(); loadStats();
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
            {/* Header */}
            <header style={{
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>⚙️ Administration</div>
                    <nav style={{ display: 'flex', gap: 8 }}>
                        {['dashboard', 'users', 'departments'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={tab === t ? 'btn-primary' : ''}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                    background: tab === t ? 'var(--primary)' : 'transparent',
                                    color: tab === t ? '#fff' : 'var(--text)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {t === 'dashboard' ? '📊 Dashboard' : t === 'users' ? '👥 Utilisateurs' : '🏢 Départements'}
                            </button>
                        ))}
                    </nav>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <a href="/chat" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Retour Chat</a>
                    <ThemeToggle />
                    <button
                        onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
                    >
                        Déconnexion
                    </button>
                </div>
            </header>

            <main style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
                {tab === 'dashboard' && <Dashboard stats={stats} />}
                {tab === 'users' && (
                    <UsersTab
                        users={users}
                        q={q}
                        setQ={setQ}
                        onAdd={() => setUserModal({})}
                        onEdit={(u) => setUserModal(u)}
                        onDelete={deleteUser}
                        depts={depts.length ? depts : null}
                        loadDepts={loadDepts}
                    />
                )}
                {tab === 'departments' && (
                    <DeptsTab
                        depts={depts}
                        onAdd={() => setDeptModal({})}
                        onEdit={(d) => setDeptModal(d)}
                        onDelete={deleteDept}
                    />
                )}
            </main>

            {userModal && <UserModal initial={userModal} depts={depts} onSave={saveUser} onClose={() => setUserModal(null)} loading={loading} />}
            {deptModal && <DeptModal initial={deptModal} depts={depts} onSave={saveDept} onClose={() => setDeptModal(null)} loading={loading} />}
        </div>
    );
}

function Dashboard({ stats }) {
    if (!stats) return <div>Chargement…</div>;
    const cards = [
        { label: 'Utilisateurs', value: stats.users, icon: '👥' },
        { label: 'Départements', value: stats.departments, icon: '🏢' },
        { label: 'PDG', value: stats.by_role?.pdg || 0, icon: '👑' },
        { label: 'Directeurs', value: stats.by_role?.directeur || 0, icon: '🎖️' },
        { label: 'Chefs', value: stats.by_role?.chef_service || 0, icon: '📋' },
        { label: 'Employés', value: stats.by_role?.employe || 0, icon: '💼' },
    ];
    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Vue d'ensemble</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {cards.map((c) => (
                    <div key={c.label} style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
                        <div style={{ fontSize: 32 }}>{c.icon}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{c.value}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 14 }}>{c.label}</div>
                    </div>
                ))}
            </div>
            <h3 style={{ marginTop: 32, marginBottom: 12 }}>Par département</h3>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {stats.by_department?.map((d) => (
                    <div key={d.code} style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                        <div><strong>{d.name}</strong> <span style={{ color: 'var(--muted)' }}>({d.code})</span></div>
                        <div>{d.total} membres</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function UsersTab({ users, q, setQ, onAdd, onEdit, onDelete, depts, loadDepts }) {
    useEffect(() => { if (!depts) loadDepts(); }, []);
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
                <input
                    className="input"
                    placeholder="Rechercher (nom, email, poste)…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ maxWidth: 400, flex: 1 }}
                />
                <button onClick={onAdd} className="btn-primary" style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    + Nouvel utilisateur
                </button>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg)' }}>
                        <tr>
                            <th style={thStyle}>Nom</th>
                            <th style={thStyle}>Email</th>
                            <th style={thStyle}>Rôle</th>
                            <th style={thStyle}>Département</th>
                            <th style={thStyle}>Poste</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                                <td style={tdStyle}>{u.name}</td>
                                <td style={tdStyle}>{u.email}</td>
                                <td style={tdStyle}>
                                    <span className="chip">{ROLES.find((r) => r.v === u.role)?.l || u.role}</span>
                                </td>
                                <td style={tdStyle}>{u.department?.name || '—'}</td>
                                <td style={tdStyle}>{u.poste || '—'}</td>
                                <td style={tdStyle}>
                                    <button onClick={() => onEdit(u)} style={actionBtn}>✏️</button>
                                    <button onClick={() => onDelete(u)} style={{ ...actionBtn, color: '#e74c3c' }}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan="6" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Aucun utilisateur</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DeptsTab({ depts, onAdd, onEdit, onDelete }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>Départements</h2>
                <button onClick={onAdd} style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    + Nouveau département
                </button>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg)' }}>
                        <tr>
                            <th style={thStyle}>Code</th>
                            <th style={thStyle}>Nom</th>
                            <th style={thStyle}>Parent</th>
                            <th style={thStyle}>Niveau</th>
                            <th style={thStyle}>Membres</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {depts.map((d) => (
                            <tr key={d.id} style={{ borderTop: '1px solid var(--border)' }}>
                                <td style={tdStyle}><strong>{d.code}</strong></td>
                                <td style={tdStyle}>{d.name}</td>
                                <td style={tdStyle}>{d.parent?.name || '—'}</td>
                                <td style={tdStyle}>{d.level}</td>
                                <td style={tdStyle}>{d.members_count || 0}</td>
                                <td style={tdStyle}>
                                    <button onClick={() => onEdit(d)} style={actionBtn}>✏️</button>
                                    <button onClick={() => onDelete(d)} style={{ ...actionBtn, color: '#e74c3c' }}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function UserModal({ initial, depts, onSave, onClose, loading }) {
    const [f, setF] = useState({
        id: initial.id,
        name: initial.name || '',
        email: initial.email || '',
        password: '',
        role: initial.role || 'employe',
        department_id: initial.department_id || '',
        poste: initial.poste || '',
    });
    const submit = (e) => {
        e.preventDefault();
        const data = { ...f };
        if (!data.password) delete data.password;
        if (!data.department_id) data.department_id = null;
        onSave(data);
    };
    return (
        <Modal onClose={onClose} title={initial.id ? 'Modifier utilisateur' : 'Nouvel utilisateur'}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="Nom" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <input className="input" placeholder="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                <input className="input" placeholder={initial.id ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} type="password" required={!initial.id} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
                <select className="input" value={f.department_id || ''} onChange={(e) => setF({ ...f, department_id: e.target.value })}>
                    <option value="">Aucun département</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input className="input" placeholder="Poste" value={f.poste} onChange={(e) => setF({ ...f, poste: e.target.value })} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} style={cancelBtn}>Annuler</button>
                    <button type="submit" disabled={loading} style={saveBtn}>{loading ? '…' : 'Enregistrer'}</button>
                </div>
            </form>
        </Modal>
    );
}

function DeptModal({ initial, depts, onSave, onClose, loading }) {
    const [f, setF] = useState({
        id: initial.id,
        name: initial.name || '',
        code: initial.code || '',
        description: initial.description || '',
        parent_id: initial.parent_id || '',
        level: initial.level ?? 1,
    });
    const submit = (e) => {
        e.preventDefault();
        const data = { ...f };
        if (!data.parent_id) data.parent_id = null;
        onSave(data);
    };
    return (
        <Modal onClose={onClose} title={initial.id ? 'Modifier département' : 'Nouveau département'}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="Nom" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <input className="input" placeholder="Code (ex: RH)" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
                <textarea className="input" placeholder="Description" rows="3" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
                <select className="input" value={f.parent_id || ''} onChange={(e) => setF({ ...f, parent_id: e.target.value })}>
                    <option value="">Aucun parent (racine)</option>
                    {depts.filter((d) => d.id !== initial.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input className="input" type="number" placeholder="Niveau" value={f.level} onChange={(e) => setF({ ...f, level: Number(e.target.value) })} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} style={cancelBtn}>Annuler</button>
                    <button type="submit" disabled={loading} style={saveBtn}>{loading ? '…' : 'Enregistrer'}</button>
                </div>
            </form>
        </Modal>
    );
}

function Modal({ children, title, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, maxWidth: 500, width: '100%', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text)' }}>×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

const thStyle = { padding: 12, textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: 13 };
const tdStyle = { padding: 12, fontSize: 14 };
const actionBtn = { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, marginRight: 4, color: 'var(--text)' };
const cancelBtn = { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' };
const saveBtn = { padding: '8px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 };
