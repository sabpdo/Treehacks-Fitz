import { Outlet } from "react-router";
import { AuthProvider } from "../contexts/AuthContext";
import { AppStoreProvider } from "./context/AppStore";
import { PostSheetProvider } from "./context/PostSheetContext";

/**
 * Wraps all routes with required providers so that route components
 * (HomeFeed, etc.) always have access to AppStore and Auth context,
 * regardless of how React Router renders the tree.
 */
export function Providers() {
  return (
    <AuthProvider>
      <AppStoreProvider>
        <PostSheetProvider>
          <Outlet />
        </PostSheetProvider>
      </AppStoreProvider>
    </AuthProvider>
  );
}
