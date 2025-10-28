[![smithery badge](https://smithery.ai/badge/@sjhangiani12/citibike_mcp)](https://smithery.ai/server/@sjhangiani12/citibike_mcp)

**Overview**
- Purpose: Smithery-compatible TypeScript MCP server exposing a tool to find the nearest Citi Bike stations by distance and ebike/classic availability.
- Data: Citi Bike GBFS feeds: `station_status.json` and `station_information.json`.

**Quickstart (Smithery)**
- Prereq: Node.js 18+ and a Smithery account/API key.
- Dev (requires Smithery CLI): `npm run dev` (port-forwards to Smithery Playground)
- Deploy: Push to GitHub, then use https://smithery.ai/new to deploy the repo.

### Installing via Smithery

To install Citi Bike Nearby automatically via [Smithery](https://smithery.ai/server/@sjhangiani12/citibike_mcp):

```bash
npx -y @smithery/cli install @sjhangiani12/citibike_mcp
```

**Local Build**
- Install deps: `npm install`
- Build: `npm run build`

**Entry Point**
- Smithery loads `src/index.ts` which exports a default `createServer` function returning an MCP server instance.

**Tool**
- `nearest_citibikes`: Returns nearest stations with distances and availability.
  - Input: `{ lat: number, lon: number, limit?: number }`
  - Output: JSON with `stations[]` including:
    - `name`, `station_id`, `lat`, `lon`, `distance_m`
    - `available_ebikes`, `available_classic_bikes`, `available_total_bikes`
    - `available_docks`, `capacity_total_docks`, `is_renting`, `is_returning`, `last_reported`

**Notes**
- `available_classic_bikes` uses `num_bikes_available_types.mechanical` when present; else derives as `num_bikes_available - num_ebikes_available`.
- Results are Haversine-sorted by distance. `limit` defaults to 5 (1–50 allowed).
