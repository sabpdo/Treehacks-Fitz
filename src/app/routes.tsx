import { createBrowserRouter } from "react-router-dom";
import { Root } from "./components/Root";
import { HomeFeed } from "./components/HomeFeed";
import { OOTDPost } from "./components/OOTDPost";
import { Profile } from "./components/Profile";
import { AIOutfitGenerator } from "./components/AIOutfitGenerator";
import { Closet } from "./components/Closet";
import { Login } from "./components/Login";
import { SignUp } from "./components/SignUp";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: SignUp,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Root />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: HomeFeed },
      { path: "post", Component: OOTDPost },
      { path: "profile", Component: Profile },
      { path: "ai-generator", Component: AIOutfitGenerator },
      { path: "closet", Component: Closet },
    ],
  },
]);
