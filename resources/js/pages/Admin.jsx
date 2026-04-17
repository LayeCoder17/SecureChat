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
    { v: 'admin', l: 'Administrateur', color: '#8b5cf6' },
    { v: 'pdg', l: 'PDG', color: '#f59e0b' },
    { v: 'directeur', l: 'Directeur', color: '#3b82f6' },
    { v: 'chef_service', l: 'Chef de Service', color: '#10b981' },
    { v: 'employe', l: 'Employé', color: '#6b7280' },
];

const roleLabel = (v) => ROLES.find((r) => r.v === v)?.l || v;
const roleColor = (v) => ROLES.find((r) => r.v === v)?.color || '#6b7280';

export default function Admin() {
    const [tab, setTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [depts, setDepts] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(false);
    const [userModal, setUserModal] = useState(null);
    const [deptModal, setDeptModal] = useState(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const loadStats = () => api.get('/admin/stats').then((r) => setStats(r.data));
    const loadUsers = () => api.get('/admin/users', { params: { q } }).then((r) => setUsers(r.data.data || r.data));
    const loadDepts = () => api.get('/admin/departments').then((r) => setDepts(r.data));

    useEffect(() => {
        loadStats().catch(handleErr);
        loadDepts().catch(handleErr);
    }, []);

    useEffect(() => {
        if (tab === 'users') loadUsers();
    }, [tab, q]);

    function handleErr(e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
            alert(e?.response?.data?.message || 'Accès refusé');
            window.location.href = '/login';
        }
    }

    const saveUser = async (data) => {
        setLoading(true);
        try {
            if (data.id) await api.put(`/admin/users/${data.id}`, data);
            else await api.post('/admin/users', data);
            setUserModal(null);
            loadUsers(); loadStats();
        } catch (e) {
            alert(e?.response?.data?.message || 'Erreur');
        } finally { setLoading(false); }
    };

    const deleteUser = async (u) => {
        if (!confirm(`Supprimer ${u.name} ?`)) return;
        try {
            await api.delete(`/admin/users/${u.id}`);
            loadUsers(); loadStats();
        } catch (e) { alert(e?.response?.data?.message || 'Erreur'); }
    };

    const saveDept = async (data) => {
        setLoading(true);
        try {
            if (data.id) await api.put(`/admin/departments/${data.id}`, data);
            else await api.post('/admin/departments', data);
            setDeptModal(null);
            loadDepts(); loadStats();
        } catch (e) {
            alert(e?.response?.data?.message || 'Erreur');
        } finally { setLoading(false); }
    };

    const deleteDept = async (d) => {
        if (!confirm(`Supprimer ${d.name} ?`)) return;
        try {
            await api.delete(`/admin/departments/${d.id}`);
            loadDepts(); loadStats();
        } catch (e) { alert(e?.response?.data?.message || 'Erreur'); }
    };

    const logout = () => { localStorage.clear(); window.location.href = '/login'; };

    return (
        <div style={wrapStyle}>
            {/* Sidebar */}
            <aside style={sidebarStyle}>
                <div style={logoStyle}>
                    <div style={logoIconStyle}>S</div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>SecureChat</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Console Admin</div>
                    </div>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 24 }}>
                    <NavBtn active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon="📊" label="Dashboard" />
                    <NavBtn active={tab === 'users'} onClick={() => setTab('users')} icon="👥" label="Utilisateurs" />
                    <NavBtn active={tab === 'departments'} onClick={() => setTab('departments')} icon="🏢" label="Départements" />
                </nav>

                <div style={profileCardStyle}>
                    <div style={avatarStyle}>{currentUser.name?.[0]?.toUpperCase() || 'A'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentUser.name || 'Admin'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Super Admin</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <ThemeToggle />
                    <button onClick={logout} style={logoutBtnStyle} title="Déconnexion">
                        ⏻
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main style={mainStyle}>
                <header style={headerStyle}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
                            {tab === 'dashboard' && 'Tableau de bord'}
                            {tab === 'users' && 'Gestion des utilisateurs'}
                            {tab === 'departments' && 'Gestion des départements'}
                        </h1>
                        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>
                            {tab === 'dashboard' && `Bienvenue, ${currentUser.name?.split(' ')[0] || 'Admin'}`}
                            {tab === 'users' && 'Créez, modifiez et supprimez les comptes utilisateurs'}
                            {tab === 'departments' && 'Organisez la structure de votre entreprise'}
                        </p>
                    </div>
                </header>

                <div style={{ padding: 32 }}>
                    {tab === 'dashboard' && <Dashboard stats={stats} />}
                    {tab === 'users' && (
                        <UsersTab users={users} q={q} setQ={setQ}
                            onAdd={() => setUserModal({})}
                            onEdit={(u) => setUserModal(u)}
                            onDelete={deleteUser}
                        />
                    )}
                    {tab === 'departments' && (
                        <DeptsTab depts={depts}
                            onAdd={() => setDeptModal({})}
                            onEdit={(d) => setDeptModal(d)}
                            onDelete={deleteDept}
                        />
                    )}
                </div>
            </main>

            {userModal && <UserModal initial={userModal} depts={depts} onSave={saveUser} onClose={() => setUserModal(null)} loading={loading} />}
            {deptModal && <DeptModal initial={deptModal} depts={depts} onSave={saveDept} onClose={() => setDeptModal(null)} loading={loading} />}
        </div>
    );
}

