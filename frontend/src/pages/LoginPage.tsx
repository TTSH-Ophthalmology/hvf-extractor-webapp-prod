import { useState } from "react";
import api from "../services/api";

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow"
      >
        <h1 className="mb-6 text-2xl font-semibold">Login</h1>

        {error && (
          <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <label className="mb-2 block text-sm font-medium">Username</label>
        <input
          className="mb-4 w-full rounded border px-3 py-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <label className="mb-2 block text-sm font-medium">Password</label>
        <input
          className="mb-6 w-full rounded border px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button
          type="submit"
          className="w-full rounded bg-black px-4 py-2 text-white"
        >
          Login
        </button>
      </form>
    </main>
  );
};
