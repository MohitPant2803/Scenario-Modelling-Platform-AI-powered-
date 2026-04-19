import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { api } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api<{ id: string; name: string; email: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="card stack auth-card" onSubmit={onSubmit}>
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow-label">Welcome back</span>
          <h1 style={{ margin: 0 }}>Log in</h1>
          <p className="muted-text" style={{ margin: 0 }}>
            Access your projects and continue working on your scenario analysis.
          </p>
        </div>

        <label className="stack auth-field">
          <span>Email</span>
          <input
            className="field-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="stack auth-field">
          <span>Password</span>
          <input
            className="field-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <Button type="submit" variant="primary" disabled={loading} style={{ width: "100%", justifyContent: "center", minHeight: 48 }}>
          {loading ? "Signing in..." : "Log in"}
        </Button>

        <p className="auth-footer">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </form>
    </main>
  );
}
