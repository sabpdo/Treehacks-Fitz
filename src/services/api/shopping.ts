import type { ScrapedProduct } from '../../types/shopping';

const BRIGHTDATA_API_KEY = import.meta.env.VITE_BRIGHTDATA_API_KEY;

// Bright Data Dataset IDs for different stores
// Get these from https://brightdata.com/products/datasets
const DATASET_IDS = {
  'H&M': import.meta.env.VITE_BRIGHTDATA_HM_DATASET_ID || 'gd_lebec5ir293umvxh5g',
  'Zara': import.meta.env.VITE_BRIGHTDATA_ZARA_DATASET_ID,
  'Uniqlo': import.meta.env.VITE_BRIGHTDATA_UNIQLO_DATASET_ID,
};

interface BrightDataProduct {
  title?: string;
  name?: string;
  final_price?: string;
  price?: string;
  url?: string;
  image?: string;
  images?: string[];
  description?: string;
}

interface BrightDataTriggerResponse {
  snapshot_id: string;
}

interface BrightDataSnapshotResponse {
  status: string;
  data?: any[];
}

/**
 * Search for products using Bright Data Scraper API
 */
export async function searchProducts(query: string): Promise<ScrapedProduct[]> {
  try {
    // If no API key, return mock data for development
    if (!BRIGHTDATA_API_KEY) {
      console.warn('BRIGHTDATA_API_KEY not set, using mock data');
      return getMockProducts(query);
    }

    // For now, we'll search H&M since we have the dataset ID
    // In production, you'd search multiple stores in parallel
    const hmProducts = await searchStore('H&M', query);

    return hmProducts;
  } catch (error) {
    console.error('Error searching products:', error);
    // Fallback to mock data if scraping fails
    return getMockProducts(query);
  }
}

/**
 * Search a specific store using Bright Data Scraper API (trigger endpoint)
 * Uses discovery mode with category_url
 */
async function searchStore(
  storeName: 'H&M' | 'Zara' | 'Uniqlo',
  query: string
): Promise<ScrapedProduct[]> {
  const datasetId = DATASET_IDS[storeName];

  if (!datasetId) {
    console.warn(`No dataset ID configured for ${storeName}`);
    return [];
  }

  try {
    // Build search URL for the store
    const searchUrl = buildSearchUrl(storeName, query);

    console.log(`Triggering scrape for ${storeName} with query: ${query}`);
    console.log(`Search URL: ${searchUrl}`);

    // Step 1: Trigger the scraping job using discovery mode with category_url
    const triggerResponse = await fetch(
      `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&notify=false&include_errors=true&type=discover_new&discover_by=category`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: [{ category_url: searchUrl }]
        }),
      }
    );

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error('Bright Data trigger error:', errorText);
      throw new Error(`Bright Data API error: ${triggerResponse.status}`);
    }

    const triggerData: BrightDataTriggerResponse = await triggerResponse.json();
    const snapshotId = triggerData.snapshot_id;

    console.log(`Scraping job triggered, snapshot ID: ${snapshotId}`);

    // Step 2: Poll for results
    const products = await pollForResults(snapshotId, storeName);

    return products;
  } catch (error) {
    console.error(`Error scraping ${storeName}:`, error);
    return [];
  }
}

/**
 * Poll for scraping results using snapshot ID
 */
async function pollForResults(
  snapshotId: string,
  storeName: 'H&M' | 'Zara' | 'Uniqlo',
  maxAttempts: number = 30,
  delayMs: number = 3000
): Promise<ScrapedProduct[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`Polling for results (attempt ${attempt + 1}/${maxAttempts})...`);

      const response = await fetch(
        `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
        {
          headers: {
            'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Snapshot API error: ${response.status}`, errorText);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      const data: BrightDataSnapshotResponse = await response.json();
      console.log('Snapshot response:', data);

      if (data.status === 'ready' && data.data) {
        console.log(`Results ready! Found ${data.data.length} items`);
        console.log('First item:', data.data[0]);
        return parseScrapedData(data.data, storeName);
      }

      console.log(`Status: ${data.status}, waiting...`);

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error('Error polling for results:', error);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.warn('Timeout waiting for scraping results');
  return [];
}

