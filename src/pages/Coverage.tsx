import { useState, useRef } from "react";
import LeafletMap from "@/components/LeafletMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Footer from "@/components/Footer";
import { toast } from "sonner";

export default function Coverage() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [key, setKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; label: string } | null>(null);

  const toggleHeatmap = () => {
    setShowHeatmap((v) => !v);
    setKey((k) => k + 1);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
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

          <div className="flex gap-3 mb-4">
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
          />

          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {[
              { color: "bg-primary", label: "Active Node" },
              { color: "bg-accent", label: "Planned Node" },
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
