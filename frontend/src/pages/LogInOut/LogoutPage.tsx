import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export const LogoutPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoading(true);

    try {
      await api.post("/api/refresh/revoke");
    } finally {
      navigate("/token", { replace: true });
    }
  };

  useEffect(() => {
    void handleLogout();
  }, []);

  return (
    <main>
      {loading ? "Logging out..." : "Redirecting..."}
    </main>
  );
};
