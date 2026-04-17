import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

function Register() {
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
                setError(err.response?.data?.message || "Erreur lors de l'inscription");
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
            <div className="auth-card" style={{ width: 'min(100%, 580px)' }}>
                <div className="flex items-center justify-between mb-7">
                    <div>
                        <h1 className="text-2xl auth-brand">Créer un compte</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            Rejoignez votre équipe sur SecureChat
                        </p>
                    </div>
                    <ThemeToggle />
                </div>

                {error && <div className="alert-error mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Nom complet</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="input"
                            placeholder="Prénom Nom"
                            required
                        />
                        {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.name[0]}</p>}
                    </div>

                    <div>
                        <label className="label">Email professionnel</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="input"
                            placeholder="vous@entreprise.com"
                            required
                        />
                        {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.email[0]}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="label">Département</label>
                            <select
                                value={form.department_id}
                                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                                className="input"
                                required
                            >
                                <option value="">Sélectionner...</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Rôle</label>
                            <select
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                className="input"
                                required
                            >
                                <option value="">Sélectionner...</option>
                                {roles.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Intitulé du poste</label>
                        <input
                            type="text"
                            value={form.poste}
                            onChange={(e) => setForm({ ...form, poste: e.target.value })}
                            className="input"
                            placeholder="Ex : Développeur Full-Stack"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="label">Mot de passe</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="input"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Confirmation</label>
                            <input
                                type="password"
                                value={form.password_confirmation}
                                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                                className="input"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>
                    {errors.password && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.password[0]}</p>}

                    <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                        {loading ? (
                            <span className="inline-flex items-center justify-center gap-2">
                                <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                                Création...
                            </span>
                        ) : 'Créer mon compte'}
                    </button>
                </form>

                <p className="text-sm text-center mt-6" style={{ color: 'var(--text-muted)' }}>
                    Déjà inscrit ?{' '}
                    <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