// ============ COMPONENTS ============

function NavBtn({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick} style={{
            ...navBtnStyle,
            background: active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
            color: active ? '#fff' : 'var(--text)',
            boxShadow: active ? '0 4px 12px rgba(102, 126, 234, 0.35)' : 'none',
        }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span>{label}</span>
        </button>
    );
}

function Dashboard({ stats }) {
    if (!stats) return <div style={{ color: 'var(--muted)' }}>Chargement…</div>;

    const cards = [
        { label: 'Utilisateurs totaux', value: stats.users, icon: '👥', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { label: 'Départements', value: stats.departments, icon: '🏢', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        { label: 'PDG / Direction', value: (stats.by_role?.pdg || 0) + (stats.by_role?.directeur || 0), icon: '👑', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
        { label: 'Chefs de service', value: stats.by_role?.chef_service || 0, icon: '📋', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    ];

    const roleData = [
        { role: 'admin', total: stats.by_role?.admin || 0 },
        { role: 'pdg', total: stats.by_role?.pdg || 0 },
        { role: 'directeur', total: stats.by_role?.directeur || 0 },
        { role: 'chef_service', total: stats.by_role?.chef_service || 0 },
        { role: 'employe', total: stats.by_role?.employe || 0 },
    ].filter((r) => r.total > 0);

    const maxDept = Math.max(...(stats.by_department?.map((d) => d.total) || [1]));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Grille cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {cards.map((c) => (
                    <div key={c.label} style={{
                        padding: 24,
                        background: c.gradient,
                        borderRadius: 16,
                        color: '#fff',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}>
                        <div style={{ fontSize: 44, opacity: 0.9 }}>{c.icon}</div>
                        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 12 }}>{c.value}</div>
                        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{c.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
                {/* Répartition par rôle */}
                <div style={panelStyle}>
                    <h3 style={panelTitleStyle}>Répartition par rôle</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {roleData.map((r) => {
                            const pct = stats.users ? (r.total / stats.users) * 100 : 0;
                            return (
                                <div key={r.role}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                                        <span style={{ fontWeight: 600 }}>{roleLabel(r.role)}</span>
                                        <span style={{ color: 'var(--muted)' }}>{r.total} · {pct.toFixed(0)}%</span>
                                    </div>
                                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${pct}%`,
                                            height: '100%',
                                            background: roleColor(r.role),
                                            borderRadius: 4,
                                            transition: 'width 0.6s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Membres par département */}
                <div style={panelStyle}>
                    <h3 style={panelTitleStyle}>Effectifs par département</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {stats.by_department?.map((d) => (
                            <div key={d.code} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: 12, background: 'var(--bg)', borderRadius: 10,
                            }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 700, fontSize: 12,
                                }}>
                                    {d.code}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                                    <div style={{ marginTop: 4, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${(d.total / maxDept) * 100}%`,
                                            height: '100%', background: '#667eea', borderRadius: 2,
                                        }} />
                                    </div>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{d.total}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UsersTab({ users, q, setQ, onAdd, onEdit, onDelete }) {
    return (
        <div>
            <div style={toolbarStyle}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>🔍</span>
                    <input
                        placeholder="Rechercher un utilisateur…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={{ ...searchInputStyle, paddingLeft: 40 }}
                    />
                </div>
                <button onClick={onAdd} style={primaryBtnStyle}>
                    <span>+</span> Nouvel utilisateur
                </button>
            </div>

            <div style={panelStyle}>
                {users.length === 0 ? (
                    <div style={emptyStyle}>
                        <div style={{ fontSize: 48 }}>🔍</div>
                        <div style={{ marginTop: 12, color: 'var(--muted)' }}>Aucun utilisateur trouvé</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                        {users.map((u) => (
                            <div key={u.id} style={userCardStyle}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: `linear-gradient(135deg, ${roleColor(u.role)}, ${roleColor(u.role)}bb)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0,
                                }}>
                                    {u.name?.[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                        <span style={{ ...chipStyle, background: `${roleColor(u.role)}22`, color: roleColor(u.role) }}>
                                            {roleLabel(u.role)}
                                        </span>
                                        {u.department && <span style={chipStyle}>{u.department.code}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <button onClick={() => onEdit(u)} style={iconBtnStyle} title="Modifier">✏️</button>
                                    <button onClick={() => onDelete(u)} style={{ ...iconBtnStyle, color: '#ef4444' }} title="Supprimer">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function DeptsTab({ depts, onAdd, onEdit, onDelete }) {
    return (
        <div>
            <div style={toolbarStyle}>
                <div style={{ flex: 1, color: 'var(--muted)', fontSize: 14 }}>
                    {depts.length} département{depts.length > 1 ? 's' : ''}
                </div>
                <button onClick={onAdd} style={primaryBtnStyle}>
                    <span>+</span> Nouveau département
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {depts.map((d) => (
                    <div key={d.id} style={deptCardStyle}>
                        <div style={{
                            height: 70,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, fontWeight: 800, color: '#fff',
                        }}>
                            {d.code}
                        </div>
                        <div style={{ padding: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, minHeight: 32 }}>
                                {d.description || 'Aucune description'}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12 }}>
                                <span style={chipStyle}>Niveau {d.level}</span>
                                <span style={chipStyle}>{d.members_count || 0} membres</span>
                                {d.parent && <span style={chipStyle}>↳ {d.parent.code}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                <button onClick={() => onEdit(d)} style={{ ...secondaryBtnStyle, flex: 1 }}>Modifier</button>
                                <button onClick={() => onDelete(d)} style={{ ...iconBtnStyle, color: '#ef4444', padding: '8px 12px' }}>🗑️</button>
                            </div>
                        </div>
                    </div>
                ))}
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
        <Modal onClose={onClose} title={initial.id ? 'Modifier utilisateur' : 'Nouvel utilisateur'} icon="👤">
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Nom complet">
                    <input style={inputStyle} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                </Field>
                <Field label="Email">
                    <input style={inputStyle} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                </Field>
                <Field label={initial.id ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}>
                    <input style={inputStyle} type="password" required={!initial.id} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Rôle">
                        <select style={inputStyle} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                            {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                        </select>
                    </Field>
                    <Field label="Département">
                        <select style={inputStyle} value={f.department_id || ''} onChange={(e) => setF({ ...f, department_id: e.target.value })}>
                            <option value="">Aucun</option>
                            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </Field>
                </div>
                <Field label="Poste (optionnel)">
                    <input style={inputStyle} value={f.poste} onChange={(e) => setF({ ...f, poste: e.target.value })} />
                </Field>
                <ModalFooter onClose={onClose} loading={loading} />
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
        <Modal onClose={onClose} title={initial.id ? 'Modifier département' : 'Nouveau département'} icon="🏢">
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <Field label="Nom">
                        <input style={inputStyle} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                    </Field>
                    <Field label="Code">
                        <input style={inputStyle} required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
                    </Field>
                </div>
                <Field label="Description">
                    <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <Field label="Département parent">
                        <select style={inputStyle} value={f.parent_id || ''} onChange={(e) => setF({ ...f, parent_id: e.target.value })}>
                            <option value="">Aucun (racine)</option>
                            {depts.filter((d) => d.id !== initial.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Niveau">
                        <input style={inputStyle} type="number" min="0" value={f.level} onChange={(e) => setF({ ...f, level: Number(e.target.value) })} />
                    </Field>
                </div>
                <ModalFooter onClose={onClose} loading={loading} />
            </form>
        </Modal>
    );
}

function Field({ label, children }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{label}</span>
            {children}
        </label>
    );
}

function Modal({ children, title, icon, onClose }) {
    return (
        <div onClick={onClose} style={modalOverlayStyle}>
            <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                    }}>{icon}</div>
                    <h3 style={{ margin: 0, flex: 1, fontSize: 18 }}>{title}</h3>
                    <button onClick={onClose} style={closeBtnStyle}>×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function ModalFooter({ onClose, loading }) {
    return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Annuler</button>
            <button type="submit" disabled={loading} style={primaryBtnStyle}>
                {loading ? '…' : 'Enregistrer'}
            </button>
        </div>
    );
}

// ============ STYLES ============

const wrapStyle = {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: 'Inter, system-ui, sans-serif',
};

const sidebarStyle = {
    width: 250,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
};

const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 20,
    borderBottom: '1px solid var(--border)',
};

const logoIconStyle = {
    width: 40, height: 40, borderRadius: 10,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: 20,
    boxShadow: '0 4px 12px rgba(102,126,234,0.35)',
};

const navBtnStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 10, border: 'none',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
    textAlign: 'left', transition: 'all 0.2s',
};

const profileCardStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: 12, background: 'var(--bg)', borderRadius: 10,
    border: '1px solid var(--border)',
};

const avatarStyle = {
    width: 36, height: 36, borderRadius: 10,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, flexShrink: 0,
};

const logoutBtnStyle = {
    flex: 1, padding: '8px', borderRadius: 8,
    background: 'var(--bg)', border: '1px solid var(--border)',
    cursor: 'pointer', color: 'var(--text)', fontSize: 16,
};

const mainStyle = { flex: 1, minWidth: 0 };

const headerStyle = {
    padding: '24px 32px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
};

const panelStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 20,
};

const panelTitleStyle = { margin: '0 0 16px', fontSize: 15, fontWeight: 700 };

const toolbarStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 20, flexWrap: 'wrap',
};

const searchInputStyle = {
    width: '100%', padding: '10px 14px',
    borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)',
    fontSize: 14, outline: 'none',
};

const inputStyle = {
    padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)',
    fontSize: 14, outline: 'none', width: '100%',
};

const primaryBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 18px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
};

const secondaryBtnStyle = {
    padding: '10px 16px', borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text)',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
};

const iconBtnStyle = {
    padding: '6px 10px', borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text)',
    cursor: 'pointer', fontSize: 14,
};

const userCardStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 14, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 12,
    transition: 'all 0.2s',
};

const deptCardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const chipStyle = {
    padding: '3px 10px', borderRadius: 20,
    background: 'var(--bg)', color: 'var(--text)',
    fontSize: 11, fontWeight: 600,
    border: '1px solid var(--border)',
    whiteSpace: 'nowrap',
};

const emptyStyle = {
    padding: 48, textAlign: 'center',
};

const modalOverlayStyle = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
};

const modalStyle = {
    background: 'var(--surface)', borderRadius: 16, padding: 28,
    maxWidth: 520, width: '100%',
    border: '1px solid var(--border)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxHeight: '90vh', overflowY: 'auto',
};

const closeBtnStyle = {
    width: 32, height: 32, borderRadius: 8,
    background: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
