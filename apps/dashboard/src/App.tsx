import { useCallback, useEffect, useState } from "react";
import { Dashboard } from "./Dashboard";
import { setAuthToken, setUnauthorizedHandler } from "./lib/api";
import {
  type Session,
  clearSession,
  loadSession,
  saveSession,
} from "./lib/session";
import { LoginPage } from "./pages/LoginPage";

const SESSION_ENDED = "Your session has ended. Please sign in again.";
const MAX_TIMEOUT_MS = 2 ** 31 - 1; // batas setTimeout

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = loadSession();
    setAuthToken(saved?.token ?? null); // harus terpasang sebelum halaman mana pun memanggil API
    return saved;
  });
  const [notice, setNotice] = useState<string | null>(null);

  const signOut = useCallback((message: string | null = null) => {
    clearSession();
    setAuthToken(null);
    setSession(null);
    setNotice(message);
  }, []);

  // Server menjawab 401 di panggilan mana pun: sesi tidak berlaku lagi
  useEffect(() => {
    setUnauthorizedHandler(() => signOut(SESSION_ENDED));
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Keluar otomatis tepat saat token kedaluwarsa
  useEffect(() => {
    if (!session) return;
    const wait = Math.min(
      Math.max(session.expiresAt - Date.now(), 0),
      MAX_TIMEOUT_MS,
    );
    const timer = setTimeout(() => signOut(SESSION_ENDED), wait);
    return () => clearTimeout(timer);
  }, [session, signOut]);

  if (!session) {
    return (
      <LoginPage
        notice={notice}
        onLoggedIn={(next) => {
          saveSession(next);
          setAuthToken(next.token);
          setNotice(null);
          setSession(next);
        }}
      />
    );
  }

  return (
    <Dashboard
      session={session}
      onSignOut={() => signOut()}
      onSessionEnded={() => signOut(SESSION_ENDED)}
    />
  );
}
