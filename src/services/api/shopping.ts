import type { ScrapedProduct } from '../../types/shopping';

// Use proxy server to avoid CORS issues
const PROXY_BASE_URL = (import.meta as any).env?.VITE_PROXY_URL || 'http://localhost:3001';

// Bright Data Dataset IDs for different stores
// Get these from https://brightdata.com/products/datasets
const DATASET_IDS = {
  'H&M': (import.meta as any).env?.VITE_BRIGHTDATA_HM_DATASET_ID || 'gd_lebec5ir293umvxh5g',
  'Zara': (import.meta as any).env?.VITE_BRIGHTDATA_ZARA_DATASET_ID,
  'Uniqlo': (import.meta as any).env?.VITE_BRIGHTDATA_UNIQLO_DATASET_ID,
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
  category?: string;
  product_name?: string;
  product_title?: string;
  product_url?: string;
  product_image?: string;
  product_price?: string;
  [key: string]: any; // Allow additional fields
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
 * Search a specific store using Bright Data Scraper API (synchronous scrape endpoint)
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

    console.log(`Scraping ${storeName} with query: ${query}`);
    console.log(`Search URL: ${searchUrl}`);

    // Call the synchronous scrape endpoint via proxy server
    const scrapeResponse = await fetch(
      `${PROXY_BASE_URL}/api/brightdata/scrape`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId,
          searchUrl,
        }),
      }
    );

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Bright Data scrape error:', errorText);
      throw new Error(`Bright Data API error: ${scrapeResponse.status}`);
    }

    const data: any = await scrapeResponse.json();
    console.log('Scrape response:', JSON.stringify(data, null, 2));

    // Handle array response (products returned directly)
    if (Array.isArray(data)) {
      // Filter out error objects from the array
      const errors = data.filter((item: any) => item.error || item.status === 'error');
      const validData = data.filter((item: any) => !item.error && item.status !== 'error');
      
      if (errors.length > 0) {
        console.warn(`⚠️ Found ${errors.length} error(s) in scrape:`, errors);
      }
      
      if (validData.length > 0) {
        console.log(`✅ Scrape completed! Found ${validData.length} valid items (${errors.length} errors filtered out)`);
        return parseScrapedData(validData, storeName);
      } else {
        console.warn('Scrape returned empty array (no products found)');
        return [];
      }
    }

    // Handle error response
    if (data.error) {
      console.error('Scrape error:', data.error);
      return [];
    }

    console.warn('Unexpected response format:', typeof data);
    return [];
  } catch (error) {
    console.error(`Error scraping ${storeName}:`, error);
    return [];
  }
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
    console.warn('parseScrapedData: Invalid data format', data);
    return [];
  }

  console.log('Parsing scraped data:', data.length, 'items');
  if (data.length > 0) {
    console.log('Sample item structure:', data[0]);
  }

  return data
    .filter((item: any) => {
      // Check for any name/title field
      const hasName = item?.title || item?.name || item?.product_name || item?.product_title;
      if (!hasName) {
        console.warn('Item missing name/title:', item);
      }
      return hasName;
    })
    .map((item: any) => {
      // Extract name - try multiple possible fields
      const name = item.title || item.name || item.product_name || item.product_title || 'Unknown Product';
      
      // Extract price - try multiple possible fields
      const price = item.final_price || item.price || item.product_price || 'Price unavailable';
      
      // Extract URL - try multiple possible fields, ensure it's absolute
      let url = item.url || item.product_url || item.link || '#';
      if (url && !url.startsWith('http')) {
        // If relative URL, make it absolute based on store
        if (storeName === 'H&M' && !url.startsWith('http')) {
          url = `https://www2.hm.com${url.startsWith('/') ? url : '/' + url}`;
        } else if (storeName === 'Zara' && !url.startsWith('http')) {
          url = `https://www.zara.com${url.startsWith('/') ? url : '/' + url}`;
        } else if (storeName === 'Uniqlo' && !url.startsWith('http')) {
          url = `https://www.uniqlo.com${url.startsWith('/') ? url : '/' + url}`;
        }
      }
      
      // Extract image - try multiple possible fields and handle relative URLs
      let image: string | undefined = undefined;
      
      // Try various image field names (prioritize main/primary images over thumbnails)
      const imageFields = [
        item.main_image,
        item.primary_image,
        item.product_image,
        item.image,
        item.img,
        item.product_img,
      ];
      
      // Check arrays - prefer larger images (usually first in array is main)
      if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        // Try to find the largest/main image (usually first, but check for 'main' or largest dimensions)
        const mainImg = item.images.find((img: any) => 
          typeof img === 'string' && (img.includes('main') || img.includes('primary') || img.includes('large'))
        ) || item.images[0];
        imageFields.unshift(mainImg); // Prioritize main image from array
      }
      if (item.image_urls && Array.isArray(item.image_urls) && item.image_urls.length > 0) {
        const mainImg = item.image_urls.find((img: any) => 
          typeof img === 'string' && (img.includes('main') || img.includes('primary') || img.includes('large'))
        ) || item.image_urls[0];
        imageFields.unshift(mainImg);
      }
      
      // Avoid thumbnails if we have other options
      const thumbnailFields = [item.thumbnail, item.product_thumbnail];
      
      // Find first valid image URL (skip thumbnails if we have better options)
      for (const img of imageFields) {
        if (img && typeof img === 'string' && img.trim()) {
          const trimmed = img.trim();
          // Skip if it's clearly a thumbnail and we might have better options
          if (!trimmed.includes('thumb') && !trimmed.includes('small')) {
            image = trimmed;
            break;
          } else if (!image) {
            // Use thumbnail as fallback
            image = trimmed;
          }
        }
      }
      
      // If still no image, try thumbnails
      if (!image) {
        for (const img of thumbnailFields) {
          if (img && typeof img === 'string' && img.trim()) {
            image = img.trim();
            break;
          }
        }
      }
      
      // If image is relative, make it absolute
      if (image && !image.startsWith('http')) {
        if (image.startsWith('//')) {
          image = `https:${image}`;
        } else if (image.startsWith('/')) {
          // Make absolute based on store domain
          if (storeName === 'H&M') {
            image = `https://www2.hm.com${image}`;
          } else if (storeName === 'Zara') {
            image = `https://www.zara.com${image}`;
          } else if (storeName === 'Uniqlo') {
            image = `https://www.uniqlo.com${image}`;
          }
        } else {
          // Relative path without leading slash
          if (storeName === 'H&M') {
            image = `https://www2.hm.com/${image}`;
          } else if (storeName === 'Zara') {
            image = `https://www.zara.com/${image}`;
          } else if (storeName === 'Uniqlo') {
            image = `https://www.uniqlo.com/${image}`;
          }
        }
      }
      
      // Log image extraction for debugging
      if (image) {
        console.log(`Extracted image for "${name}":`, image);
      } else {
        console.warn(`No image found for "${name}"`, item);
      }
      
      // Extract description
      const description = item.description || item.product_description || undefined;
      
      // Extract category - try to infer from name or use provided category
      let category: string | undefined = item.category;
      if (!category && name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('shirt') || nameLower.includes('top') || nameLower.includes('blouse') || nameLower.includes('t-shirt')) {
          category = 'shirts';
        } else if (nameLower.includes('pant') || nameLower.includes('jean') || nameLower.includes('trouser')) {
          category = 'pants';
        } else if (nameLower.includes('dress') || nameLower.includes('skirt')) {
          category = 'skirts_dresses';
        } else if (nameLower.includes('jacket') || nameLower.includes('coat') || nameLower.includes('outerwear')) {
          category = 'jackets_outerwear';
        } else if (nameLower.includes('shoe') || nameLower.includes('sneaker') || nameLower.includes('boot')) {
          category = 'shoes';
        } else if (nameLower.includes('bag') || nameLower.includes('accessory')) {
          category = 'bags';
        }
      }

      const product: ScrapedProduct = {
        name: name.trim(),
        price: price.trim(),
        url: url,
        image: image,
        store: storeName,
        description: description,
        category: category as any,
      };

      console.log('Parsed product:', product);
      return product;
    })
    .filter((product: ScrapedProduct) => product.name !== 'Unknown Product' && product.url !== '#')
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