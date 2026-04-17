import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

function Login({ theme, onToggleTheme }) {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/auth/login', form);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            window.location.href = '/';
        } catch (err) {
            setError(err.response?.data?.message || 'Identifiants incorrects');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">SecureChat</h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Connexion a votre espace</p>
                    </div>
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                </div>

                {error && (
                    <div className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="input"
                            placeholder="vous@entreprise.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Mot de passe</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="input"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full">
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                <p className="text-sm text-center mt-6" style={{ color: 'var(--text-muted)' }}>
                    Nouveau collaborateur ?{' '}
                    <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Créer un compte
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
