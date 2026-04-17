import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import ThemeToggle from '../components/ThemeToggle';

window.Pusher = Pusher;

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Temps réel désactivé pour éviter les erreurs WS (sera réactivé en phase 3)
const echo = null;

const ROLE_LABELS = {
    pdg: 'PDG',
    directeur: 'Directeur',
    chef_service: 'Chef de Service',
    employe: 'Employé',
};

const ROLE_COLORS = {
    pdg: 'var(--role-pdg)',
    directeur: 'var(--role-directeur)',
    chef_service: 'var(--role-chef)',
    employe: 'var(--role-employe)',
};

const DEPT_ICONS = {
    DG: '👔', RH: '👥', FIN: '💰', IT: '💻', COM: '📈', LOG: '📦', JUR: '⚖️',
};

function getInitials(name) {
    return name?.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || '?';
}

function roleGradient(role) {
    const base = ROLE_COLORS[role] || 'var(--primary)';
    return `linear-gradient(135deg, ${base}, var(--primary))`;
}

/* ============================================================
   Sidebar
   ============================================================ */

function NotificationBell({ onOpenConversation }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const ref = useRef(null);

    const load = async () => {
        try {
            const r = await api.get('/notifications');
            setItems(r.data.notifications || []);
            setUnread(r.data.unread_count || 0);
        } catch (e) {}
    };

    useEffect(() => {
        load();
        const id = setInterval(async () => {
            try {
                const r = await api.get('/notifications/unread-count');
                setUnread(r.data.unread_count || 0);
            } catch (e) {}
        }, 20000);
        const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onClick);
        return () => { clearInterval(id); document.removeEventListener('mousedown', onClick); };
    }, []);

    const handleToggle = async () => {
        const next = !open;
        setOpen(next);
        if (next) await load();
    };

    const handleClick = async (n) => {
        try { await api.post(`/notifications/${n.id}/read`); } catch (e) {}
        setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
        setUnread((u) => Math.max(0, u - (n.read_at ? 0 : 1)));
        const convId = n.data?.conversation_id;
        if (convId && onOpenConversation) onOpenConversation(convId);
        setOpen(false);
    };

    const handleAllRead = async () => {
        try { await api.post('/notifications/read-all'); } catch (e) {}
        setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
        setUnread(0);
    };

    const timeAgo = (iso) => {
        if (!iso) return '';
        const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 60) return `${s}s`;
        if (s < 3600) return `${Math.floor(s / 60)}min`;
        if (s < 86400) return `${Math.floor(s / 3600)}h`;
        return `${Math.floor(s / 86400)}j`;
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={handleToggle} className="btn-icon" title="Notifications" aria-label="Notifications" style={{ position: 'relative' }}>
                <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.17V11a6 6 0 10-12 0v3.17a2 2 0 01-.6 1.43L4 17h5m6 0a3 3 0 11-6 0" />
                </svg>
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
                        padding: '0 4px', borderRadius: 999, background: 'var(--danger, #ef4444)',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--bg)',
                    }}>{unread > 99 ? '99+' : unread}</span>
                )}
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, maxHeight: 420,
                    background: 'var(--panel, var(--bg-elev))', border: '1px solid var(--border)',
                    borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', zIndex: 50,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 14, color: 'var(--text)' }}>Notifications</strong>
                        {unread > 0 && (
                            <button onClick={handleAllRead} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Tout marquer lu</button>
                        )}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {items.length === 0 ? (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>Aucune notification</div>
                        ) : items.map((n) => (
                            <button key={n.id} onClick={() => handleClick(n)} style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '10px 14px', border: 'none', cursor: 'pointer',
                                background: n.read_at ? 'transparent' : 'var(--primary-soft, rgba(99,102,241,0.08))',
                                borderBottom: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                    {!n.read_at && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--primary)' }} />}
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                                    <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>{timeAgo(n.created_at)}</span>
                                </div>
                                {n.body && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Sidebar({ conversations, activeId, onSelect, onNewChat, onLogout, user, view, setView, mobileOpen, onCloseMobile, onlineIds = [] }) {
    const isOnline = (id) => onlineIds.includes(id);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [expandedDept, setExpandedDept] = useState(null);
    const [channels, setChannels] = useState([]);

    useEffect(() => {
        api.get('/departments').then((res) => setDepartments(res.data)).catch(console.error);
        api.get('/channels').then((res) => setChannels(res.data)).catch(console.error);
    }, []);

    const handleSearch = async (q) => {
        setSearch(q);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await api.get(`/users/search?q=${q}`);
            setSearchResults(res.data);
        } catch (e) { console.error(e); }
    };

    const startChat = async (userId) => {
        try {
            const res = await api.post('/conversations', { type: 'private', user_ids: [userId] });
            onNewChat(res.data);
            setSearch('');
            setSearchResults([]);
            setView('chats');
        } catch (e) { console.error(e); }
    };

    const getConversationName = (conv) => {
        if (conv.name) return conv.name;
        const other = conv.users?.find((u) => u.id !== user?.id);
        return other?.name || 'Conversation';
    };

    const getConversationRole = (conv) => {
        const other = conv.users?.find((u) => u.id !== user?.id);
        return other?.poste || other?.role || '';
    };

    const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

    return (
        <aside className={`chat-sidebar ${mobileOpen ? 'is-open' : ''}`}>
            {/* Header */}
            <div className="sidebar-header">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="sidebar-brand">SecureChat</h1>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={onLogout}
                            className="btn-icon"
                            title="Se déconnecter"
                            aria-label="Se déconnecter"
                        >
                            <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="nav-tabs">
                    {[
                        { id: 'chats', label: 'Messages', icon: '💬', badge: totalUnread },
                        { id: 'org', label: 'Équipe', icon: '🏢', badge: 0 },
                        { id: 'channels', label: 'Canaux', icon: '#', badge: 0 },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            className={`nav-tab ${view === tab.id ? 'active' : ''}`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.badge > 0 && <span className="badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="search-wrap">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="search-input"
                        placeholder="Rechercher un collègue, un poste..."
                    />
                </div>

                {searchResults.length > 0 && (
                    <div
                        className="mt-2 rounded-xl overflow-hidden max-h-64 overflow-y-auto"
                        style={{ background: 'var(--panel-solid)', border: '1px solid var(--border)' }}
                    >
                        {searchResults.map((u) => (
                            <button
                                key={u.id}
                                onClick={() => startChat(u.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--panel-hover)]"
                                style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}
                            >
                                <div className="avatar avatar-sm" style={{ background: roleGradient(u.role) }}>
                                    {getInitials(u.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{u.name}</p>
                                    <p className="text-xs truncate" style={{ color: ROLE_COLORS[u.role] }}>{u.poste}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>{u.department?.name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {view === 'chats' && (
                    conversations.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">💬</div>
                            <p className="text-sm">
                                Aucune conversation.<br />
                                Recherchez un collègue ou parcourez l'équipe.
                            </p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => { onSelect(conv.id); onCloseMobile(); }}
                                className={`conv-row ${activeId === conv.id ? 'active' : ''}`}
                            >
                                <div className="relative shrink-0">
                                    <div
                                        className="avatar"
                                        style={{
                                            background: conv.type === 'group'
                                                ? 'linear-gradient(135deg, var(--role-chef), var(--primary))'
                                                : 'var(--grad-primary)',
                                        }}
                                    >
                                        {conv.type === 'group' ? '#' : getInitials(getConversationName(conv))}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                                        {getConversationName(conv)}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {conv.last_message ? (
                                            <>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: conv.unread_count > 0 ? 'var(--primary)' : 'var(--text-subtle)' }}>
                                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                                                    {new Date(conv.last_message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>{getConversationRole(conv) || 'Toucher pour discuter'}</span>
                                        )}
                                    </div>
                                </div>
                                {conv.unread_count > 0 && (
                                    <span className="badge" style={{ background: 'var(--primary)' }}>
                                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                                    </span>
                                )}
                            </button>
                        ))
                    )
                )}

                {view === 'org' && (
                    <div className="p-3">
                        {departments.map((dept) => (
                            <div key={dept.id} className="mb-2">
                                <button
                                    onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                                    style={{
                                        background: expandedDept === dept.id ? 'var(--primary-soft)' : 'var(--bg-elev)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text)',
                                    }}
                                >
                                    <span className="text-xl">{DEPT_ICONS[dept.code] || '🏢'}</span>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold">{dept.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {dept.members?.length || 0} membres
                                        </p>
                                    </div>
                                    <svg
                                        className={`w-4 h-4 transition-transform duration-200 ${expandedDept === dept.id ? 'rotate-180' : ''}`}
                                        style={{ color: 'var(--text-muted)' }}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {expandedDept === dept.id && dept.members && (
                                    <div className="mt-1 ml-3 space-y-1">
                                        {['pdg', 'directeur', 'chef_service', 'employe'].map((role) => {
                                            const roleMembers = dept.members.filter((m) => m.role === role);
                                            if (roleMembers.length === 0) return null;
                                            return (
                                                <div key={role}>
                                                    <p
                                                        className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 mt-2"
                                                        style={{ color: ROLE_COLORS[role] }}
                                                    >
                                                        {ROLE_LABELS[role]}
                                                    </p>
                                                    {roleMembers.map((m) => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => startChat(m.id)}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-[var(--panel-hover)]"
                                                            style={{ background: 'transparent', color: 'var(--text)' }}
                                                        >
                                                            <div className="relative shrink-0">
                                                                <div className="avatar avatar-sm" style={{ background: roleGradient(m.role) }}>
                                                                    {getInitials(m.name)}
                                                                </div>
                                                                <span
                                                                    className={`status-dot ${isOnline(m.id) ? 'status-online' : 'status-offline'}`}
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0 text-left">
                                                                <p className="text-xs font-medium truncate">{m.name}</p>
                                                                <p className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>{m.poste}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {view === 'channels' && (
                    <div className="p-3 space-y-2">
                        {channels.map((ch) => (
                            <button
                                key={ch.id}
                                onClick={() => {
                                    api.get('/conversations').then((res) => {
                                        const channelConv = res.data.find((c) => c.name && c.name.startsWith(ch.name));
                                        if (channelConv) onNewChat(channelConv);
                                    });
                                }}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                                style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                                    style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
                                >
                                    #
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{ch.name}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{ch.description}</p>
                                </div>
                                <span className="chip chip-muted">{ch.members_count || 0}</span>
                            </button>
                        ))}
                        {channels.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-state-icon">#</div>
                                <p className="text-sm">Aucun canal pour le moment</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* User footer */}
            <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
                >
                    <div className="relative">
                        <div className="avatar" style={{ background: roleGradient(user?.role) }}>
                            {getInitials(user?.name)}
                        </div>
                        <span className="status-dot status-online" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{user?.name}</p>
                        <p className="text-xs truncate" style={{ color: ROLE_COLORS[user?.role] }}>
                            {user?.poste || ROLE_LABELS[user?.role]}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

/* ============================================================
   Message bubble
   ============================================================ */

function MessageBubble({ message, isOwn }) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
            {!isOwn && (
                <div
                    className="avatar avatar-sm mr-2 mt-1"
                    style={{ background: roleGradient(message.user?.role) }}
                >
                    {getInitials(message.user?.name)}
                </div>
            )}
            <div className="max-w-[75%] sm:max-w-sm">
                {!isOwn && (
                    <p
                        className="text-xs font-semibold mb-1 ml-1"
                        style={{ color: ROLE_COLORS[message.user?.role] || 'var(--primary)' }}
                    >
                        {message.user?.name}
                    </p>
                )}
                <div className={isOwn ? 'bubble-own' : 'bubble-other'}>
                    {message.encrypted_content && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.encrypted_content}
                        </p>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: message.encrypted_content ? 8 : 0 }}>
                            {message.attachments.map((att) => <AttachmentItem key={att.id} att={att} isOwn={isOwn} />)}
                        </div>
                    )}
                    <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                        <span
                            className="text-[10px]"
                            style={{ color: isOwn ? 'rgba(255,255,255,0.75)' : 'var(--text-subtle)' }}
                        >
                            {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && (
                            <svg
                                className="w-4 h-4"
                                style={{ color: message.is_read ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)' }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M1 13l4 4L15 7" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 13l4 4L21 7" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   Attachment item
   ============================================================ */

function AttachmentItem({ att, isOwn }) {
    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };
    const isImage = att.mime_type && att.mime_type.startsWith('image/');
    const downloadUrl = `/api/attachments/${att.id}/download`;
    const token = localStorage.getItem('token');

    const handleDownload = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = att.original_name || att.filename || 'fichier';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
        }
    };

    const bg = isOwn ? 'rgba(255,255,255,0.18)' : 'var(--surface-muted, rgba(0,0,0,0.05))';
    const textColor = isOwn ? '#fff' : 'var(--text)';
    const subColor = isOwn ? 'rgba(255,255,255,0.75)' : 'var(--text-subtle)';

    return (
        <button
            type="button"
            onClick={handleDownload}
            style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                background: bg, borderRadius: 10, border: 'none', cursor: 'pointer',
                textAlign: 'left', width: '100%', color: textColor,
            }}
        >
            <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--primary-soft, rgba(99,102,241,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isImage ? (
                        <>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </>
                    ) : (
                        <>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </>
                    )}
                </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {att.original_name || att.filename || 'Fichier'}
                </div>
                <div style={{ fontSize: 11, color: subColor }}>{formatSize(att.size)}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
        </button>
    );
}

/* ============================================================
   Chat area
   ============================================================ */

function ChatArea({ conversation, user, onOpenSidebar, onlineIds = [] }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const getConversationName = () => {
        if (!conversation) return '';
        if (conversation.name) return conversation.name;
        const other = conversation.users?.find((u) => u.id !== user?.id);
        return other?.name || 'Conversation';
    };

    const getOtherUser = () => conversation?.users?.find((u) => u.id !== user?.id);

    useEffect(() => {
        if (!conversation?.id) return;
        let alive = true;
        setLoading(true);
        api.get(`/conversations/${conversation.id}/messages`)
            .then((res) => {
                if (!alive) return;
                const msgs = res.data.data?.reverse() || [];
                setMessages(msgs);
                const lastReceived = [...msgs].reverse().find((m) => m.user_id !== user?.id);
                if (lastReceived) api.post(`/messages/${lastReceived.id}/read`).catch(() => {});
            })
            .catch(console.error)
            .finally(() => { if (alive) setLoading(false); });

        // Polling: récupère les nouveaux messages toutes les 3s
        const poll = async () => {
            try {
                const res = await api.get(`/conversations/${conversation.id}/messages`);
                if (!alive) return;
                const msgs = res.data.data?.reverse() || [];
                setMessages((prev) => {
                    if (msgs.length === prev.length && msgs[msgs.length - 1]?.id === prev[prev.length - 1]?.id) {
                        return prev;
                    }
                    const lastReceived = [...msgs].reverse().find((m) => m.user_id !== user?.id);
                    if (lastReceived && lastReceived.id !== prev[prev.length - 1]?.id) {
                        api.post(`/messages/${lastReceived.id}/read`).catch(() => {});
                    }
                    return msgs;
                });
            } catch (e) {}
        };
        const pollId = setInterval(poll, 3000);

        if (echo) {
            const channel = echo.private(`conversation.${conversation.id}`);
            channel.listen('MessageSent', (e) => {
                if (e.message.user_id !== user?.id) setMessages((prev) => [...prev, e.message]);
            });
        }

        return () => {
            alive = false;
            clearInterval(pollId);
            if (echo) echo.leave(`conversation.${conversation.id}`);
        };
    }, [conversation?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && pendingFiles.length === 0) || sending) return;
        setSending(true);
        try {
            // 1. Créer le message (même vide si fichiers présents)
            const res = await api.post(`/conversations/${conversation.id}/messages`, {
                encrypted_content: newMessage || '',
            });
            const msg = res.data;

            // 2. Uploader chaque fichier
            if (pendingFiles.length > 0) {
                const attachments = [];
                for (const file of pendingFiles) {
                    const fd = new FormData();
                    fd.append('file', file);
                    const r = await api.post(`/messages/${msg.id}/attachments`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    attachments.push(r.data);
                }
                msg.attachments = attachments;
            }

            setMessages((prev) => [...prev, msg]);
            setNewMessage('');
            setPendingFiles([]);
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.message || 'Erreur lors de l\'envoi');
        } finally { setSending(false); }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        setPendingFiles((prev) => [...prev, ...files]);
        e.target.value = '';
    };

    if (!conversation) {
        return (
            <div className="chat-main">
                <div className="flex-1 flex flex-col items-center justify-center" style={{ background: 'var(--grad-bg)' }}>
                    <div className="empty-state-icon" style={{ width: '6rem', height: '6rem', fontSize: '2.5rem' }}>🏢</div>
                    <h2 className="text-xl font-bold mt-4 mb-2 auth-brand">SecureChat Entreprise</h2>
                    <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-muted)' }}>
                        Sélectionnez une conversation ou parcourez l'organigramme pour commencer à discuter.
                    </p>
                </div>
            </div>
        );
    }

    const other = getOtherUser();

    return (
        <div className="chat-main">
            {/* Header */}
            <div className="chat-header">
                <button
                    className="btn-icon lg:hidden"
                    onClick={onOpenSidebar}
                    aria-label="Ouvrir la liste"
                >
                    <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div className="relative">
                    <div className="avatar" style={{ background: roleGradient(other?.role) }}>
                        {getInitials(getConversationName())}
                    </div>
                    <span className={`status-dot ${other && onlineIds.includes(other.id) ? 'status-online' : 'status-offline'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                        {getConversationName()}
                    </h2>
                    <p className="text-xs truncate" style={{ color: ROLE_COLORS[other?.role] || 'var(--text-muted)' }}>
                        {other && onlineIds.includes(other.id) ? 'En ligne' : (other?.poste || 'Hors ligne')}
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    {other?.department?.name && <span className="chip chip-muted">{other.department.name}</span>}
                    <span className="chip">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                        Chiffré E2E
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="spinner" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">💬</div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Commencez la conversation.<br />
                            Les messages sont chiffrés de bout en bout.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} isOwn={msg.user_id === user?.id} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-bar">
                {pendingFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {pendingFiles.map((f, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 10px', background: 'var(--bg-elev)',
                                borderRadius: 999, border: '1px solid var(--border)',
                                fontSize: 12,
                            }}>
                                <span>📎</span>
                                <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                <button type="button" onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>×</button>
                            </div>
                        ))}
                    </div>
                )}
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-icon" title="Joindre un fichier" aria-label="Joindre un fichier">
                        <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                        </svg>
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="input"
                        style={{ borderRadius: '999px' }}
                        placeholder="Écrivez votre message..."
                    />
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && pendingFiles.length === 0) || sending}
                        className="btn-icon"
                        style={{
                            background: (newMessage.trim() || pendingFiles.length > 0) ? 'var(--grad-primary)' : 'var(--bg-elev)',
                            borderColor: (newMessage.trim() || pendingFiles.length > 0) ? 'transparent' : 'var(--border)',
                            color: (newMessage.trim() || pendingFiles.length > 0) ? '#fff' : 'var(--text-subtle)',
                            boxShadow: (newMessage.trim() || pendingFiles.length > 0) ? 'var(--shadow-glow)' : 'none',
                        }}
                        aria-label="Envoyer"
                    >
                        <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ============================================================
   Main Chat Page
   ============================================================ */

function Chat() {
    const [conversations, setConversations] = useState([]);
    const [activeConvId, setActiveConvId] = useState(null);
    const [user, setUser] = useState(null);
    const [view, setView] = useState('chats');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [onlineIds, setOnlineIds] = useState([]);

    // Heartbeat + online polling
    useEffect(() => {
        let alive = true;
        const ping = async () => {
            try { await api.post('/user/heartbeat'); } catch (e) {}
            try {
                const r = await api.get('/users/online');
                if (alive) setOnlineIds(r.data || []);
            } catch (e) {}
        };
        ping();
        const id = setInterval(ping, 30000);
        const onFocus = () => ping();
        window.addEventListener('focus', onFocus);
        return () => { alive = false; clearInterval(id); window.removeEventListener('focus', onFocus); };
    }, []);

    // Polling liste conversations toutes les 5s pour détecter nouveaux messages
    useEffect(() => {
        let alive = true;
        const fetchConvs = async () => {
            try {
                const res = await api.get('/conversations');
                if (alive) setConversations(res.data);
            } catch (e) {}
        };
        const id = setInterval(fetchConvs, 5000);
        return () => { alive = false; clearInterval(id); };
    }, []);

    useEffect(() => {
        api.get('/user/profile').then((res) => {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
        }).catch(console.error);

        api.get('/conversations').then((res) => {
            setConversations(res.data);

            if (!echo) return;
            res.data.forEach((conv) => {
                echo.private(`conversation.${conv.id}`).listen('MessageSent', (e) => {
                    const currentUser = JSON.parse(localStorage.getItem('user'));
                    setConversations((prev) => {
                        const updated = prev.map((c) => {
                            if (c.id === e.message.conversation_id) {
                                return {
                                    ...c,
                                    last_message: e.message,
                                    unread_count: e.message.user_id !== currentUser?.id
                                        ? (c.unread_count || 0) + 1
                                        : c.unread_count,
                                };
                            }
                            return c;
                        });
                        const convIndex = updated.findIndex((c) => c.id === e.message.conversation_id);
                        if (convIndex > 0) {
                            const [conv] = updated.splice(convIndex, 1);
                            updated.unshift(conv);
                        }
                        return updated;
                    });
                });
            });
        }).catch(console.error);

        return () => echo && echo.disconnect();
    }, []);

    const handleNewChat = (conv) => {
        setConversations((prev) => {
            const exists = prev.find((c) => c.id === conv.id);
            if (exists) return prev;
            return [conv, ...prev];
        });
        setActiveConvId(conv.id);
        setView('chats');
        setMobileOpen(false);
    };

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch (e) {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const activeConversation = conversations.find((c) => c.id === activeConvId);

    return (
        <div className="chat-shell">
            <Sidebar
                conversations={conversations}
                activeId={activeConvId}
                onSelect={(id) => {
                    setActiveConvId(id);
                    setView('chats');
                    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
                }}
                onNewChat={handleNewChat}
                onLogout={handleLogout}
                user={user}
                view={view}
                setView={setView}
                mobileOpen={mobileOpen}
                onCloseMobile={() => setMobileOpen(false)}
                onlineIds={onlineIds}
            />

            {mobileOpen && <div className="chat-backdrop" onClick={() => setMobileOpen(false)} />}

            <ChatArea
                conversation={activeConversation}
                user={user}
                onOpenSidebar={() => setMobileOpen(true)}
                onlineIds={onlineIds}
            />
        </div>
    );
}

export default Chat;