/**
 * Build search URL for a specific store
 */
function buildSearchUrl(storeName: 'H&M' | 'Zara' | 'Uniqlo', query: string): string {
  const encodedQuery = encodeURIComponent(query);

  switch (storeName) {
    case 'H&M':
      return `https://www2.hm.com/en_us/search-results.html?q=${encodedQuery}`;
    case 'Zara':
      return `https://www.zara.com/us/en/search?searchTerm=${encodedQuery}`;
    case 'Uniqlo':
      return `https://www.uniqlo.com/us/en/search?q=${encodedQuery}`;
    default:
      return '';
  }
}

/**
 * Parse Bright Data scraper response
 */
function parseScrapedData(data: any, storeName: 'H&M' | 'Zara' | 'Uniqlo'): ScrapedProduct[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data
    .filter((item: BrightDataProduct) => item && (item.title || item.name))
    .map((item: BrightDataProduct) => ({
      name: item.title || item.name || 'Unknown Product',
      price: item.final_price || item.price || 'Price unavailable',
      url: item.url || '#',
      image: item.image || (item.images && item.images[0]),
      store: storeName,
      description: item.description,
    }))
    .slice(0, 5); // Limit to 5 products as per rate limit
}

/**
 * Get mock products for development/testing
 */
function getMockProducts(query: string): ScrapedProduct[] {
  const lowerQuery = query.toLowerCase();

  const allMockProducts: ScrapedProduct[] = [
    {
      name: 'Uniqlo Heattech Turtleneck',
      price: '$19.90',
      url: 'https://www.uniqlo.com/us/en/products/E455359-000',
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
      store: 'Uniqlo',
      category: 'shirts',
    },
    {
      name: 'Uniqlo Ultra Light Down Jacket',
      price: '$69.90',
      url: 'https://www.uniqlo.com/us/en/products/E455360-000',
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
      store: 'Uniqlo',
      category: 'jackets_outerwear',
    },
    {
      name: 'Zara High Waist Jeans',
      price: '$45.90',
      url: 'https://www.zara.com/us/en/high-waist-jeans-p01538243.html',
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
      store: 'Zara',
      category: 'pants',
    },
    {
      name: 'Zara Oversized Blazer',
      price: '$99.00',
      url: 'https://www.zara.com/us/en/oversized-blazer-p02010240.html',
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
      store: 'Zara',
      category: 'jackets_outerwear',
    },
    {
      name: 'Uniqlo EZY Ankle Pants',
      price: '$39.90',
      url: 'https://www.uniqlo.com/us/en/products/E455361-000',
      image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400',
      store: 'Uniqlo',
      category: 'pants',
    },
    {
      name: 'Zara Satin Midi Dress',
      price: '$79.90',
      url: 'https://www.zara.com/us/en/satin-dress-p02183251.html',
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
      store: 'Zara',
      category: 'skirts_dresses',
    },
    {
      name: 'Uniqlo Merino Crew Neck Sweater',
      price: '$59.90',
      url: 'https://www.uniqlo.com/us/en/products/E455362-000',
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
      store: 'Uniqlo',
      category: 'jackets_outerwear',
    },
    {
      name: 'Zara Leather Ankle Boots',
      price: '$119.00',
      url: 'https://www.zara.com/us/en/leather-ankle-boots-p12345678.html',
      image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
      store: 'Zara',
      category: 'shoes',
    },
  ];

  // Filter products based on query
  return allMockProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.category?.toLowerCase().includes(lowerQuery) ||
      lowerQuery.split(' ').some(word =>
        product.name.toLowerCase().includes(word) ||
        product.category?.toLowerCase().includes(word)
      )
  );
}