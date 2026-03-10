import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Loader2, MapPin, Plus, Sparkles } from "lucide-react";

interface Suggestion {
  name: string;
  latitude: number;
  longitude: number;
  recommended_capacity: number;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface Props {
  onNodeCreated?: () => void;
}

export default function AISuggestionsPanel({ onNodeCreated }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingIdx, setCreatingIdx] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      const [nodesRes, appsRes] = await Promise.all([
        supabase.from("fiber_nodes").select("*"),
        supabase.from("applications").select("district, latitude, longitude, location").not("latitude", "is", null),
      ]);

      const { data, error } = await supabase.functions.invoke("suggest-ap", {
        body: { nodes: nodesRes.data || [], applications: appsRes.data || [] },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuggestions(data.suggestions || []);
      toast.success("AI analysis complete!");
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI suggestions");
    } finally {
      setLoading(false);
    }
  };

  const createAP = async (suggestion: Suggestion, idx: number) => {
    setCreatingIdx(idx);
    try {
      const { error } = await supabase.from("fiber_nodes").insert({
        name: suggestion.name,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        capacity: suggestion.recommended_capacity,
        status: "Planned",
      });
      if (error) throw error;
      toast.success(`AP "${suggestion.name}" created!`);
      setSuggestions((prev) => prev.filter((_, i) => i !== idx));
      onNodeCreated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create AP");
    } finally {
      setCreatingIdx(null);
    }
  };

  const priorityColors = {
    high: "bg-destructive/10 text-destructive border-destructive/30",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    low: "bg-green-500/10 text-green-600 border-green-500/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Network Planner
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Analyzes demand patterns and existing coverage to suggest optimal AP placements.
          </p>
        </div>
        <Button onClick={fetchSuggestions} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Analyzing..." : "Get AI Suggestions"}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="grid gap-4">
          {suggestions.map((s, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-5 shadow-telecom">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-foreground">{s.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColors[s.priority]}`}>
                      {s.priority} priority
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{s.reason}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>📍 {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                    <span>📡 Capacity: {s.recommended_capacity}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 shrink-0"
                  disabled={creatingIdx === idx}
                  onClick={() => createAP(s, idx)}
                >
                  {creatingIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Create AP
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click "Get AI Suggestions" to analyze your network and demand data.</p>
        </div>
      )}
    </div>
  );
}
