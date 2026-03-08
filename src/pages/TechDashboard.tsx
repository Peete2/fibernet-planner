import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wrench, MapPin, CalendarDays, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<string, string> = {
  Submitted: "hsl(var(--status-submitted))",
  "Site Survey": "hsl(var(--status-survey))",
  Approved: "hsl(var(--status-approved))",
  "Installation Scheduled": "hsl(var(--status-scheduled))",
  Completed: "hsl(var(--status-completed))",
};

const techStatuses = ["Site Survey", "Approved", "Installation Scheduled", "Completed"];

interface Job {
  id: string;
  ref_code: string;
  customer_name: string;
  service: string;
  district: string;
  location: string | null;
  status: string;
  scheduled_date: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export default function TechDashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchJobs = async () => {
    if (!profile?.full_name) return;
    const { data } = await supabase
      .from("applications")
      .select("id, ref_code, customer_name, service, district, location, status, scheduled_date, latitude, longitude, created_at")
      .eq("technician", profile.full_name)
      .order("scheduled_date", { ascending: true, nullsFirst: false });
    if (data) setJobs(data);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [profile]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Status updated to ${status}`); fetchJobs(); }
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading assigned jobs...</div>
      </div>
    );
  }

  const active = jobs.filter((j) => j.status !== "Completed");
  const completed = jobs.filter((j) => j.status === "Completed");

  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Wrench className="w-7 h-7 text-secondary" />
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Technician Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {profile?.full_name}. Here are your assigned jobs.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-4 shadow-telecom">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Jobs</p>
              <p className="text-2xl font-display font-bold text-foreground">{active.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-telecom">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
              <p className="text-2xl font-display font-bold text-foreground">{completed.length}</p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center shadow-telecom">
              <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">No jobs assigned</h3>
              <p className="text-muted-foreground">You don't have any assigned applications yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {active.length > 0 && (
                <h2 className="text-lg font-display font-semibold text-foreground">Active Jobs</h2>
              )}
              {active.map((job) => (
                <JobCard key={job.id} job={job} onStatusChange={updateStatus} updating={updating} />
              ))}

              {completed.length > 0 && (
                <>
                  <h2 className="text-lg font-display font-semibold text-foreground mt-8">Completed</h2>
                  {completed.map((job) => (
                    <JobCard key={job.id} job={job} onStatusChange={updateStatus} updating={updating} />
                  ))}
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function JobCard({ job, onStatusChange, updating }: { job: Job; onStatusChange: (id: string, status: string) => void; updating: string | null }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{job.ref_code}</p>
          <p className="font-display font-semibold text-foreground">{job.customer_name}</p>
          <p className="text-sm text-muted-foreground">{job.service}</p>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: statusColors[job.status] || "#888", color: "white" }}
        >
          {job.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.district}{job.location ? ` — ${job.location}` : ""}</span>
        {job.scheduled_date && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{job.scheduled_date}</span>}
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(job.created_at).toLocaleDateString()}</span>
      </div>

      {job.status !== "Completed" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Update status:</span>
          <Select onValueChange={(v) => onStatusChange(job.id, v)} disabled={updating === job.id}>
            <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="Select new status" /></SelectTrigger>
            <SelectContent>
              {techStatuses.filter((s) => s !== job.status).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
