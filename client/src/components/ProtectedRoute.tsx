import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { portalForOrgType, type PortalKey } from "../lib/portals";
import { AppLayout } from "./AppLayout";

export function ProtectedRoute({ portal }: { portal: PortalKey }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!getToken() || !user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (portalForOrgType(user.organization_type) !== portal) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout portal={portal}>
      <Outlet />
    </AppLayout>
  );
}
