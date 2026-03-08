import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockFiberNodes, fiberRoutes, heatmapData, LESOTHO_CENTER } from "@/lib/mock-data";

// Fix default marker icon
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
  height?: string;
  center?: [number, number];
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function LeafletMap({
  showHeatmap = false,
  showRoutes = true,
  showNodes = true,
  height = "500px",
  center = LESOTHO_CENTER,
  zoom = 8,
  onMapClick,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstance.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    if (showNodes) {
      mockFiberNodes.forEach((node) => {
        const color = node.status === "Active" ? "#14b8a6" : node.status === "Planned" ? "#f59e0b" : "#ef4444";
        L.circleMarker([node.latitude, node.longitude], {
          radius: Math.min(node.capacity / 500, 12) + 4,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.5,
        })
          .bindPopup(
            `<div style="font-family:Inter,sans-serif"><strong>${node.name}</strong><br/>Capacity: ${node.capacity}<br/>Status: <span style="color:${color}">${node.status}</span></div>`
          )
          .addTo(map);
      });
    }

    if (showRoutes) {
      fiberRoutes.forEach((route) => {
        L.polyline(route.coords as [number, number][], {
          color: "#14b8a6",
          weight: 3,
          opacity: 0.7,
          dashArray: "8 6",
        })
          .bindPopup(`<strong>${route.name}</strong>`)
          .addTo(map);
      });
    }

    if (showHeatmap && typeof (L as any).heatLayer === "function") {
      (L as any).heatLayer(heatmapData, {
        radius: 30,
        blur: 20,
        maxZoom: 12,
        gradient: { 0.2: "#22d3ee", 0.5: "#facc15", 0.8: "#f97316", 1: "#ef4444" },
      }).addTo(map);
    }

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%" }}
      className="rounded-lg overflow-hidden border border-border shadow-telecom"
    />
  );
}
