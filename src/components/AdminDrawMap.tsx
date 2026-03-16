import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { LESOTHO_CENTER } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface AdminDrawMapProps {
  onRouteCreated?: () => void;
  onNodeCreated?: () => void;
}

export default function AdminDrawMap({ onRouteCreated, onNodeCreated }: AdminDrawMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView(LESOTHO_CENTER, 8);
    mapInstance.current = map;

    const streetLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    });

    const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    });

    streetLayer.addTo(map);

    L.control.layers(
      { "Street Map": streetLayer, "Satellite": satelliteLayer },
      {},
      { position: "topright" }
    ).addTo(map);

    // Load existing routes and nodes
    const loadExisting = async () => {
      const [routesRes, nodesRes] = await Promise.all([
        supabase.from("fiber_routes").select("*"),
        supabase.from("fiber_nodes").select("*"),
      ]);

      routesRes.data?.forEach((route) => {
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

      nodesRes.data?.forEach((node) => {
        const color = node.status === "Active" ? "#14b8a6" : node.status === "Planned" ? "#f59e0b" : "#ef4444";
        L.circleMarker([node.latitude, node.longitude], {
          radius: Math.min(node.capacity / 500, 12) + 4,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.5,
        })
          .bindPopup(`<strong>${node.name}</strong><br/>Capacity: ${node.capacity}<br/>Status: ${node.status}`)
          .addTo(map);
      });
    };

    loadExisting();

    // Draw controls
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polyline: {
          shapeOptions: { color: "#14b8a6", weight: 4 },
        },
        marker: {} as L.DrawOptions.MarkerOptions,
        polygon: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, async (event: any) => {
      const layer = event.layer;
      const type = event.layerType;

      if (type === "polyline") {
        const routeName = prompt("Enter a name for this fiber route:");
        if (!routeName) return;

        const geojson = layer.toGeoJSON();
        const coordinates = geojson.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);

        const { error } = await supabase.from("fiber_routes").insert({
          route_name: routeName,
          coordinates,
        });

        if (error) {
          toast.error("Failed to save route: " + error.message);
        } else {
          toast.success(`Route "${routeName}" saved`);
          drawnItems.addLayer(layer);
          onRouteCreated?.();
        }
      }

      if (type === "marker") {
        const nodeName = prompt("Enter node name:");
        if (!nodeName) return;
        const capacityStr = prompt("Enter capacity (e.g. 1000):", "1000");
        const capacity = parseInt(capacityStr || "1000", 10);

        const latlng = layer.getLatLng();
        const { error } = await supabase.from("fiber_nodes").insert({
          name: nodeName,
          latitude: latlng.lat,
          longitude: latlng.lng,
          capacity,
          status: "Planned",
        });

        if (error) {
          toast.error("Failed to save node: " + error.message);
        } else {
          toast.success(`Node "${nodeName}" saved`);
          drawnItems.addLayer(layer);
          onNodeCreated?.();
        }
      }
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ height: "600px", width: "100%" }}
      className="rounded-lg overflow-hidden border border-border shadow-telecom"
    />
  );
}
