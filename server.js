import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Proxy endpoint for Bright Data API - synchronous scrape endpoint
app.post('/api/brightdata/scrape', async (req, res) => {
  try {
    const { datasetId, searchUrl } = req.body;
    // Try both env var names
    const apiKey = process.env.BRIGHTDATA_API_KEY || process.env.VITE_BRIGHTDATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Bright Data API key not configured' });
    }

    if (!datasetId) {
      return res.status(400).json({ error: 'datasetId is required' });
    }

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    // Build query params matching the curl example
    const params = new URLSearchParams({
      dataset_id: datasetId,
      custom_output_fields: 'color,description,final_price,features,image_urls,url,error,category_tree,country_code,county_of_origin',
      notify: 'false',
      include_errors: 'true',
      type: 'discover_new',
      discover_by: 'category',
    });

    const url = `https://api.brightdata.com/datasets/v3/scrape?${params.toString()}`;
    
    console.log(`[Proxy] Scraping URL: ${url}`);
    console.log(`[Proxy] Search URL: ${searchUrl}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [{ category_url: searchUrl }]
      }),
    });

    const responseText = await response.text();
    console.log(`[Proxy] Scrape response status: ${response.status}`);
    console.log(`[Proxy] Scrape response length: ${responseText.length} chars`);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[Proxy] Scrape response parsed - is array: ${Array.isArray(data)}, length: ${Array.isArray(data) ? data.length : 'N/A'}`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`[Proxy] First item:`, JSON.stringify(data[0], null, 2));
      }
    } catch (e) {
      console.error(`[Proxy] Failed to parse response as JSON:`, e);
      console.error(`[Proxy] Response text:`, responseText.substring(0, 500));
      data = { error: 'Failed to parse response', raw: responseText };
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Bright Data scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for checking snapshot progress
app.get('/api/brightdata/progress/:snapshotId', async (req, res) => {
  try {
    const { snapshotId } = req.params;
    // Try both env var names
    const apiKey = process.env.BRIGHTDATA_API_KEY || process.env.VITE_BRIGHTDATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Bright Data API key not configured' });
    }

    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const data = await response.json();
    console.log(`[Proxy] Progress for ${snapshotId}:`, JSON.stringify(data, null, 2));
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Bright Data progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for downloading snapshot data
app.get('/api/brightdata/snapshot/:snapshotId', async (req, res) => {
  try {
    const { snapshotId } = req.params;
    // Try both env var names
    const apiKey = process.env.BRIGHTDATA_API_KEY || process.env.VITE_BRIGHTDATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Bright Data API key not configured' });
    }

    // Download the snapshot data directly (this is the correct endpoint per Bright Data docs)
    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const responseText = await response.text();
    console.log(`[Proxy] Snapshot ${snapshotId} status: ${response.status}`);
    console.log(`[Proxy] Snapshot ${snapshotId} response length: ${responseText.length} chars`);
    console.log(`[Proxy] Snapshot ${snapshotId} response (first 1000 chars):`, responseText.substring(0, 1000));
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[Proxy] Snapshot ${snapshotId} parsed - is array: ${Array.isArray(data)}, length: ${Array.isArray(data) ? data.length : 'N/A'}`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`[Proxy] First item:`, JSON.stringify(data[0], null, 2));
      }
    } catch (e) {
      console.error(`[Proxy] Failed to parse response as JSON:`, e);
      data = responseText;
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Bright Data snapshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});

