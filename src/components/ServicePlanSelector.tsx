import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Radio, Cable, School, ChevronRight, ChevronLeft, MapPin, AlertCircle, Check, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// ── Plan data ──────────────────────────────────────────────

export interface ServicePlan {
  id: string;
  category: string;
  name: string;
  price: string;
  speed?: string;
  details: string[];
}

interface PlanCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  plans: ServicePlan[];
  requiresFibreCheck?: boolean;
}

export type ServiceCategoryId = "fmc" | "lte" | "fibre" | "fwa";

const PLAN_CATEGORIES: PlanCategory[] = [
  {
    id: "fmc",
    label: "Wi-Fi PLUS",
    icon: Wifi,
    description: "Home WiFi + mobile data in one subscription",
    plans: [
      {
        id: "fmc-bronze",
        category: "Wi-Fi PLUS",
        name: "Bronze",
        price: "M499/mo",
        speed: "30 Mbps ↓ / 20 Mbps ↑",
        details: ["Integrated mobile data & voice", "Home WiFi router included"],
      },
      {
        id: "fmc-silver",
        category: "Wi-Fi PLUS",
        name: "Silver",
        price: "M649/mo",
        speed: "70 Mbps ↓ / 25 Mbps ↑",
        details: ["Integrated mobile data & voice", "Home WiFi router included"],
      },
      {
        id: "fmc-gold",
        category: "Wi-Fi PLUS",
        name: "Gold",
        price: "M899/mo",
        speed: "90 Mbps ↓ / 30 Mbps ↑",
        details: ["Up to 300GB FUP", "Integrated mobile data & voice", "Home WiFi router included"],
      },
    ],
  },
  {
    id: "lte",
    label: "Fixed LTE",
    icon: Radio,
    description: "Unlimited LTE for home & office",
    plans: [
      {
        id: "lte-combo",
        category: "Fixed LTE",
        name: "Always On Combo",
        price: "M748/mo",
        speed: "Unlimited LTE",
        details: ["Unlimited LTE included", "10GB Mobile Data bonus"],
      },
      {
        id: "lte-15",
        category: "Fixed LTE",
        name: "Unlimited 15Mbps",
        price: "M649/mo",
        speed: "15 Mbps",
        details: ["100GB Fair Usage Policy", "No contract required"],
      },
      {
        id: "lte-20",
        category: "Fixed LTE",
        name: "Unlimited 20Mbps",
        price: "M899/mo",
        speed: "20 Mbps",
        details: ["200GB Fair Usage Policy"],
      },
      {
        id: "lte-40",
        category: "Fixed LTE",
        name: "Unlimited 40Mbps",
        price: "M1,599/mo",
        speed: "40 Mbps",
        details: ["300GB Fair Usage Policy", "Best for heavy usage"],
      },
    ],
  },
  {
    id: "fibre",
    label: "Fibre (GPON)",
    icon: Cable,
    description: "Ultra-fast fibre – requires coverage area",
    requiresFibreCheck: true,
    plans: [
      {
        id: "fibre-silver",
        category: "Fibre (GPON)",
        name: "Fibre Silver",
        price: "M1,599/mo",
        speed: "90 Mbps ↓ / 30 Mbps ↑",
        details: ["Dedicated fibre line", "Symmetrical speeds available"],
      },
      {
        id: "fibre-topup-75",
        category: "Fibre (GPON)",
        name: "Top-Up 75GB",
        price: "M870",
        details: ["75GB once-off data bundle"],
      },
      {
        id: "fibre-topup-100",
        category: "Fibre (GPON)",
        name: "Top-Up 100GB",
        price: "M1,080",
        details: ["100GB once-off data bundle"],
      },
      {
        id: "fibre-topup-150",
        category: "Fibre (GPON)",
        name: "Top-Up 150GB",
        price: "M1,240",
        details: ["150GB once-off data bundle"],
      },
    ],
  },
  {
    id: "fwa",
    label: "Limited Wi-Fi",
    icon: School,
    description: "Affordable data for schools & students",
    plans: [
      {
        id: "fwa-school",
        category: "Limited Wi-Fi",
        name: "Limited Wi-Fi for School",
        price: "M129/mo",
        details: ["40GB data allocation", "Ideal for institutions"],
      },
      {
        id: "fwa-10",
        category: "Limited Wi-Fi",
        name: "LTE Hybrid 10GB",
        price: "M50/mo",
        details: ["10GB monthly data", "Student / Teacher plan"],
      },
      {
        id: "fwa-25",
        category: "Limited Wi-Fi",
        name: "LTE Hybrid 25GB",
        price: "M99/mo",
        details: ["25GB monthly data", "Student / Teacher plan"],
      },
      {
        id: "fwa-40",
        category: "Limited Wi-Fi",
        name: "LTE Hybrid 40GB",
        price: "M129/mo",
        details: ["40GB monthly data", "Student / Teacher plan"],
      },
      {
        id: "fwa-80",
        category: "Limited Wi-Fi",
        name: "LTE Hybrid 80GB",
        price: "M249/mo",
        details: ["80GB monthly data", "Student / Teacher plan"],
      },
    ],
  },
];

// ── Fibre eligibility check ────────────────────────────────

const MAX_FIBRE_DISTANCE_KM = 30;

