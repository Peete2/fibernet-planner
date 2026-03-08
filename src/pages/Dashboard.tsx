import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle, Wrench, CalendarDays, FileText, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, string> = {
  Submitted: "hsl(var(--status-submitted))",
  "Site Survey": "hsl(var(--status-survey))",
  Approved: "hsl(var(--status-approved))",
  "Installation Scheduled": "hsl(var(--status-scheduled))",
  Completed: "hsl(var(--status-completed))",
};

const allStatuses = ["Submitted", "Site Survey", "Approved", "Installation Scheduled", "Completed"];

interface Application {
  id: string;
  ref_code: string;
  service: string;
  district: string;
  location: string | null;
  status: string;
  technician: string | null;
  scheduled_date: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, ref_code, service, district, location, status, technician, scheduled_date, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setApps(data);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading your applications...</div>
      </div>
    );
  }

  const completed = apps.filter((a) => a.status === "Completed").length;
  const pending = apps.filter((a) => a.status !== "Completed").length;

  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">My Applications</h1>
          <p className="text-muted-foreground mb-6">Track all your service applications in one place.</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-4 shadow-telecom">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-secondary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{apps.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-telecom">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Pending</span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{pending}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-telecom">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-secondary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Completed</span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{completed}</p>
            </div>
          </div>

          {apps.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center shadow-telecom">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">No applications yet</h3>
              <p className="text-muted-foreground mb-4">Submit your first service application to get started.</p>
              <Link to="/apply">
                <Button>Apply Now</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {apps.map((app) => {
                const currentStep = allStatuses.indexOf(app.status);
                return (
                  <div key={app.id} className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono text-sm text-muted-foreground">{app.ref_code}</p>
                        <p className="font-display font-semibold text-foreground">{app.service}</p>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: statusColors[app.status] || "#888", color: "white" }}
                      >
                        {app.status}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex gap-1 mb-3">
                      {allStatuses.map((s, i) => (
                        <div
                          key={s}
                          className="h-1.5 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: i <= currentStep ? (statusColors[s] || "hsl(var(--secondary))") : "hsl(var(--muted))",
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{app.district}{app.location ? ` — ${app.location}` : ""}</span>
                      {app.technician && <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />{app.technician}</span>}
                      {app.scheduled_date && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{app.scheduled_date}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
