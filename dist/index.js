import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
const STATION_STATUS_URL = "https://gbfs.citibikenyc.com/gbfs/en/station_status.json";
const STATION_INFO_URL = "https://gbfs.citibikenyc.com/gbfs/en/station_information.json";
function toRad(deg) {
    return (deg * Math.PI) / 180;
}
function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
async function fetchJson(url) {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok)
        throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}
async function getNearestStations({ lat, lon, limit = 5 }) {
    const [statusJson, infoJson] = await Promise.all([
        fetchJson(STATION_STATUS_URL),
        fetchJson(STATION_INFO_URL),
    ]);
    const statusList = statusJson?.data?.stations ?? [];
    const infoList = infoJson?.data?.stations ?? [];
    const infoById = new Map(infoList.map((s) => [String(s.station_id), s]));
    const merged = statusList
        .map((st) => {
        const id = String(st.station_id);
        const inf = infoById.get(id);
        if (!inf)
            return null;
        const distance_m = haversineMeters(lat, lon, Number(inf.lat), Number(inf.lon));
        const types = st.num_bikes_available_types || {};
        const ebikes = typeof st.num_ebikes_available === "number"
            ? st.num_ebikes_available
            : typeof types.ebike === "number"
                ? types.ebike
                : undefined;
        const mechanical = typeof types.mechanical === "number"
            ? types.mechanical
            : typeof st.num_bikes_available === "number" && typeof ebikes === "number"
                ? Math.max(0, st.num_bikes_available - ebikes)
                : undefined;
        return {
            station_id: id,
            name: inf.name,
            lat: Number(inf.lat),
            lon: Number(inf.lon),
            distance_m: Math.round(distance_m),
            capacity_total_docks: inf.capacity ?? null,
            available_total_bikes: st.num_bikes_available ?? null,
            available_ebikes: ebikes ?? null,
            available_classic_bikes: mechanical ?? null,
            available_docks: st.num_docks_available ?? null,
            is_renting: st.is_renting ?? 1,
            is_returning: st.is_returning ?? 1,
            last_reported: st.last_reported ?? null,
        };
    })
        .filter(Boolean);
    merged.sort((a, b) => a.distance_m - b.distance_m);
    return merged.slice(0, Math.max(1, Math.min(50, Number(limit) || 5)));
}
export default function createServer({ config }) {
    const server = new McpServer({ name: "CitiBike Nearest", version: "0.1.0" });
    server.registerTool("nearest_citibikes", {
        title: "Nearest Citi Bikes",
        description: "Return nearest Citi Bike stations for a lat/lon with distance and ebike/classic availability.",
        inputSchema: {
            lat: z.number().describe("Latitude in decimal degrees"),
            lon: z.number().describe("Longitude in decimal degrees"),
            limit: z
                .number()
                .int()
                .min(1)
                .max(50)
                .optional()
                .describe("Max stations to return (1-50). Default 5"),
        },
    }, async ({ lat, lon, limit }) => {
        const results = await getNearestStations({ lat, lon, limit });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ query: { lat, lon, limit: limit ?? 5 }, stations: results }, null, 2),
                },
            ],
        };
    });
    return server.server;
}
