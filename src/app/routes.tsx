import React from "react";
import { createBrowserRouter, useNavigate } from "react-router";
import { Root } from "./components/Root";
import { HomeFeed } from "./components/HomeFeed";
import { OOTDPost } from "./components/OOTDPost";
import { PostDetail } from "./components/PostDetail";
import { AllOOTDs } from "./components/AllOOTDs";
import { Community } from "./components/Community";
import { Profile } from "./components/Profile";
import { AIOutfitGenerator } from "./components/AIOutfitGenerator";
import { Closet } from "./components/Closet";
import { ReRank } from "./components/ReRank";
import { OOTDCapture } from "./components/OOTDCapture";
import { BodyAnalyze } from "./components/BodyAnalyze";
import { Login } from "./components/Login";
import { SignUp } from "./components/SignUp";
import { ConfirmEmail } from "./components/ConfirmEmail";
import { LandingOrApp } from "./components/LandingOrApp";
import { Providers } from "./Providers";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Providers />,
    children: [
      { path: "login", Component: Login },
      { path: "signup", Component: SignUp },
      { path: "confirm-email", Component: ConfirmEmail },
      {
        path: "",
        element: <LandingOrApp />,
        children: [
          { index: true, Component: HomeFeed },
          { path: "post", Component: OOTDPost },
          {
            path: "capture",
            Component: function CaptureRoute() {
              const navigate = useNavigate();
              return <OOTDCapture onClose={() => navigate("/")} />;
            },
          },
          { path: "post/:postId", Component: PostDetail },
          { path: "ootds", Component: AllOOTDs },
          { path: "community", Component: Community },
          { path: "profile", Component: Profile },
          { path: "profile/:userId", Component: Profile },
          { path: "search", Component: AIOutfitGenerator },
          { path: "closet", Component: Closet },
          { path: "analyze", Component: BodyAnalyze },
          { path: "rerank", Component: ReRank },
        ],
      },
    ],
  },
]);
