import { Outlet } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell/AppShell";
import { SingleExtractionWorkflowProvider } from "../context/SingleExtractionWorkflowContext";

export function ProtectedLayout() {
  return (
    <SingleExtractionWorkflowProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </SingleExtractionWorkflowProvider>
  );
}