async function checkFibreEligibility(lat: number, lng: number): Promise<{ eligible: boolean; nodeName?: string; suggestedCategories?: string[] }> {
  const { data: nodes } = await supabase.from("fiber_nodes").select("*");
  if (!nodes || nodes.length === 0) return { eligible: false, suggestedCategories: ["fmc", "lte"] };

  for (const node of nodes) {
    if (node.status !== "Active") continue;
    if (node.connected_customers >= node.capacity) continue;
    const dist = haversine(lat, lng, node.latitude, node.longitude);
    if (dist <= MAX_FIBRE_DISTANCE_KM) {
      return { eligible: true, nodeName: node.name };
    }
  }
  return { eligible: false, suggestedCategories: ["fmc", "lte", "fwa"] };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Component ──────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (planId: string, planLabel: string, categoryId: ServiceCategoryId) => void;
  latitude?: string;
  longitude?: string;
  accountType?: string;
}

interface Props {
  value: string;
  onChange: (planId: string, planLabel: string, categoryId: ServiceCategoryId) => void;
  onCategoryChange?: (categoryId: ServiceCategoryId | "") => void;
  latitude?: string;
  longitude?: string;
  accountType?: string;
}

export default function ServicePlanSelector({ value, onChange, onCategoryChange, latitude, longitude, accountType }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [fibreEligible, setFibreEligible] = useState<boolean | null>(null);
  const [fibreNode, setFibreNode] = useState<string | null>(null);
  const [checkingFibre, setCheckingFibre] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);

  // Filter out Limited Wi-Fi for business accounts
  const visibleCategories = PLAN_CATEGORIES.filter((cat) => {
    if (accountType === "business" && cat.id === "fwa") return false;
    return true;
  });

  const activeCategory = visibleCategories.find((c) => c.id === selectedCategory);

  // Check fibre eligibility when selecting fibre category
  useEffect(() => {
    if (selectedCategory !== "fibre") return;
    if (!latitude || !longitude) {
      setFibreEligible(null);
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    setCheckingFibre(true);
    checkFibreEligibility(lat, lng).then((res) => {
      setFibreEligible(res.eligible);
      setFibreNode(res.nodeName || null);
      setSuggestedCategories(res.suggestedCategories || []);
      setCheckingFibre(false);
    });
  }, [selectedCategory, latitude, longitude]);

  const selectedPlan = PLAN_CATEGORIES.flatMap((c) => c.plans).find((p) => p.id === value);

  const handleSuggestionClick = (catId: string) => {
    setSelectedCategory(catId);
  };

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 gap-3"
          >
            {visibleCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedPlan?.category === cat.label;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-left ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-6 h-6 text-primary" />
                  <span className="font-semibold text-sm text-foreground">{cat.label}</span>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight">{cat.description}</span>
                  {isActive && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5">
                      Selected
                    </Badge>
                  )}
                </button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="plans"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-3"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ChevronLeft className="w-4 h-4" /> All categories
            </button>

            <h4 className="font-semibold text-foreground flex items-center gap-2">
              {activeCategory && <activeCategory.icon className="w-5 h-5 text-primary" />}
              {activeCategory?.label}
            </h4>

            {/* Fibre eligibility banner */}
            {selectedCategory === "fibre" && (
              <div className="rounded-lg border border-border p-3 text-sm">
                {checkingFibre ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking fibre coverage (30km radius)...
                  </span>
                ) : !latitude || !longitude ? (
                  <span className="flex items-center gap-2 text-amber-600">
                    <MapPin className="w-4 h-4" /> Please detect your GPS location first to check fibre availability.
                  </span>
                ) : fibreEligible === false ? (
                  <div className="space-y-3">
                    <span className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4" /> No fibre coverage within 30km of your location.
                    </span>
                    {suggestedCategories.length > 0 && (
                      <div className="rounded-md bg-muted/50 p-2.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                          <Lightbulb className="w-3.5 h-3.5 text-accent" /> We recommend these alternatives:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {suggestedCategories.map((catId) => {
                            const cat = visibleCategories.find((c) => c.id === catId);
                            if (!cat) return null;
                            return (
                              <Button
                                key={catId}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1.5"
                                onClick={() => handleSuggestionClick(catId)}
                              >
                                <cat.icon className="w-3.5 h-3.5" />
                                {cat.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : fibreEligible === true ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <Check className="w-4 h-4" /> Fibre available via <strong>{fibreNode}</strong>!
                  </span>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              {activeCategory?.plans.map((plan) => {
                const isSelected = value === plan.id;
                const disabled = selectedCategory === "fibre" && fibreEligible !== true;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(plan.id, `${plan.category} – ${plan.name} (${plan.price})`, selectedCategory as ServiceCategoryId);
                    }}
                    className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : disabled
                        ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{plan.name}</span>
                      <Badge variant={isSelected ? "default" : "outline"} className="text-xs">
                        {plan.price}
                      </Badge>
                    </div>
                    {plan.speed && (
                      <p className="text-xs text-muted-foreground mt-1">{plan.speed}</p>
                    )}
                    <ul className="mt-1.5 space-y-0.5">
                      {plan.details.map((d, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                    {isSelected && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedPlan && !selectedCategory && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{selectedPlan.category}</p>
            <p className="text-sm font-semibold text-foreground">
              {selectedPlan.name} — {selectedPlan.price}
            </p>
          </div>
          <Badge variant="default" className="text-xs">Active</Badge>
        </div>
      )}
    </div>
  );
}

export { PLAN_CATEGORIES };
