import { useEffect, useState } from "react";
import { ArtifactViewerPage } from "./features/artifacts/ArtifactViewerPage";
import { AccessRequestsPage } from "./features/access-requests/AccessRequestsPage";
import { LoginPage } from "./features/auth/LoginPage";
import {
  clearAuthToken,
  getAuthToken,
  getCurrentUserApi,
  loginApi,
  logoutApi,
  setUnauthorizedHandler,
  type AuthenticatedUser,
} from "./features/auth/authApi";
import { ChatWorkspace } from "./features/chat/ChatWorkspace";

type AuthStatus = "booting" | "authenticated" | "anonymous";

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("booting");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthToken();
      setUser(null);
      setAuthStatus("anonymous");
    };

    setUnauthorizedHandler(handleUnauthorized);

    const bootstrap = async () => {
      const token = getAuthToken();
      if (!token) {
        setAuthStatus("anonymous");
        return;
      }

      try {
        const me = await getCurrentUserApi();
        setUser(me);
        setAuthStatus("authenticated");
      } catch {
        clearAuthToken();
        setUser(null);
        setAuthStatus("anonymous");
      }
    };

    void bootstrap();

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const result = await loginApi(username, password);
    setUser(result.user);
    setAuthStatus("authenticated");
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore backend logout errors; removing the token is enough client-side.
    }
    clearAuthToken();
    setUser(null);
    setAuthStatus("anonymous");
  };

  const path = window.location.pathname;

  if (authStatus === "booting") {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-copy">
            <h1>Loading workspace</h1>
            <p>Checking your session and preparing Copilot.</p>
          </div>
        </section>
      </main>
    );
  }

  if (authStatus !== "authenticated" || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  let content = <ChatWorkspace user={user} onLogout={handleLogout} />;

  if (path.startsWith("/viewer/")) {
    content = <ArtifactViewerPage user={user} onLogout={handleLogout} />;
  } else if (path.startsWith("/access-requests")) {
    content = <AccessRequestsPage user={user} onLogout={handleLogout} />;
  }

  return <div className="authenticated-shell">{content}</div>;
}

export default App;
