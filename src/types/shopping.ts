import type { Category } from './database';

export interface ScrapedProduct {
  name: string;
  price: string;
  url: string;
  image?: string;
  store: 'H&M' | 'Zara' | 'Uniqlo' | 'Other';
  category?: Category;
  description?: string;
}

export interface ProductSearchRequest {
  query: string;
  stores?: string[];
  maxResults?: number;
}