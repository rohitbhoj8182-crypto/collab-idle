import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AuthPage } from './components/Auth/AuthPage.jsx';
import { Landing } from './components/Landing.jsx';
import { IDE } from './components/IDE.jsx';

function AppInner() {
  const { user, loading, logout, token } = useAuth();
  const [session, setSession] = useState(null);

  const handleStart = useCallback(({ roomId, userName }) => {
    setSession({ roomId, userName });
  }, []);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)' }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={() => {}} />;
  }

  if (!session) {
    return (
      <Landing
        onStart={handleStart}
        user={user}
        onLogout={() => { logout(); setSession(null); }}
      />
    );
  }

  return (
    <IDE
      roomId={session.roomId}
      userName={session.userName || user.username}
      token={token}
      onLogout={() => { logout(); setSession(null); }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
