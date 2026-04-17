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

const echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true,
    authorizer: (channel) => ({
        authorize: (socketId, callback) => {
            api.post('/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channel.name,
            }).then(res => callback(null, res.data))
                .catch(err => callback(err));
        },
    }),
});

const ROLE_LABELS = {
    pdg: 'PDG',
    directeur: 'Directeur',
    chef_service: 'Chef de Service',
    employe: 'Employé',
};

const ROLE_COLORS = {
    pdg: '#f59e0b',
    directeur: '#06b6d4',
    chef_service: '#8b5cf6',
    employe: '#64748b',
};

const DEPT_ICONS = {
    DG: '👔', RH: '👥', FIN: '💰', IT: '💻', COM: '📈', LOG: '📦', JUR: '⚖️',
};

function getInitials(name) {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
}

// ── Sidebar ──
function Sidebar({ conversations, activeId, onSelect, onNewChat, onLogout, user, view, setView, theme, onToggleTheme }) {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [expandedDept, setExpandedDept] = useState(null);
    const [channels, setChannels] = useState([]);

    useEffect(() => {
        api.get('/departments').then(res => setDepartments(res.data)).catch(console.error);
        api.get('/channels').then(res => setChannels(res.data)).catch(console.error);
    }, []);

    const handleSearch = async (q) => {
        setSearch(q);
        if (q.length < 2) { setSearchResults([]); return; }
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
        const other = conv.users?.find(u => u.id !== user?.id);
        return other?.name || 'Conversation';
    };

    const getConversationRole = (conv) => {
        const other = conv.users?.find(u => u.id !== user?.id);
        return other?.poste || other?.role || '';
    };

    return (
        <div className="flex flex-col h-full" style={{
            background: 'var(--panel)',
            borderRight: '1px solid var(--border)',
        }}>
            {/* Header */}
            <div className="p-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-lg font-bold" style={{
                        fontFamily: "'Sora', sans-serif",
                        background: 'linear-gradient(135deg, #22d3ee, #818cf8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>SecureChat</h1>
                    <div className="flex items-center gap-2">
                        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                        <button onClick={onLogout} className="p-2 rounded-lg transition-colors duration-200"
                                style={{ color: '#64748b' }}
                                onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.target.style.color = '#64748b'}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Navigation tabs */}
                <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)' }}>
                    {[
                        { id: 'chats', label: 'Messages', icon: '💬', badge: conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0) },
                        { id: 'org', label: 'Entreprise', icon: '🏢', badge: 0 },
                        { id: 'channels', label: 'Canaux', icon: '#', badge: 0 },
                        ].map(tab => (
                        <button key={tab.id} onClick={() => setView(tab.id)}
                                className="flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200"
                                style={{
                                    fontFamily: "'Sora', sans-serif",
                                    background: view === tab.id ? 'rgba(6,182,212,0.15)' : 'transparent',
                                    color: view === tab.id ? '#06b6d4' : '#64748b',
                                    border: view === tab.id ? '1px solid rgba(6,182,212,0.2)' : '1px solid transparent',
                                }}>
    <span className="flex items-center justify-center gap-1">
        {tab.icon} {tab.label}
        {tab.badge > 0 && (
            <span className="min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: '#ef4444', fontSize: '10px' }}>
                {tab.badge > 99 ? '99+' : tab.badge}
            </span>
        )}
    </span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
                           className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none transition-all duration-300"
                           style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.15)', fontFamily: "'Sora', sans-serif" }}
                           onFocus={(e) => e.target.style.border = '1px solid rgba(6,182,212,0.4)'}
                           onBlur={(e) => e.target.style.border = '1px solid rgba(100,116,139,0.15)'}
                           placeholder="Rechercher un collègue, poste..."
                    />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="mt-2 rounded-xl overflow-hidden max-h-64 overflow-y-auto" style={{
                        background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(100,116,139,0.15)',
                    }}>
                        {searchResults.map(u => (
                            <button key={u.id} onClick={() => startChat(u.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors duration-200 text-left"
                                    style={{ borderBottom: '1px solid rgba(100,116,139,0.08)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(6,182,212,0.08)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                                     style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[u.role] || '#64748b'}, #3b82f6)` }}>
                                    {getInitials(u.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate" style={{ fontFamily: "'Sora', sans-serif" }}>{u.name}</p>
                                    <p className="text-xs truncate" style={{ color: ROLE_COLORS[u.role] }}>{u.poste}</p>
                                    <p className="text-xs truncate" style={{ color: '#475569' }}>{u.department?.name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content based on view */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>

                {/* ── Messages View ── */}
                {view === 'chats' && (
                    conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full px-6">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(6,182,212,0.1)' }}>
                                <span className="text-2xl">💬</span>
                            </div>
                            <p className="text-sm text-center" style={{ color: '#64748b', fontFamily: "'Sora', sans-serif" }}>
                                Aucune conversation.<br />Recherchez un collègue ou parcourez l'entreprise.
                            </p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <button key={conv.id} onClick={() => onSelect(conv.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-200 text-left"
                                    style={{
                                        background: activeId === conv.id ? 'rgba(6,182,212,0.1)' : 'transparent',
                                        borderLeft: activeId === conv.id ? '3px solid #22d3ee' : '3px solid transparent',
                                        borderBottom: '1px solid rgba(100,116,139,0.06)',
                                    }}
                                    onMouseEnter={(e) => { if (activeId !== conv.id) e.currentTarget.style.background = 'rgba(6,182,212,0.06)'; }}
                                    onMouseLeave={(e) => { if (activeId !== conv.id) e.currentTarget.style.background = 'transparent'; }}>
                                <div className="relative shrink-0">
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                                         style={{ background: conv.type === 'group' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'linear-gradient(135deg, #22d3ee, #818cf8)' }}>
                                        {conv.type === 'group' ? '#' : getInitials(getConversationName(conv))}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate" style={{ fontFamily: "'Sora', sans-serif" }}>
                                        {getConversationName(conv)}
                                    </p>
                                    <p className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>
                                        {conv.last_message?.encrypted_content || getConversationRole(conv) || 'Aucun message'}
                                    </p>
                                </div>
                                {conv.unread_count > 0 && (
                                    <div className="shrink-0 min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center"
                                         style={{ background: 'linear-gradient(135deg, #22d3ee, #818cf8)', boxShadow: '0 0 10px rgba(6,182,212,0.4)' }}>
                        <span className="text-xs font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
                            {conv.unread_count > 99 ? '99+' : conv.unread_count}
                        </span>
                                    </div>
                                )}
                            </button>
                        ))
                    )
                )}

                {/* ── Organisation View ── */}
                {view === 'org' && (
                    <div className="p-3">
                        {departments.map(dept => (
                            <div key={dept.id} className="mb-2">
                                <button onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200"
                                        style={{
                                            background: expandedDept === dept.id ? 'rgba(6,182,212,0.1)' : 'rgba(30,41,59,0.4)',
                                            border: expandedDept === dept.id ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(100,116,139,0.08)',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = expandedDept === dept.id ? 'rgba(6,182,212,0.1)' : 'rgba(30,41,59,0.6)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = expandedDept === dept.id ? 'rgba(6,182,212,0.1)' : 'rgba(30,41,59,0.4)'}>
                                    <span className="text-xl">{DEPT_ICONS[dept.code] || '🏢'}</span>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-white" style={{ fontFamily: "'Sora', sans-serif" }}>{dept.name}</p>
                                        <p className="text-xs" style={{ color: '#64748b' }}>{dept.members?.length || 0} membres</p>
                                    </div>
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedDept === dept.id ? 'rotate-180' : ''}`}
                                         style={{ color: '#64748b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {expandedDept === dept.id && dept.members && (
                                    <div className="mt-1 ml-4 space-y-1">
                                        {/* Trier par rôle */}
                                        {['pdg', 'directeur', 'chef_service', 'employe'].map(role => {
                                            const roleMembers = dept.members.filter(m => m.role === role);
                                            if (roleMembers.length === 0) return null;
                                            return (
                                                <div key={role}>
                                                    <p className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 mt-2"
                                                       style={{ color: ROLE_COLORS[role], fontFamily: "'Sora', sans-serif" }}>
                                                        {ROLE_LABELS[role]}
                                                    </p>
                                                    {roleMembers.map(member => (
                                                        <button key={member.id} onClick={() => startChat(member.id)}
                                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200"
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(6,182,212,0.08)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                            <div className="relative shrink-0">
                                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                                                     style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[member.role]}, #3b82f6)` }}>
                                                                    {getInitials(member.name)}
                                                                </div>
                                                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                                                                     style={{
                                                                         background: member.status === 'online' ? '#22c55e' : member.status === 'away' ? '#eab308' : '#64748b',
                                                                         borderColor: '#0f172a',
                                                                     }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0 text-left">
                                                                <p className="text-xs font-medium text-white truncate" style={{ fontFamily: "'Sora', sans-serif" }}>
                                                                    {member.name}
                                                                </p>
                                                                <p className="text-xs truncate" style={{ color: '#475569' }}>{member.poste}</p>
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

                {/*  Channels View  */}
                {view === 'channels' && (
                    <div className="p-3 space-y-1">
                        {channels.map(ch => (
                            <button key={ch.id} onClick={() => {
                                api.get('/conversations').then(res => {
                                    const channelConv = res.data.find(c => c.name && c.name.startsWith(ch.name));
                                    if (channelConv) { onNewChat(channelConv); }
                                });
                            }}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left"
                                    style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.06)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(6,182,212,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30,41,59,0.4)'}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                                     style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontFamily: "'Sora', sans-serif" }}>
                                    #
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate" style={{ fontFamily: "'Sora', sans-serif" }}>{ch.name}</p>
                                    <p className="text-xs truncate" style={{ color: '#64748b' }}>{ch.description}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.15)', color: '#64748b' }}>
                        {ch.members_count || 0}
                    </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* User info */}
            <div className="p-4" style={{ borderTop: '1px solid rgba(100,116,139,0.08)' }}>
                <div className="flex items-center gap-3 px-2 py-2 rounded-xl"
                     style={{ background: 'rgba(30,41,59,0.3)' }}>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                             style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[user?.role] || '#06b6d4'}, #4f46e5)` }}>
                            {getInitials(user?.name)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                             style={{ background: '#22c55e', borderColor: '#0f172a' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Sora', sans-serif" }}>{user?.name}</p>
                        <p className="text-xs truncate" style={{ color: ROLE_COLORS[user?.role], fontFamily: "'Sora', sans-serif", fontSize: '10px' }}>
                            {user?.poste || ROLE_LABELS[user?.role]}
                        </p>
                    </div>
                    <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }} />
                </div>
            </div>
        </div>
    );
}

//  Message Bubble
function MessageBubble({ message, isOwn }) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
            {!isOwn && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mr-2 mt-1"
                     style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[message.user?.role] || '#06b6d4'}, #3b82f6)` }}>
                    {getInitials(message.user?.name)}
                </div>
            )}
            <div className={`max-w-xs lg:max-w-sm`}>
                {!isOwn && (
                    <p className="text-xs font-semibold mb-1 ml-1" style={{ color: ROLE_COLORS[message.user?.role] || '#06b6d4', fontFamily: "'Sora', sans-serif" }}>
                        {message.user?.name}
                    </p>
                )}
                <div className={`px-4 py-3 ${isOwn ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tl-md'}`}
                     style={{
                         background: isOwn
                             ? 'linear-gradient(135deg, #06b6d4, #6366f1)'
                             : 'rgba(30,41,59,0.6)',
                         border: isOwn ? 'none' : '1px solid rgba(100,116,139,0.08)',
                         boxShadow: isOwn
                             ? '0 4px 25px rgba(6,182,212,0.35)'
                             : '0 2px 10px rgba(0,0,0,0.1)',
                         backdropFilter: isOwn ? 'none' : 'blur(10px)',
                     }}>
                    <p className="text-sm leading-relaxed" style={{
                        color: isOwn ? '#ffffff' : '#e2e8f0',
                        fontFamily: "'Sora', sans-serif",
                    }}>
                        {message.encrypted_content}
                    </p>
                    <div className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : ''}`}>
                        <span className="text-xs" style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : '#475569', fontFamily: "'Sora', sans-serif", fontSize: '10px' }}>
                            {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && (
                            <svg className="w-4 h-4" style={{ color: message.is_read ? '#22d3ee' : 'rgba(255,255,255,0.35)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
// ── Chat Area ──
function ChatArea({ conversation, user }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const getConversationName = () => {
        if (conversation.name) return conversation.name;
        const other = conversation.users?.find(u => u.id !== user?.id);
        return other?.name || 'Conversation';
    };

    const getOtherUser = () => conversation.users?.find(u => u.id !== user?.id);

    useEffect(() => {
        if (!conversation?.id) return;
        setLoading(true);
        api.get(`/conversations/${conversation.id}/messages`)
            .then(res => {
                const msgs = res.data.data?.reverse() || [];
                setMessages(msgs);
                const lastReceived = [...msgs].reverse().find(m => m.user_id !== user?.id);
                if (lastReceived) {
                    api.post(`/messages/${lastReceived.id}/read`).catch(console.error);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));

        const channel = echo.private(`conversation.${conversation.id}`);
        channel.listen('MessageSent', (e) => {
            if (e.message.user_id !== user?.id) {
                setMessages(prev => [...prev, e.message]);
            }
        });

        return () => {
            echo.leave(`conversation.${conversation.id}`);
        };
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
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
        } catch (e) { console.error(e); }
        finally { setSending(false); }
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(6,182,212,0.04), #030712 60%)' }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                     style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                    <span className="text-4xl">🏢</span>
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{
                    fontFamily: "'Sora', sans-serif",
                    background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>SecureChat Entreprise</h2>
                <p className="text-sm text-center" style={{ color: '#475569', fontFamily: "'Sora', sans-serif" }}>
                    Sélectionnez une conversation ou<br />parcourez l'organigramme pour commencer
                </p>
            </div>
        );
    }

    const other = getOtherUser();

    return (
        <div className="flex-1 flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #0a1628, #030712)' }}>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-6 py-4" style={{
                background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid rgba(6,182,212,0.08)', backdropFilter: 'blur(20px)',
            }}>
                <div className="relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                         style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[other?.role] || '#06b6d4'}, #3b82f6)` }}>
                        {getInitials(getConversationName())}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                         style={{ background: '#22c55e', borderColor: '#0f172a' }} />
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
                        {getConversationName()}
                    </h2>
                    <p className="text-xs" style={{ color: ROLE_COLORS[other?.role] || '#64748b' }}>
                        {other?.poste || 'En ligne'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {other?.department?.name && (
                        <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>
                            {other.department.name}
                        </span>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                         style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#06b6d4' }} />
                        <span className="text-xs font-medium" style={{ color: '#06b6d4', fontFamily: "'Sora', sans-serif" }}>Chiffré E2E</span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <svg className="animate-spin h-8 w-8" style={{ color: '#06b6d4' }} viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm" style={{ color: '#475569', fontFamily: "'Sora', sans-serif" }}>
                            Commencez la conversation. Les messages sont chiffrés de bout en bout.
                        </p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} isOwn={msg.user_id === user?.id} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4" style={{
                background: 'rgba(3,7,18,0.95)',
                borderTop: '1px solid rgba(100,116,139,0.08)',
            }}>
                <form onSubmit={sendMessage} className="flex items-center gap-3">
                    <button type="button" className="p-3 rounded-xl transition-all duration-300 hover:scale-105"
                            style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.1)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.05)'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.1)'; }}>
                        <svg className="w-5 h-5" style={{ color: '#64748b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                        </svg>
                    </button>
                    <div className="flex-1 relative">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                               className="w-full px-5 py-3.5 rounded-2xl text-sm text-white focus:outline-none transition-all duration-500"
                               style={{
                                   fontFamily: "'Sora', sans-serif",
                                   background: 'rgba(15,23,42,0.8)',
                                   border: '1px solid rgba(100,116,139,0.1)',
                                   boxShadow: newMessage ? '0 0 20px rgba(6,182,212,0.05), inset 0 0 20px rgba(6,182,212,0.02)' : 'none',
                               }}
                               onFocus={(e) => { e.target.style.border = '1px solid rgba(6,182,212,0.3)'; e.target.style.boxShadow = '0 0 25px rgba(6,182,212,0.08)'; }}
                               onBlur={(e) => { e.target.style.border = '1px solid rgba(100,116,139,0.1)'; e.target.style.boxShadow = 'none'; }}
                               placeholder="Écrivez votre message..."
                        />
                    </div>
                    <button type="submit" disabled={!newMessage.trim() || sending}
                            className="p-3 rounded-xl transition-all duration-300 disabled:opacity-20 hover:scale-105 active:scale-95"
                            style={{
                                background: newMessage.trim() ? 'linear-gradient(135deg, #06b6d4, #6366f1)' : 'rgba(30,41,59,0.6)',
                                boxShadow: newMessage.trim() ? '0 0 25px rgba(8,145,178,0.3)' : 'none',
                                border: newMessage.trim() ? 'none' : '1px solid rgba(100,116,139,0.1)',
                            }}>
                        <svg className="w-5 h-5" style={{ color: newMessage.trim() ? '#ffffff' : '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
// ── Main Chat Page ──
function Chat({ theme, onToggleTheme }) {
    const [conversations, setConversations] = useState([]);
    const [activeConvId, setActiveConvId] = useState(null);
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [view, setView] = useState('chats');

    useEffect(() => {
        api.get('/user/profile').then(res => {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
        }).catch(console.error);

        api.get('/conversations').then(res => {
            setConversations(res.data);

            res.data.forEach(conv => {
                echo.private(`conversation.${conv.id}`)
                    .listen('MessageSent', (e) => {
                        const currentUser = JSON.parse(localStorage.getItem('user'));
                        setConversations(prev => {
                            const updated = prev.map(c => {
                                if (c.id === e.message.conversation_id) {
                                    return {
                                        ...c,
                                        last_message: e.message,
                                        unread_count: e.message.user_id !== currentUser?.id ? (c.unread_count || 0) + 1 : c.unread_count,
                                    };
                                }
                                return c;
                            });
                            const convIndex = updated.findIndex(c => c.id === e.message.conversation_id);
                            if (convIndex > 0) {
                                const [conv] = updated.splice(convIndex, 1);
                                updated.unshift(conv);
                            }
                            return updated;
                        });
                    });
            });
        }).catch(console.error);

        return () => {
            echo.disconnect();
        };
    }, []);

    const handleNewChat = (conv) => {
        setConversations(prev => {
            const exists = prev.find(c => c.id === conv.id);
            if (exists) return prev;
            return [conv, ...prev];
        });
        setActiveConvId(conv.id);
        setView('chats');
    };

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch (e) {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const activeConversation = conversations.find(c => c.id === activeConvId);

    return (
        <div className="h-screen flex" style={{ background: 'var(--bg)' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl"
                    style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(100,116,139,0.2)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-40 w-80 h-full transition-transform duration-300`}>
                <Sidebar conversations={conversations} activeId={activeConvId}
                         onSelect={(id) => {
                             setActiveConvId(id);
                             setView('chats');
                             setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
                             if (window.innerWidth < 1024) setSidebarOpen(false);
                         }}
                         onNewChat={handleNewChat} onLogout={handleLogout} user={user} view={view} setView={setView} theme={theme} onToggleTheme={onToggleTheme} />
            </div>

            {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" />}

            <ChatArea conversation={activeConversation} user={user} />
        </div>
    );
}

export default Chat;
