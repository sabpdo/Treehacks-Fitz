import React from "react";
import { RouterProvider } from "react-router";
import { AppStoreProvider } from "./context/AppStore";
import { PostSheetProvider } from "./context/PostSheetContext";
import { AuthProvider } from "../contexts/AuthContext";
import { router } from "./routes";

function App() {
  return (
    <AuthProvider>
      <AppStoreProvider>
        <PostSheetProvider>
          <RouterProvider router={router} />
        </PostSheetProvider>
      </AppStoreProvider>
    </AuthProvider>
  );
}

export default App;
