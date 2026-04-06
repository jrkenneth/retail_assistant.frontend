import { useState } from "react";

type LoginPageProps = {
  onLogin: (username: string, password: string) => Promise<void>;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onLogin(username.trim(), password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card retail-login-card">
        <div className="login-copy">
          <span className="login-brand-mark">Velora</span>
          <h1>Sign in to continue</h1>
          <p>Use your Velora customer credentials to continue with Lena.</p>
        </div>

        <form className="login-form" onSubmit={(event) => { void handleSubmit(event); }}>
          <label className="login-label">
            Username
            <input
              className="login-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder=""
              disabled={isSubmitting}
            />
          </label>

          <label className="login-label">
            Password
            <input
              className="login-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder=""
              disabled={isSubmitting}
            />
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <button className="primary-btn retail-primary-btn login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
