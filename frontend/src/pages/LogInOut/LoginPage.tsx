import { useState } from "react";
import { AlertCircle, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import nhgeiLogo from "../../assets/images/NHGEI-logo.jpg";
import api from "../../services/api";
import "./LoginPage.css";

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const form = new FormData();
      form.append("username", username);
      form.append("password", password);

      await api.post("/api/token", form);

      window.location.href = "/";
    } catch {
      setError("Invalid username or password");
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="HVF Extractor login">
        <div className="login-hero" aria-hidden="true">
          <div className="login-hero-content">
            <p className="login-eyebrow">Tan Tock Seng Hospital</p>
            <h1>HVF Extractor</h1>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-card">
          <div className="login-card-header">
            <img
              className="login-hospital-logo"
              src={nhgeiLogo}
              alt="NHGEI logo"
            />
          </div>

          <div className="login-form-content">
            <div>
              <h2>Welcome Back!</h2>
            </div>

            {error && (
              <p className="login-error">
                <AlertCircle size={18} strokeWidth={2.4} aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            <label className="login-field">
              <span>Username</span>
              <div className="login-input-wrap">
                <UserRound size={16} strokeWidth={2.2} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="Enter your username"
                />
              </div>
            </label>

            <label className="login-field">
              <span>Password</span>
              <div className="login-input-wrap">
                <LockKeyhole size={16} strokeWidth={2.2} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <Eye size={16} strokeWidth={2.2} />
                  ) : (
                    <EyeOff size={16} strokeWidth={2.2} />
                  )}
                </button>
              </div>
            </label>

            <button type="submit" className="login-submit">
              Login
            </button>

            <p className="login-footnote">
              Authorized hospital staff access only
            </p>
          </div>
        </form>
      </section>
    </main>
  );
};
