import '../css/app.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import { ThemeProvider } from './theme';

function App() {
    const token = localStorage.getItem('token');

    return (
        <Routes>
            <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
            <Route path="/*" element={token ? <Chat /> : <Navigate to="/login" />} />
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
