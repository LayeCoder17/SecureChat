import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
                <div className="flex items-center justify-between mb-7">
                    <div>
                        <h1 className="text-2xl auth-brand">SecureChat</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            Connexion à votre espace de travail
                        </p>
                    </div>
                    <ThemeToggle />
                </div>

                {error && <div className="alert-error mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Email professionnel</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="input"
                            placeholder="vous@entreprise.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Mot de passe</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="input pr-12"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem' }}
                                tabIndex={-1}
                            >
                                {showPassword ? 'Masquer' : 'Afficher'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full">
                        {loading ? (
                            <span className="inline-flex items-center justify-center gap-2">
                                <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                                Connexion...
                            </span>
                        ) : 'Se connecter'}
                    </button>
                </form>

                <div className="flex items-center gap-3 my-6">
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Nouveau ici ?</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                <Link to="/register" className="btn-ghost w-full text-center block" style={{ padding: '0.75rem' }}>
                    Créer un compte professionnel
                </Link>
            </div>
        </div>
    );
}

export default Login;
