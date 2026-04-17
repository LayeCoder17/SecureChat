import '../css/app.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import { ThemeProvider } from './theme';

function App() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const isAdmin = user?.role === 'admin';

    return (
        <Routes>
            <Route path="/login" element={token ? <Navigate to={isAdmin ? '/admin' : '/'} /> : <Login />} />
            <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
            <Route path="/admin" element={token ? <Admin /> : <Navigate to="/login" />} />
            <Route path="/*" element={token ? (isAdmin ? <Navigate to="/admin" /> : <Chat />) : <Navigate to="/login" />} />
        </Routes>
    );
}

createRoot(document.getElementById('app')).render(
    <ThemeProvider>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </ThemeProvider>
);
