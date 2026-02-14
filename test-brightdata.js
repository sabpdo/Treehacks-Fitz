// Test Bright Data API directly
const BRIGHTDATA_API_KEY = '726146be-e415-457a-a916-30dea6313ccc';
const DATASET_ID = 'gd_lebec5ir293umvxh5g';

async function testBrightData() {
  const query = 'white shirts';
  const searchUrl = `https://www2.hm.com/en_us/search-results.html?q=${encodeURIComponent(query)}`;

  console.log('Testing Bright Data API...');
  console.log('Query:', query);
  console.log('Search URL:', searchUrl);
  console.log('');

  try {
    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}&notify=false&include_errors=true&type=discover_new&discover_by=category`,
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

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Success! Response:', JSON.stringify(data, null, 2));
    console.log('');
    console.log('Snapshot ID:', data.snapshot_id);
    console.log('');
    console.log('To check results, run:');
    console.log(`curl -H "Authorization: Bearer ${BRIGHTDATA_API_KEY}" "https://api.brightdata.com/datasets/v3/snapshot/${data.snapshot_id}?format=json"`);

  } catch (error) {
    console.error('Error:', error);
  }
}

testBrightData();