import { useState, useRef, useEffect, useCallback } from "react";
import LeafletMap from "@/components/LeafletMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Search, MapPin, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export default function Coverage() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [key, setKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Lesotho")}&limit=5`
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 400);
  };

  const selectSuggestion = (result: NominatimResult) => {
    const label = result.display_name.split(",")[0];
    setSearchQuery(label);
    setShowSuggestions(false);
    setSuggestions([]);
    setFlyTo({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), label });
  };

  const toggleHeatmap = () => {
    setShowHeatmap((v) => !v);
    setKey((k) => k + 1);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Lesotho")}&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        setFlyTo({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name.split(",")[0] });
      } else {
        toast.error("Location not found. Try a different search term.");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Coverage & Network Map
          </h1>
          <p className="text-muted-foreground mb-6">
            Explore fiber nodes, routes, and demand heatmap across Lesotho.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex gap-2 flex-1 max-w-md" ref={containerRef}>
              <div className="relative flex-1">
                <Input
                  placeholder="Search location in Lesotho..."
                  value={searchQuery}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowSuggestions(false);
                      handleSearch();
                    }
                  }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-popover shadow-md overflow-hidden">
                    {loadingSuggestions && (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Searching...
                      </div>
                    )}
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left text-popover-foreground hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => selectSuggestion(s)}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{s.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button size="sm" onClick={handleSearch} disabled={searching}>
                <Search className="h-4 w-4 mr-1" />
                {searching ? "..." : "Search"}
              </Button>
            </div>
            <Button variant={showHeatmap ? "default" : "outline"} size="sm" onClick={toggleHeatmap}>
              {showHeatmap ? "Hide Heatmap" : "Show Demand Heatmap"}
            </Button>
          </div>

          <LeafletMap
            key={key}
            showHeatmap={showHeatmap}
            showRoutes={true}
            showNodes={true}
            showLocateMe={true}
            height="600px"
            flyTo={flyTo}
          />

          <div className="mt-6 grid sm:grid-cols-4 gap-4">
            {[
              { color: "bg-[hsl(170,60%,45%)]", label: "Active AP (Available)" },
              { color: "bg-[hsl(45,95%,55%)]", label: "Active AP (Full)" },
              { color: "bg-[hsl(240,60%,55%)]", label: "Planned AP" },
              { color: "bg-destructive", label: "Maintenance" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}