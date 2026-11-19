import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentAdmin, type CurrentAdmin } from "@/data/admin";

// Wraps admin pages. Sends anyone who isn't a logged-in admin to /admin/login.
// This only controls what the page shows; the database rules are what actually
// stop non-admins from changing data.
export default function RequireAdmin({
  children,
}: {
  children: (admin: CurrentAdmin) => React.ReactNode;
}) {
  const [admin, setAdmin] = useState<CurrentAdmin | null | undefined>(undefined);

  useEffect(() => {
    getCurrentAdmin()
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  if (admin === undefined) {
    return <div className="container py-16 text-center text-muted-foreground">Checking your login...</div>;
  }
  if (admin === null) return <Navigate to="/admin/login" replace />;
  return <>{children(admin)}</>;
}