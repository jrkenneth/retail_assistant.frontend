import { useEffect, useState } from "react";
import type { AuthenticatedUser } from "../auth/authApi";
import { createAccessRequestApi, listAccessRequestsApi, type AccessRequestItem } from "./accessRequestsApi";
import { AccessRequestModal } from "./AccessRequestModal";

type AccessRequestsPageProps = {
  user: AuthenticatedUser;
  onLogout: () => Promise<void>;
};

export function AccessRequestsPage({ user, onLogout }: AccessRequestsPageProps) {
  const [items, setItems] = useState<AccessRequestItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listAccessRequestsApi();
        if (cancelled) {
          return;
        }
        setItems(data);
        setStatus("ready");
      } catch {
        if (cancelled) {
          return;
        }
        setStatus("error");
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (resourceRequested: string, justification: string) => {
    const created = await createAccessRequestApi(resourceRequested, justification);
    setItems((prev) => [created, ...prev]);
    setStatus("ready");
    setNotice(`Access request ${created.reference_number} submitted successfully.`);
  };

  return (
    <main className="viewer-page">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-header-copy">
            <h1>Access Requests</h1>
            <p>{user.full_name} · {user.customer_number} · {user.account_status}</p>
          </div>
        </div>
        <div className="app-header-actions">
          <a className="secondary-link app-header-link" href="/chat">Back to Chat</a>
          <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(true)}>
            New request
          </button>
          <button type="button" className="secondary-btn" onClick={() => { void onLogout(); }}>
            Log out
          </button>
        </div>
      </header>

      <section className="access-requests-page">
        {notice ? <div className="toast toast-success">{notice}</div> : null}
        {status === "loading" ? <p>Loading access requests...</p> : null}
        {status === "error" ? <p className="error-text">Failed to load access requests.</p> : null}
        {status === "ready" && items.length === 0 ? (
          <div className="empty-state">
            You have not submitted any access requests yet.
          </div>
        ) : null}

        {status === "ready" && items.length > 0 ? (
          <div className="access-request-list">
            {items.map((item) => (
              <article key={item.id} className="access-request-row">
                <div className="access-request-row-top">
                  <div>
                    <h2>{item.resource_requested}</h2>
                    <p>{item.reference_number}</p>
                  </div>
                  <span className={`request-status request-status--${item.status}`}>{item.status}</span>
                </div>
                <p className="access-request-justification">{item.justification}</p>
                <div className="access-request-meta">
                  <span>Submitted {new Date(item.created_at).toLocaleString()}</span>
                  <span>Requested as {item.requested_role}</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <AccessRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
      />
    </main>
  );
}
