# Token Bowl API Proxy (Cloudflare Worker)

This Cloudflare Worker acts as a proxy for the Fantasy Nerds API to solve CORS issues in production.

## Why?

The Fantasy Nerds API does not support CORS (Cross-Origin Resource Sharing), which prevents client-side JavaScript from making direct API calls in production. This worker:

1. Accepts requests from the Token Bowl frontend
2. Makes server-side API calls to Fantasy Nerds (no CORS restrictions)
3. Returns data with proper CORS headers
4. Keeps the API key secure (stored as a Cloudflare secret)

## Setup

### 1. Install Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Set the API Key Secret

```bash
cd cloudflare-worker
wrangler secret put FANTASY_NERDS_API_KEY
# Enter your Fantasy Nerds API key when prompted
```

## Deployment

### Deploy to Cloudflare Workers

```bash
cd cloudflare-worker
wrangler deploy
```

This will deploy the worker and give you a URL like:
```
https://tokenbowl-api-proxy.<your-subdomain>.workers.dev
```

## Usage

The worker proxies the following Fantasy Nerds API endpoints:

- `/nfl/schedule` - NFL game schedule
- `/nfl/weekly-projections?week=X` - Weekly player projections
- `/nfl/injuries?week=X` - Injury reports

### Example Request

Instead of:
```
https://api.fantasynerds.com/v1/nfl/schedule?apikey=YOUR_KEY
```

Use:
```
https://tokenbowl-api-proxy.<your-subdomain>.workers.dev/nfl/schedule
```

The API key is automatically added by the worker.

## Local Development

Test the worker locally:

```bash
wrangler dev
```

Then update your `.env.local` to use `http://localhost:8787` as the API base URL.

## Security

- The API key is stored as a Cloudflare secret (never in code)
- Only specific whitelisted endpoints are allowed
- CORS headers allow requests from any origin (can be restricted if needed)
- Responses are cached for 5 minutes to reduce API calls

## Updating the Frontend

Update `src/fantasyNerdsApi.js` to use the worker URL:

```javascript
const API_BASE_URL = 'https://tokenbowl-api-proxy.<your-subdomain>.workers.dev'
```
