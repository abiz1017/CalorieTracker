# CalorieTracker

A lightweight personal calorie/macro dashboard with a ChatGPT-facing MCP endpoint.

## What it does

- Shows today's calories and protein/carbs/fat against daily targets.
- Lets the website or ChatGPT log meals into the same data store.
- Displays ChatGPT-selected restaurant/food suggestions on an interactive map.
- Displays a cook-at-home grocery list as an alternative to eating out.
- Exposes MCP tools for daily nutrition, logging meals, setting targets, food suggestions, and grocery lists.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The MCP endpoint is `http://localhost:3000/mcp`.

## MCP tools

- `get_daily_nutrition`
- `log_meal`
- `set_daily_targets`
- `replace_food_suggestions`
- `replace_grocery_list`

## Connect it to ChatGPT

Deploy the app to an HTTPS host that supports a long-running Node process (Render, Railway, Fly.io, etc.). Then enable developer mode in ChatGPT and add the deployed `/mcp` URL as a custom app/connector. Once connected, ChatGPT can invoke the tools above to update the same dashboard you view in the browser.

OpenAI's Apps SDK / MCP documentation is the source of truth for the current connection flow: https://developers.openai.com/apps-sdk/

## Persistence

The MVP uses a local `data.json` file. This is ideal for local development and a single persistent server, but production should move storage to Postgres/Supabase before deploying to an ephemeral/serverless platform.

## Suggested next production step

Replace the local JSON store with Supabase/Postgres and add per-user authentication. The MCP tool contracts and browser API can remain essentially unchanged.
