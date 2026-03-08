import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, Clock, Truck, ClipboardCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockApplications, type Application } from "@/lib/mock-data";

const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
  Submitted: { icon: FileText, color: "bg-status-submitted" },
  "Site Survey": { icon: Search, color: "bg-status-survey" },
  Approved: { icon: ClipboardCheck, color: "bg-status-approved" },
  "Installation Scheduled": { icon: Truck, color: "bg-status-scheduled" },
  Completed: { icon: CheckCircle, color: "bg-status-completed" },
};

const allStatuses = ["Submitted", "Site Survey", "Approved", "Installation Scheduled", "Completed"];

export default function Track() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Application | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = mockApplications.find(
      (a) => a.id.toLowerCase() === query.trim().toLowerCase()
    );
    setResult(found || null);
    setNotFound(!found);
  };

  const currentIndex = result ? allStatuses.indexOf(result.status) : -1;

  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Track Your Application
          </h1>
          <p className="text-muted-foreground mb-8">Enter your application ID to check the status.</p>

          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. ETL-2026-001"
              className="flex-1"
            />
            <Button type="submit" variant="default">
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </form>

          {notFound && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              No application found. Try: ETL-2026-001 through ETL-2026-008
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-6 shadow-telecom"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Application ID</p>
                  <p className="text-xl font-display font-bold text-foreground">{result.id}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold text-primary-foreground ${statusConfig[result.status]?.color}`}>
                  {result.status}
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-1 mb-8">
                {allStatuses.map((s, i) => {
                  const active = i <= currentIndex;
                  const cfg = statusConfig[s];
                  const Icon = cfg.icon;
                  return (
                    <div key={s} className="flex-1 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? cfg.color : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      </div>
                      <p className={`text-[10px] mt-1 text-center ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {s}
                      </p>
                      {i < allStatuses.length - 1 && (
                        <div className={`h-0.5 w-full mt-1 ${i < currentIndex ? "bg-secondary" : "bg-muted"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <span className="text-foreground font-medium">{result.customerName}</span></div>
                <div><span className="text-muted-foreground">Service:</span> <span className="text-foreground font-medium">{result.service}</span></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="text-foreground font-medium">{result.location}, {result.district}</span></div>
                <div><span className="text-muted-foreground">Applied:</span> <span className="text-foreground font-medium">{result.dateCreated}</span></div>
                {result.technician && (
                  <div><span className="text-muted-foreground">Technician:</span> <span className="text-foreground font-medium">{result.technician}</span></div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
