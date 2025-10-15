# Token Bowl Deployment Guide

This guide covers deploying the Token Bowl website with all dependencies, including the Cloudflare Worker proxy for the Fantasy Nerds API.

## Prerequisites

- Node.js 20+ and npm
- GitHub account (for GitHub Pages hosting)
- Cloudflare account (for Worker proxy)
- Fantasy Nerds API key (from https://www.fantasynerds.com/)
- YouTube API key (from https://console.cloud.google.com/apis/credentials)

## Step 1: Deploy the Cloudflare Worker

The Fantasy Nerds API does not support CORS, so we need a Cloudflare Worker to act as a proxy.

### 1.1 Install Wrangler CLI

```bash
npm install -g wrangler
```

### 1.2 Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for authentication.

### 1.3 Deploy the Worker

```bash
cd cloudflare-worker
wrangler deploy
```

You'll get a URL like: `https://tokenbowl-api-proxy.<your-subdomain>.workers.dev`

**Save this URL** - you'll need it for the next step.

### 1.4 Set the Fantasy Nerds API Key Secret

```bash
wrangler secret put FANTASY_NERDS_API_KEY
```

When prompted, paste your Fantasy Nerds API key.

## Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

- `VITE_YOUTUBE_API_KEY` - Your YouTube Data API v3 key
- `VITE_FANTASY_NERDS_PROXY_URL` - Your Cloudflare Worker URL from Step 1.3

**Note:** The `VITE_FANTASY_FOOTBALL_NERD_API_KEY` is NO LONGER NEEDED in GitHub secrets since the API key is now stored securely in the Cloudflare Worker.

## Step 3: Update Frontend Configuration

Edit `src/fantasyNerdsApi.js` and replace the placeholder URL:

```javascript
const BASE_URL = import.meta.env.VITE_FANTASY_NERDS_PROXY_URL || 'https://tokenbowl-api-proxy.YOUR_SUBDOMAIN.workers.dev'
```

Replace `YOUR_SUBDOMAIN` with your actual Cloudflare Workers subdomain.

## Step 4: Deploy to GitHub Pages

### 4.1 Push Changes

```bash
git add .
git commit -m "feat: add Cloudflare Worker proxy for Fantasy Nerds API"
git push origin main
```

### 4.2 Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Source: **GitHub Actions**
3. The workflow will automatically deploy on every push to `main`

### 4.3 Monitor Deployment

Check the **Actions** tab to see the deployment progress. The workflow:
1. Runs tests
2. Builds the production bundle
3. Deploys to GitHub Pages

## Step 5: Verify Deployment

1. Visit your GitHub Pages URL (usually `https://<username>.github.io/<repo-name>`)
2. Open browser DevTools → Console
3. Look for successful API calls (no CORS errors)
4. Verify bye week badges display correctly

## Troubleshooting

### CORS Errors

If you still see CORS errors:
- Verify the Cloudflare Worker is deployed and running
- Check that `VITE_FANTASY_NERDS_PROXY_URL` is set correctly in GitHub secrets
- Confirm the worker URL in `src/fantasyNerdsApi.js` matches your deployed worker

### Bye Weeks Not Working

If all players show BYE badges:
- Check browser console for Fantasy Nerds API errors
- Verify the Cloudflare Worker secret is set: `wrangler secret list`
- Test the worker directly: `curl https://tokenbowl-api-proxy.YOUR_SUBDOMAIN.workers.dev/nfl/schedule`

### 404 Errors

If the worker returns 404:
- Ensure the endpoints in `worker.js` match the frontend requests
- Check that paths include `/nfl/` prefix (e.g., `/nfl/schedule` not `/schedule`)

## Local Development

For local development without deploying the worker:

1. Create a `.env` file:
```bash
VITE_YOUTUBE_API_KEY=your_youtube_key
VITE_FANTASY_FOOTBALL_NERD_API_KEY=your_fantasy_nerds_key
```

2. The app will use mock data when the API key is not configured (useful for testing)

3. To test with the Cloudflare Worker locally:
```bash
cd cloudflare-worker
wrangler dev
```

Then set `VITE_FANTASY_NERDS_PROXY_URL=http://localhost:8787` in your `.env` file.

## Security Notes

- ✅ API keys are stored as secrets (GitHub Secrets, Cloudflare Secrets)
- ✅ API keys are never exposed in client-side JavaScript
- ✅ Cloudflare Worker validates requests and only proxies allowed endpoints
- ✅ Responses are cached for 5 minutes to reduce API calls

## Cost Estimates

- **GitHub Pages**: Free for public repositories
- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **Fantasy Nerds API**: Varies by plan (check their pricing)
- **YouTube Data API**: Free tier includes 10,000 quota units/day

## Updates and Maintenance

To update the Cloudflare Worker:

```bash
cd cloudflare-worker
# Edit worker.js as needed
wrangler deploy
```

The GitHub Pages deployment updates automatically on every push to `main`.
