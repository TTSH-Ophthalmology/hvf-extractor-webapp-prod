import { Outlet } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell/AppShell";
import { ExtractionWorkflowProvider } from "../context/ExtractionWorkflowContext";

export function ProtectedLayout() {
  return (
    <ExtractionWorkflowProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ExtractionWorkflowProvider>
  );
}
