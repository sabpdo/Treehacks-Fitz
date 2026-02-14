import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { HomeFeed } from "./components/HomeFeed";
import { OOTDPost } from "./components/OOTDPost";
import { Profile } from "./components/Profile";
import { AIOutfitGenerator } from "./components/AIOutfitGenerator";
import { Closet } from "./components/Closet";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomeFeed },
      { path: "post", Component: OOTDPost },
      { path: "profile", Component: Profile },
      { path: "ai-generator", Component: AIOutfitGenerator },
      { path: "closet", Component: Closet },
    ],
  },
]);
