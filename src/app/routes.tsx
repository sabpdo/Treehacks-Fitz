import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { HomeFeed } from "./components/HomeFeed";
import { OOTDPost } from "./components/OOTDPost";
import { PostDetail } from "./components/PostDetail";
import { AllOOTDs } from "./components/AllOOTDs";
import { Profile } from "./components/Profile";
import { AIOutfitGenerator } from "./components/AIOutfitGenerator";
import { Closet } from "./components/Closet";
import { ReRank } from "./components/ReRank";
import { Login } from "./components/Login";
import { SignUp } from "./components/SignUp";
import { ConfirmEmail } from "./components/ConfirmEmail";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Providers } from "./Providers";

export const router = createBrowserRouter([
  {
    element: <Providers />,
    children: [
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/signup",
        Component: SignUp,
      },
      {
        path: "/confirm-email",
        Component: ConfirmEmail,
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
          { path: "post/:postId", Component: PostDetail },
          { path: "ootds", Component: AllOOTDs },
          { path: "profile", Component: Profile },
          { path: "profile/:userId", Component: Profile },
          { path: "ai-generator", Component: AIOutfitGenerator },
          { path: "closet", Component: Closet },
          { path: "rerank", Component: ReRank },
        ],
      },
    ],
  },
]);
