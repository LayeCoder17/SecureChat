import '../css/app.css';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import { applyTheme, getPreferredTheme, THEME_STORAGE_KEY } from './theme';

function App() {
    const token = localStorage.getItem('token');
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const initial = getPreferredTheme();
        setTheme(initial);
        applyTheme(initial);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
        localStorage.setItem(THEME_STORAGE_KEY, next);
    };

    return (
        <Routes>
            <Route path="/login" element={token ? <Navigate to="/" /> : <Login theme={theme} onToggleTheme={toggleTheme} />} />
            <Route path="/register" element={token ? <Navigate to="/" /> : <Register theme={theme} onToggleTheme={toggleTheme} />} />
            <Route path="/*" element={token ? <Chat theme={theme} onToggleTheme={toggleTheme} /> : <Navigate to="/login" />} />
        </Routes>
    );
}

createRoot(document.getElementById('app')).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);
