import type { Category } from "./database";

export interface ScrapedProduct {
  name: string;
  price: string;
  image: string | null;
  url: string;
  store: string;
  category?: Category;
  description?: string;
}

