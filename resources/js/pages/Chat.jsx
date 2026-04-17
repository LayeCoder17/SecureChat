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

const PUSHER_KEY = import.meta.env.VITE_PUSHER_APP_KEY || 'securechat-key';
const PUSHER_HOST = import.meta.env.VITE_PUSHER_HOST || window.location.hostname;
const PUSHER_PORT = Number(import.meta.env.VITE_PUSHER_PORT || 6001);
const PUSHER_SCHEME = import.meta.env.VITE_PUSHER_SCHEME || 'http';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1';

let echo = null;
try {
    echo = new Echo({
        broadcaster: 'pusher',
        key: PUSHER_KEY,
        cluster: PUSHER_CLUSTER,
        wsHost: PUSHER_HOST,
        wsPort: PUSHER_PORT,
        wssPort: PUSHER_PORT,
        forceTLS: PUSHER_SCHEME === 'https',
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
        authorizer: (channel) => ({
            authorize: (socketId, callback) => {
                api.post('/broadcasting/auth', {
                    socket_id: socketId,
                    channel_name: channel.name,
                })
                    .then((res) => callback(null, res.data))
                    .catch((err) => callback(err));
            },
        }),
    });
} catch (e) {
    console.warn('[Echo] Initialisation échouée, temps réel désactivé:', e);
}

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

function Sidebar({ conversations, activeId, onSelect, onNewChat, onLogout, user, view, setView, mobileOpen, onCloseMobile }) {
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
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        {conv.last_message?.encrypted_content || getConversationRole(conv) || 'Aucun message'}
                                    </p>
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
                                                                    className={`status-dot ${
                                                                        m.status === 'online' ? 'status-online'
                                                                            : m.status === 'away' ? 'status-away'
                                                                                : 'status-offline'
                                                                    }`}
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.encrypted_content}
                    </p>
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
   Chat area
   ============================================================ */

function ChatArea({ conversation, user, onOpenSidebar }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const getConversationName = () => {
        if (!conversation) return '';
        if (conversation.name) return conversation.name;
        const other = conversation.users?.find((u) => u.id !== user?.id);
        return other?.name || 'Conversation';
    };

    const getOtherUser = () => conversation?.users?.find((u) => u.id !== user?.id);

    useEffect(() => {
        if (!conversation?.id) return;
        setLoading(true);
        api.get(`/conversations/${conversation.id}/messages`)
            .then((res) => {
                const msgs = res.data.data?.reverse() || [];
                setMessages(msgs);
                const lastReceived = [...msgs].reverse().find((m) => m.user_id !== user?.id);
                if (lastReceived) api.post(`/messages/${lastReceived.id}/read`).catch(console.error);
            })
            .catch(console.error)
            .finally(() => setLoading(false));

        if (!echo) return;
        const channel = echo.private(`conversation.${conversation.id}`);
        channel.listen('MessageSent', (e) => {
            if (e.message.user_id !== user?.id) setMessages((prev) => [...prev, e.message]);
        });

        return () => echo && echo.leave(`conversation.${conversation.id}`);
    }, [conversation?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            const res = await api.post(`/conversations/${conversation.id}/messages`, { encrypted_content: newMessage });
            setMessages((prev) => [...prev, res.data]);
            setNewMessage('');
        } catch (err) { console.error(err); }
        finally { setSending(false); }
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
                    <span className="status-dot status-online" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                        {getConversationName()}
                    </h2>
                    <p className="text-xs truncate" style={{ color: ROLE_COLORS[other?.role] || 'var(--text-muted)' }}>
                        {other?.poste || 'En ligne'}
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
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                    <button type="button" className="btn-icon" title="Joindre un fichier" aria-label="Joindre un fichier">
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
                        disabled={!newMessage.trim() || sending}
                        className="btn-icon"
                        style={{
                            background: newMessage.trim() ? 'var(--grad-primary)' : 'var(--bg-elev)',
                            borderColor: newMessage.trim() ? 'transparent' : 'var(--border)',
                            color: newMessage.trim() ? '#fff' : 'var(--text-subtle)',
                            boxShadow: newMessage.trim() ? 'var(--shadow-glow)' : 'none',
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
            />

            {mobileOpen && <div className="chat-backdrop" onClick={() => setMobileOpen(false)} />}

            <ChatArea
                conversation={activeConversation}
                user={user}
                onOpenSidebar={() => setMobileOpen(true)}
            />
        </div>
    );
}

export default Chat;
