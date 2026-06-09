import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Radio, Cable, School, ChevronRight, ChevronLeft, MapPin, AlertCircle, Check, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import planWifi from "@/assets/plan-wifi.jpg";
import planLte from "@/assets/plan-lte.jpg";
import planFibre from "@/assets/plan-fibre.jpg";
import planSchool from "@/assets/plan-school.jpg";

const CATEGORY_IMAGES: Record<string, string> = {
  fmc: planWifi,
  lte: planLte,
  fibre: planFibre,
  fwa: planSchool,
};

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

// Fixed category metadata. Plans are loaded dynamically from the
// `service_plans` table in the database (admin-managed).
const CATEGORY_META: Record<ServiceCategoryId, { label: string; icon: React.ElementType; description: string; requiresFibreCheck?: boolean }> = {
  fmc:   { label: "Wi-Fi PLUS",     icon: Wifi,   description: "Bundled Fibre or Fixed LTE — Econet picks the best for your address" },
  lte:   { label: "Fixed LTE",      icon: Radio,  description: "Unlimited LTE for home & office" },
  fibre: { label: "Fibre (GPON)",   icon: Cable,  description: "Ultra-fast fibre – requires coverage area", requiresFibreCheck: true },
  fwa:   { label: "Limited Wi-Fi",  icon: School, description: "Affordable data for schools & students" },
};

const CATEGORY_ORDER: ServiceCategoryId[] = ["fmc", "lte", "fibre", "fwa"];

// ── Fibre eligibility check ────────────────────────────────

const DEFAULT_RADIUS_KM = 4;

async function checkFibreEligibility(lat: number, lng: number): Promise<{ eligible: boolean; nodeName?: string; suggestedCategories?: string[] }> {
  const { data: nodes } = await supabase.from("fiber_nodes").select("*");
  if (!nodes || nodes.length === 0) return { eligible: false, suggestedCategories: ["fmc", "lte"] };

  for (const node of nodes) {
    if (node.status !== "Active") continue;
    if (node.connected_customers >= node.capacity) continue;
    const nodeRadius = (node as any).radius_km ?? DEFAULT_RADIUS_KM;
    const dist = haversine(lat, lng, node.latitude, node.longitude);
    if (dist <= nodeRadius) {
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
  initialCategory?: ServiceCategoryId;
}

export default function ServicePlanSelector({ value, onChange, onCategoryChange, latitude, longitude, accountType, initialCategory }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null);
  const [appliedInitial, setAppliedInitial] = useState(false);
  const [fibreEligible, setFibreEligible] = useState<boolean | null>(null);
  const [fibreNode, setFibreNode] = useState<string | null>(null);
  const [checkingFibre, setCheckingFibre] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [planCategories, setPlanCategories] = useState<PlanCategory[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Load plans from DB and group by category
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("service_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      if (error || !data) { setLoadingPlans(false); return; }

      const acct = (accountType || "individual").toLowerCase();
      const visibleData = data.filter((p: any) => {
        const vt: string[] = Array.isArray(p.visible_to) && p.visible_to.length > 0
          ? p.visible_to
          : ["individual","business","school"];
        return vt.includes(acct);
      });

      const grouped: PlanCategory[] = CATEGORY_ORDER.map((catId) => {
        const meta = CATEGORY_META[catId];
        const plans: ServicePlan[] = visibleData
          .filter((p: any) => p.category_id === catId)
          .map((p: any) => ({
            id: p.id,
            category: meta.label,
            name: p.name,
            price: p.price,
            speed: p.speed || undefined,
            details: Array.isArray(p.details) ? p.details : [],
          }));
        return { id: catId, label: meta.label, icon: meta.icon, description: meta.description, plans, requiresFibreCheck: meta.requiresFibreCheck };
      }).filter((c) => c.plans.length > 0);

      setPlanCategories(grouped);
      setLoadingPlans(false);
    })();
    return () => { mounted = false; };
  }, [accountType]);

  // visibility is now driven by per-plan visible_to flag (see fetch above)
  const visibleCategories = planCategories;

  // Once plans are loaded and the requested initial category exists, lock it in.
  useEffect(() => {
    if (appliedInitial || !initialCategory || planCategories.length === 0) return;
    if (planCategories.some((c) => c.id === initialCategory)) {
      setSelectedCategory(initialCategory);
      onCategoryChange?.(initialCategory);
      setAppliedInitial(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory, planCategories, appliedInitial]);

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

  const selectedPlan = planCategories.flatMap((c) => c.plans).find((p) => p.id === value);

  const handleSuggestionClick = (catId: string) => {
    setSelectedCategory(catId);
  };

  return (
    <div className="space-y-3">
      {loadingPlans && (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading plans…
        </div>
      )}
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
              const bg = CATEGORY_IMAGES[cat.id];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setSelectedCategory(cat.id); onCategoryChange?.(cat.id as ServiceCategoryId); }}
                  className={`group relative overflow-hidden flex flex-col items-center justify-end gap-1.5 rounded-2xl border-2 p-4 min-h-[170px] transition-all text-left shadow-md hover:shadow-2xl hover:-translate-y-1 ${
                    isActive ? "border-primary ring-2 ring-primary/40" : "border-border/40 hover:border-primary/60"
                  }`}
                >
                  {/* Background image */}
                  <img
                    src={bg}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/70 to-primary/20" />
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Floating icon badge */}
                  <div className="absolute top-3 right-3 z-10 rounded-full bg-white/15 backdrop-blur-md border border-white/25 p-2 shadow-lg group-hover:bg-white/25 transition-colors">
                    <Icon className="w-4 h-4 text-white" />
                  </div>

                  {/* Text content */}
                  <div className="relative z-10 w-full">
                    <span className="block font-bold text-base text-white drop-shadow-md">{cat.label}</span>
                    <span className="block text-[11px] text-white/85 leading-snug mt-0.5 drop-shadow">{cat.description}</span>
                  </div>

                  {isActive && (
                    <Badge variant="secondary" className="absolute top-3 left-3 z-10 text-[10px] px-1.5 py-0.5 shadow">
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
              onClick={() => { setSelectedCategory(null); onCategoryChange?.(""); }}
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

export { CATEGORY_META, CATEGORY_ORDER };
