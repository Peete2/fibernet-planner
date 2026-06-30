import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { LESOTHO_CENTER } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LeafletMapProps {
  showHeatmap?: boolean;
  showRoutes?: boolean;
  showNodes?: boolean;
  showLocateMe?: boolean;
  height?: string;
  center?: [number, number];
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  flyTo?: { lat: number; lng: number; label: string } | null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LeafletMap({
  showHeatmap = false,
  showRoutes = true,
  showNodes = true,
  showLocateMe = false,
  height = "500px",
  center = LESOTHO_CENTER,
  zoom = 8,
  onMapClick,
  flyTo,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null);
  const nodesLayerRef = useRef<L.LayerGroup | null>(null);

  // Tile layers
  const darkTileRef = useRef<L.TileLayer | null>(null);
  const satelliteTileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstance.current = map;

    // Dark street tiles
    const darkTile = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    });
    darkTileRef.current = darkTile;

    // ESRI Satellite tiles
    const satelliteTile = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      }
    );
    satelliteTileRef.current = satelliteTile;

    // Google Hybrid (satellite + labels/roads) — default
    const googleHybrid = L.tileLayer(
      "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      {
        subdomains: ["0", "1", "2", "3"],
        attribution: "&copy; Google",
        maxZoom: 20,
      }
    ).addTo(map);

    // Layer control
    const baseMaps: Record<string, L.TileLayer> = {
      "🌐 Google Hybrid": googleHybrid,
      "🗺️ Street": darkTile,
      "🛰️ Satellite": satelliteTile,
    };
    L.control.layers(baseMaps, {}, { position: "topright" }).addTo(map);

    // Nodes layer group
    const nodesLayer = L.layerGroup().addTo(map);
    nodesLayerRef.current = nodesLayer;

    const loadData = async () => {
      if (showNodes) {
        const { data: nodes } = await supabase.from("fiber_nodes").select("*");
        nodes?.forEach((node) => {
          const isFull = node.connected_customers >= node.capacity;
          const available = Math.max(0, node.capacity - node.connected_customers);
          const color = node.status === "Active"
            ? isFull ? "#f59e0b" : "#14b8a6"
            : node.status === "Planned"
            ? "#6366f1"
            : "#ef4444";

          const userLoc = userLocationRef.current;
          const distHtml = userLoc
            ? `<br/>📏 ${haversineDistance(userLoc[0], userLoc[1], node.latitude, node.longitude).toFixed(1)} km from you`
            : "";

          const statusLabel = isFull ? "🔴 FULL" : `🟢 ${available} slots available`;

          L.circleMarker([node.latitude, node.longitude], {
            radius: Math.min(node.capacity / 500, 12) + 4,
            fillColor: color,
            color: color,
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.6,
          })
            .bindPopup(
              `<div style="font-family:Inter,sans-serif;min-width:180px">
                <strong style="font-size:14px">📡 AP: ${node.name}</strong>
                <hr style="border-color:#334155;margin:6px 0"/>
                <div style="font-size:12px;line-height:1.8">
                  Status: <span style="color:${color};font-weight:600">${node.status}</span><br/>
                  Capacity: <strong>${node.connected_customers}</strong> / ${node.capacity}<br/>
                  ${statusLabel}
                  ${distHtml}
                </div>
              </div>`
            )
            .addTo(nodesLayer);
        });

        // Render customers connected to APs as small dots
        const { data: conns } = await supabase
          .from("customer_connections")
          .select("id, customer_name, latitude, longitude, source");
        const cluster = (L as any).markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 40,
          iconCreateFunction: (c: any) => {
            const count = c.getChildCount();
            return L.divIcon({
              html: `<div style="background:#10b981;color:#fff;border:2px solid #064e3b;border-radius:9999px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.3)">${count}</div>`,
              className: "",
              iconSize: [32, 32],
            });
          },
        });
        conns?.forEach((c) => {
          const color = c.source === "auto" ? "#10b981" : "#a78bfa";
          const m = L.circleMarker([c.latitude, c.longitude], {
            radius: 4,
            fillColor: color,
            color: "#0f172a",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.95,
          })
            .bindPopup(
              `<div style="font-family:Inter,sans-serif;min-width:160px">
                <strong>👤 ${c.customer_name}</strong>
                <hr style="border-color:#334155;margin:4px 0"/>
                <div style="font-size:11px">Connected customer<br/>Source: ${c.source}</div>
              </div>`
            );
          cluster.addLayer(m);
        });
        nodesLayer.addLayer(cluster);
      }

      if (showRoutes) {
        const { data: routes } = await supabase.from("fiber_routes").select("*");
        routes?.forEach((route) => {
          const coords = route.coordinates as [number, number][];
          L.polyline(coords, {
            color: "#14b8a6",
            weight: 3,
            opacity: 0.7,
            dashArray: "8 6",
          })
            .bindPopup(`<strong>${route.route_name}</strong>`)
            .addTo(map);
        });
      }

      if (showHeatmap) {
        const { data: apps } = await supabase
          .from("applications")
          .select("latitude, longitude")
          .not("latitude", "is", null)
          .not("longitude", "is", null);

        if (apps && apps.length > 0 && typeof (L as any).heatLayer === "function") {
          const heatData = apps.map((a) => [a.latitude!, a.longitude!, 0.8] as [number, number, number]);
          (L as any).heatLayer(heatData, {
            radius: 30,
            blur: 20,
            maxZoom: 12,
            gradient: { 0.2: "#22d3ee", 0.5: "#facc15", 0.8: "#f97316", 1: "#ef4444" },
          }).addTo(map);
        }
      }
    };

    loadData();

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    } else {
      // Customer-facing: clicking the map performs an instant coverage check
      map.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const { data: nodes } = await supabase.from("fiber_nodes").select("*");
        let nearest: any = null;
        let nearestDist = Infinity;
        (nodes || []).forEach((n) => {
          const d = haversineDistance(lat, lng, n.latitude, n.longitude);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = n;
          }
        });
        let html: string;
        if (!nearest) {
          html = `<div style="font-family:Inter,sans-serif;min-width:220px">
            <strong>📍 Coverage check</strong>
            <hr style="border-color:#334155;margin:6px 0"/>
            <div style="font-size:12px">No access points configured yet — please contact ETL.</div>
          </div>`;
        } else {
          const within = nearestDist <= (nearest.radius_km || 0);
          const isFull = nearest.connected_customers >= nearest.capacity;
          const eligible = within && nearest.status === "Active" && !isFull;
          const verdict = eligible
            ? `<span style="color:#10b981;font-weight:600">✅ Fiber available at this location</span>`
            : within && isFull
              ? `<span style="color:#f59e0b;font-weight:600">⚠️ Nearest AP is full — join waitlist</span>`
              : within && nearest.status !== "Active"
                ? `<span style="color:#6366f1;font-weight:600">🛠️ Coverage planned, not active yet</span>`
                : `<span style="color:#ef4444;font-weight:600">❌ Outside coverage radius</span>`;
          const applyHref = `/apply?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}${eligible ? "&service=fibre" : ""}`;
          const cta = eligible
            ? `<a href="${applyHref}" style="background:#10b981;color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Apply for fibre (auto-fill coords)</a>`
            : `<div style="font-size:11px;color:#64748b;margin-bottom:6px">Fibre isn't available here. Try our other services:</div>
               <a href="/apply?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}" style="background:hsl(220 70% 18%);color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none;display:inline-block">Browse alternatives</a>`;
          html = `<div style="font-family:Inter,sans-serif;min-width:240px">
            <strong style="font-size:14px">📍 Coverage check</strong>
            <hr style="border-color:#334155;margin:6px 0"/>
            <div style="font-size:12px;line-height:1.7">
              ${verdict}<br/>
              Nearest AP: <strong>${nearest.name}</strong><br/>
              Distance: <strong>${nearestDist.toFixed(2)} km</strong> (radius ${nearest.radius_km} km)<br/>
              Capacity: ${nearest.connected_customers}/${nearest.capacity}
              <div style="margin-top:8px">${cta}</div>
            </div>
          </div>`;
        }
        L.popup({ maxWidth: 300 })
          .setLatLng([lat, lng])
          .setContent(html)
          .openOn(map);
      });
    }

    // Locate Me control
    if (showLocateMe) {
      const LocateControl = L.Control.extend({
        onAdd: () => {
          const btn = L.DomUtil.create("button", "leaflet-bar leaflet-control");
          btn.innerHTML = "📍 Locate Me";
          btn.style.cssText =
            "background:#1e293b;color:#14b8a6;border:1px solid #334155;padding:6px 12px;cursor:pointer;font-size:13px;font-weight:600;border-radius:6px;white-space:nowrap;";
          btn.title = "Find my location";
          L.DomEvent.disableClickPropagation(btn);
          btn.onclick = () => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const { latitude, longitude } = pos.coords;
                userLocationRef.current = [latitude, longitude];
                map.setView([latitude, longitude], 14);

                const userIcon = L.divIcon({
                  html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6)"></div>',
                  className: "",
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                });

                L.marker([latitude, longitude], { icon: userIcon })
                  .addTo(map)
                  .bindPopup("<strong>📍 You are here</strong>")
                  .openPopup();

                // Refresh nodes with distance info
                if (showNodes && nodesLayerRef.current) {
                  nodesLayerRef.current.clearLayers();
                  const { data: nodes } = await supabase.from("fiber_nodes").select("*");
                  nodes?.forEach((node) => {
                    const isFull = node.connected_customers >= node.capacity;
                    const available = Math.max(0, node.capacity - node.connected_customers);
                    const color = node.status === "Active"
                      ? isFull ? "#f59e0b" : "#14b8a6"
                      : node.status === "Planned"
                      ? "#6366f1"
                      : "#ef4444";

                    const dist = haversineDistance(latitude, longitude, node.latitude, node.longitude);
                    const statusLabel = isFull ? "🔴 FULL" : `🟢 ${available} slots available`;

                    L.circleMarker([node.latitude, node.longitude], {
                      radius: Math.min(node.capacity / 500, 12) + 4,
                      fillColor: color,
                      color: color,
                      weight: 2,
                      opacity: 0.9,
                      fillOpacity: 0.6,
                    })
                      .bindPopup(
                        `<div style="font-family:Inter,sans-serif;min-width:180px">
                          <strong style="font-size:14px">📡 AP: ${node.name}</strong>
                          <hr style="border-color:#334155;margin:6px 0"/>
                          <div style="font-size:12px;line-height:1.8">
                            Status: <span style="color:${color};font-weight:600">${node.status}</span><br/>
                            Capacity: <strong>${node.connected_customers}</strong> / ${node.capacity}<br/>
                            ${statusLabel}<br/>
                            📏 <strong>${dist.toFixed(1)} km</strong> from you
                          </div>
                        </div>`
                      )
                      .addTo(nodesLayerRef.current!);

                    // Draw distance line
                    L.polyline([[latitude, longitude], [node.latitude, node.longitude]], {
                      color: "#3b82f6",
                      weight: 1,
                      opacity: 0.3,
                      dashArray: "4 4",
                    }).addTo(nodesLayerRef.current!);
                  });
                }
              },
              () => alert("Could not detect your location")
            );
          };
          return btn;
        },
      });
      new LocateControl({ position: "topright" }).addTo(map);
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Handle flyTo changes
  useEffect(() => {
    if (!flyTo || !mapInstance.current) return;
    const map = mapInstance.current;
    map.flyTo([flyTo.lat, flyTo.lng], 14);
    L.marker([flyTo.lat, flyTo.lng])
      .addTo(map)
      .bindPopup(`<strong>${flyTo.label}</strong>`)
      .openPopup();
  }, [flyTo]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%" }}
      className="rounded-lg overflow-hidden border border-border shadow-telecom"
    />
  );
}
