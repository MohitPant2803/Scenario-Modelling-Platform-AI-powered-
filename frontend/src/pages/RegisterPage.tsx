import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { api } from "../lib/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api<{ id: string; name: string; email: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="card stack auth-card" onSubmit={onSubmit}>
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow-label">Create account</span>
          <h1 style={{ margin: 0 }}>Sign up</h1>
          <p className="muted-text" style={{ margin: 0 }}>
            Start building and organizing scenario projects in one consistent workspace.
          </p>
        </div>

        <label className="stack auth-field">
          <span>Name</span>
          <input
            className="field-input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </label>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>

        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Use at least 8 characters.</p>

        {error ? <p className="auth-error">{error}</p> : null}

        <Button type="submit" variant="primary" disabled={loading} style={{ width: "100%", justifyContent: "center", minHeight: 48 }}>
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
