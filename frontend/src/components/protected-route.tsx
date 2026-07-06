import { Navigate, Outlet } from "react-router"
import { isAuthenticated } from "@/lib/auth/session"

export function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
