import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

function Register({ theme, onToggleTheme }) {
    const [form, setForm] = useState({
        name: '', email: '', password: '', password_confirmation: '',
        department_id: '', role: '', poste: '',
    });
    const [departments, setDepartments] = useState([]);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        axios.get('/api/departments/list').then(res => setDepartments(res.data)).catch(console.error);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setErrors({});
        try {
            const res = await axios.post('/api/auth/register', form);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            window.location.href = '/';
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
            }
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: 'employe', label: 'Employé' },
        { value: 'chef_service', label: 'Chef de Service' },
        { value: 'directeur', label: 'Directeur' },
        { value: 'pdg', label: 'PDG' },
    ];

    return (
        <div className="auth-shell">
            <div className="auth-card" style={{ width: 'min(100%, 560px)' }}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Inscription</h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Creer un compte professionnel</p>
                    </div>
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                </div>

                {error && (
                    <div className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="input"
                        placeholder="Nom complet"
                        required
                    />
                    {errors.name && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.name[0]}</p>}

                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="input"
                        placeholder="Email professionnel"
                        required
                    />
                    {errors.email && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.email[0]}</p>}

                    <div className="grid grid-cols-2 gap-3">
                        <select
                            value={form.department_id}
                            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                            className="input"
                            required
                        >
                            <option value="">Departement</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="input"
                            required
                        >
                            <option value="">Role</option>
                            {roles.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <input
                        type="text"
                        value={form.poste}
                        onChange={(e) => setForm({ ...form, poste: e.target.value })}
                        className="input"
                        placeholder="Intitule du poste"
                        required
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="input"
                            placeholder="Mot de passe"
                            required
                        />
                        <input
                            type="password"
                            value={form.password_confirmation}
                            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                            className="input"
                            placeholder="Confirmation"
                            required
                        />
                    </div>
                    {errors.password && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.password[0]}</p>}

                    <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                        {loading ? 'Creation...' : 'Creer mon compte'}
                    </button>
                </form>

                <p className="text-sm text-center mt-6" style={{ color: 'var(--text-muted)' }}>
                    Deja inscrit ?{' '}
                    <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
