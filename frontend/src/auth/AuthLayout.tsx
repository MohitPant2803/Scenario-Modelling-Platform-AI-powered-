import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Button from "../components/common/Button";
import { api } from "../lib/api";

export type AuthUser = { id: string; name: string; email: string };

export default function AuthLayout() {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    api<AuthUser | null>("/auth/me")
      .then((u) => setUser(u))
      .catch(() => setUser(null));
  }, [location.pathname]);

  const logout = async () => {
    await api<{ ok: boolean }>("/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <div className="stack">
      <header
        className="card topbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <Link to="/" className="brand-link">
          Scenario Analysis Platform
        </Link>
        <nav className="topbar-nav">
          {user === undefined ? (
            <span style={{ color: "#6b7280" }}>...</span>
          ) : user ? (
            <>
              <Link to="/my-projects" className="topbar-action topbar-action-secondary">
                My projects
              </Link>
              <span className="topbar-user-chip">
                <span className="topbar-user-label">Signed in as</span>
                <strong>{user.name}</strong>
              </span>
              <Button type="button" variant="ghost" className="topbar-logout-button" onClick={() => void logout()}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="topbar-action topbar-action-secondary">
                Log in
              </Link>
              <Link to="/register" className="topbar-action topbar-action-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
