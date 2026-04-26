import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { api } from "../lib/api";
import type { AuthUser, UserRole } from "../types";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export default function AccessControlPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [creators, setCreators] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const currentUser = await api<AuthUser | null>("/auth/me");
        setMe(currentUser);

        if (!currentUser) {
          setLoading(false);
          return;
        }

        if (currentUser.role === "super_admin") {
          const allUsers = await api<ManagedUser[]>("/auth/users");
          setUsers(allUsers);
        } else if (currentUser.role === "admin") {
          const creatorUsers = await api<ManagedUser[]>("/auth/creators");
          setCreators(creatorUsers);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load access controls");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const reloadUsers = async () => {
    if (me?.role !== "super_admin") {
      return;
    }

    const allUsers = await api<ManagedUser[]>("/auth/users");
    setUsers(allUsers);
  };

  const promoteUser = async (userId: string, role: "admin" | "creator") => {
    setBusyUserId(userId);
    setError(null);

    try {
      await api<ManagedUser>(`/auth/promote/${userId}`, {
        method: "POST",
        body: JSON.stringify({ role })
      });
      await reloadUsers();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update access");
    } finally {
      setBusyUserId(null);
    }
  };

  const demoteUser = async (userId: string) => {
    setBusyUserId(userId);
    setError(null);

    try {
      await api<ManagedUser>(`/auth/demote/${userId}`, { method: "POST" });
      await reloadUsers();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to remove access");
    } finally {
      setBusyUserId(null);
    }
  };

  if (loading) {
    return <main className="stack"><div className="card">Loading access controls...</div></main>;
  }

  if (!me) {
    return <main className="stack"><div className="card">Please sign in first.</div></main>;
  }

  if (me.role !== "super_admin" && me.role !== "admin") {
    return <main className="stack"><div className="card">You do not have access to this area.</div></main>;
  }

  return (
    <main className="stack">
      <section className="card stack" style={{ gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>{me.role === "super_admin" ? "Access" : "Creators Directory"}</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            {me.role === "super_admin"
              ? "Grant admin access, return people to creator access, and review every account."
              : "View all creator accounts. Admins can edit or delete any document, but cannot change roles."}
          </p>
        </div>
        {error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}
      </section>

      {me.role === "super_admin" ? (
        <section className="card stack" style={{ gap: 12 }}>
          {users.map((user) => (
            <Card
              key={user.id}
              title={user.name}
              caption={user.email}
              meta={user.role}
              subtitle="Open this user's project list and manage their access from here."
              onClick={() => navigate(`/my-projects/${user.id}`)}
              footer={<span style={{ color: "#0f766e", fontWeight: 700 }}>Open projects</span>}
              actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button type="button" variant="primary" disabled={busyUserId === user.id || user.role === "admin" || user.role === "super_admin"} onClick={() => void promoteUser(user.id, "admin")}>
                    Make Admin
                  </Button>
                  <Button type="button" variant="secondary" disabled={busyUserId === user.id || user.role === "creator" || user.role === "super_admin"} onClick={() => void promoteUser(user.id, "creator")}>
                    Make Creator
                  </Button>
                  <Button type="button" variant="danger" disabled={busyUserId === user.id || user.role === "creator" || user.role === "super_admin"} onClick={() => void demoteUser(user.id)}>
                    Remove Admin Access
                  </Button>
                </div>
              }
            />
          ))}
        </section>
      ) : (
        <section className="card stack" style={{ gap: 12 }}>
          {creators.length === 0 ? (
            <div>No creators found.</div>
          ) : (
            creators.map((creator) => (
              <Card
                key={creator.id}
                title={creator.name}
                caption={creator.email}
                meta="creator"
                subtitle="Open this creator's project list to manage their documents."
                onClick={() => navigate(`/my-projects/${creator.id}`)}
                footer={<span style={{ color: "#0f766e", fontWeight: 700 }}>Open projects</span>}
              />
            ))
          )}
        </section>
      )}
    </main>
  );
}
