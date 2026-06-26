import { Outlet } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell/AppShell";

export function ProtectedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
