/**
 * Cloudflare Worker proxy for Fantasy Nerds API
 * Solves CORS issues by making server-side API calls
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    const url = new URL(request.url);

    // Only allow specific paths
    const allowedPaths = [
      '/nfl/schedule',
      '/nfl/weekly-projections',
      '/nfl/injuries'
    ];

    const path = url.pathname;

    if (!allowedPaths.some(p => path.endsWith(p))) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      // Build Fantasy Nerds API URL
      const fantasyNerdsUrl = new URL(`https://api.fantasynerds.com/v1${path}`);

      // Add API key from environment variable
      fantasyNerdsUrl.searchParams.set('apikey', env.FANTASY_NERDS_API_KEY);

      // Forward any additional query params (like week)
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'apikey') {
          fantasyNerdsUrl.searchParams.set(key, value);
        }
      }

      // Make request to Fantasy Nerds API
      const response = await fetch(fantasyNerdsUrl.toString(), {
        method: request.method,
        headers: {
          'Accept': 'application/json',
        }
      });

      // Get response data
      const data = await response.json();

      // Return with CORS headers
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
