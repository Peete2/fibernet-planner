import { supabase } from "@/integrations/supabase/client";

export const FIBER_ALTERNATIVE_CATEGORIES = ["fmc", "lte", "fwa"] as const;

export type SuggestedServiceCategory = (typeof FIBER_ALTERNATIVE_CATEGORIES)[number];

interface FiberNodeEligibility {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  connected_customers: number;
  capacity: number;
  status: string;
}

export interface FiberAvailabilityResult {
  available: boolean;
  nearestNodeName: string | null;
  nearestDistanceKm: number | null;
  suggestions: SuggestedServiceCategory[];
}

export function isFiberServiceLabel(service?: string | null) {
  const value = (service || "").toLowerCase();
  return value.includes("fibre") || value.includes("fiber") || value.includes("gpon");
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function checkFiberAvailability(latitude: number, longitude: number): Promise<FiberAvailabilityResult> {
  const { data, error } = await supabase
    .from("fiber_nodes")
    .select("id, name, latitude, longitude, radius_km, connected_customers, capacity, status")
    .eq("status", "Active");

  if (error) throw error;

  const nodes = (data || []) as FiberNodeEligibility[];
  if (nodes.length === 0) {
    return {
      available: false,
      nearestNodeName: null,
      nearestDistanceKm: null,
      suggestions: [...FIBER_ALTERNATIVE_CATEGORIES],
    };
  }

  let nearestNodeName: string | null = null;
  let nearestDistanceKm: number | null = null;

  for (const node of nodes) {
    const distance = haversineDistanceKm(latitude, longitude, node.latitude, node.longitude);

    if (nearestDistanceKm === null || distance < nearestDistanceKm) {
      nearestDistanceKm = distance;
      nearestNodeName = node.name;
    }

    const hasCapacity = node.connected_customers < node.capacity;
    if (distance <= node.radius_km && hasCapacity) {
      return {
        available: true,
        nearestNodeName: node.name,
        nearestDistanceKm: distance,
        suggestions: [],
      };
    }
  }

  return {
    available: false,
    nearestNodeName,
    nearestDistanceKm,
    suggestions: [...FIBER_ALTERNATIVE_CATEGORIES],
  };
}