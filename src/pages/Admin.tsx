import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { DISTRICTS } from "@/lib/mock-data";
import { Users, FileText, CheckCircle, Wifi, Pencil, Trash2, X, Save, BarChart3, Route, Flame, CalendarDays, UserCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LeafletMap from "@/components/LeafletMap";
import AdminDrawMap from "@/components/AdminDrawMap";
import CreateApplicationDialog from "@/components/CreateApplicationDialog";

const statusColors: Record<string, string> = {
  Submitted: "hsl(45 90% 50%)",
  "Site Survey": "hsl(200 80% 50%)",
  Approved: "hsl(160 70% 45%)",
  "Installation Scheduled": "hsl(270 60% 55%)",
  Completed: "hsl(140 70% 40%)",
};

const allStatuses = ["Submitted", "Site Survey", "Approved", "Installation Scheduled", "Completed"];

interface Application {
  id: string;
  ref_code: string;
  customer_name: string;
  service: string;
  district: string;
  location: string | null;
  status: string;
  technician: string | null;
  scheduled_date: string | null;
  created_at: string;
}

interface FiberNode {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: string;
}

interface FiberRoute {
  id: string;
  route_name: string;
  created_at: string;
}

interface Technician {
  user_id: string;
  full_name: string;
}

export default function Admin() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [fiberNodes, setFiberNodes] = useState<FiberNode[]>([]);
  const [fiberRoutes, setFiberRoutes] = useState<FiberRoute[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [editingApp, setEditingApp] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ status: string; technician: string; scheduled_date: string }>({ status: "", technician: "", scheduled_date: "" });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [nodeEditForm, setNodeEditForm] = useState<{ name: string; capacity: string; status: string }>({ name: "", capacity: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [drawMapKey, setDrawMapKey] = useState(0);

  // Assignment state for the Assign tab
  const [assignTech, setAssignTech] = useState<Record<string, string>>({});
  const [assignDate, setAssignDate] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    const [appsRes, nodesRes, routesRes, techRes] = await Promise.all([
      supabase.from("applications").select("id, ref_code, customer_name, service, district, location, status, technician, scheduled_date, created_at").order("created_at", { ascending: false }),
      supabase.from("fiber_nodes").select("id, name, latitude, longitude, capacity, status"),
      supabase.from("fiber_routes").select("id, route_name, created_at").order("created_at", { ascending: false }),
      // Fetch technicians: profiles of users with technician role
      supabase.from("user_roles").select("user_id").eq("role", "technician"),
    ]);
    if (appsRes.data) setApplications(appsRes.data);
    if (nodesRes.data) setFiberNodes(nodesRes.data);
    if (routesRes.data) setFiberRoutes(routesRes.data);

    // Fetch technician profiles
    if (techRes.data && techRes.data.length > 0) {
      const techIds = techRes.data.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", techIds);
      if (profiles) setTechnicians(profiles);
    } else {
      setTechnicians([]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Application CRUD
  const startEdit = (app: Application) => {
    setEditingApp(app.id);
    setEditForm({ status: app.status, technician: app.technician || "", scheduled_date: app.scheduled_date || "" });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("applications")
      .update({
        status: editForm.status,
        technician: editForm.technician || null,
        scheduled_date: editForm.scheduled_date || null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Application updated"); setEditingApp(null); fetchData(); }
  };

  const deleteApp = async (id: string) => {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Application deleted"); fetchData(); }
  };

  // Quick assign technician from assignment tab
  const handleAssign = async (appId: string) => {
    const tech = assignTech[appId];
    const date = assignDate[appId];
    if (!tech) { toast.error("Select a technician"); return; }

    const { error } = await supabase.from("applications").update({
      technician: tech,
      scheduled_date: date || null,
      status: date ? "Installation Scheduled" : "Site Survey",
    }).eq("id", appId);

    if (error) toast.error(error.message);
    else { toast.success("Technician assigned"); fetchData(); }
  };

  // Node CRUD
  const startNodeEdit = (node: FiberNode) => {
    setEditingNode(node.id);
    setNodeEditForm({ name: node.name, capacity: String(node.capacity), status: node.status });
  };

  const saveNodeEdit = async (id: string) => {
    const { error } = await supabase.from("fiber_nodes").update({
      name: nodeEditForm.name,
      capacity: parseInt(nodeEditForm.capacity, 10),
      status: nodeEditForm.status,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Node updated"); setEditingNode(null); fetchData(); }
  };

  const deleteNode = async (id: string) => {
    const { error } = await supabase.from("fiber_nodes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Node deleted"); fetchData(); }
  };

  const deleteRoute = async (id: string) => {
    const { error } = await supabase.from("fiber_routes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Route deleted"); fetchData(); setDrawMapKey((k) => k + 1); }
  };

  // Analytics data
  const districtData = DISTRICTS.map((d) => ({
    name: d.length > 8 ? d.slice(0, 8) + "." : d,
    full: d,
    count: applications.filter((a) => a.district === d).length,
  })).filter((d) => d.count > 0);

  const statusData = Object.entries(
    applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const serviceData = Object.entries(
    applications.reduce((acc, a) => { acc[a.service] = (acc[a.service] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Monthly trend
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    applications.forEach((a) => {
      const m = new Date(a.created_at).toLocaleDateString("en", { year: "numeric", month: "short" });
      months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).map(([month, count]) => ({ month, count })).reverse();
  })();

  // Pending applications for assignment
  const pendingApps = applications.filter((a) => ["Submitted", "Site Survey"].includes(a.status));

  const stats = [
    { label: "Total Applications", value: applications.length, icon: FileText, color: "text-secondary" },
    { label: "Completed", value: applications.filter((a) => a.status === "Completed").length, icon: CheckCircle, color: "text-secondary" },
    { label: "Active Nodes", value: fiberNodes.filter((n) => n.status === "Active").length, icon: Wifi, color: "text-secondary" },
    { label: "Pending", value: pendingApps.length, icon: Users, color: "text-accent" },
  ];

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground mb-6">Network planning, application management, and coverage analytics.</p>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-4 h-4" />Overview</TabsTrigger>
              <TabsTrigger value="applications" className="gap-1.5"><FileText className="w-4 h-4" />Applications</TabsTrigger>
              <TabsTrigger value="assign" className="gap-1.5"><UserCheck className="w-4 h-4" />Assign Technicians</TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
              <TabsTrigger value="plan" className="gap-1.5"><Route className="w-4 h-4" />Plan Routes</TabsTrigger>
              <TabsTrigger value="nodes" className="gap-1.5"><Wifi className="w-4 h-4" />Manage Nodes</TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-1.5"><Flame className="w-4 h-4" />Heatmap</TabsTrigger>
            </TabsList>

            {/* ========== OVERVIEW ========== */}
            <TabsContent value="overview">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((s) => (
                  <div key={s.label} className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                    <div className="flex items-center gap-3 mb-2">
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                  <h3 className="font-display font-semibold text-foreground mb-4">Applications by District</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={districtData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(180 70% 40%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                  <h3 className="font-display font-semibold text-foreground mb-4">Status Breakdown</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={statusColors[entry.name] || "#888"} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* ========== APPLICATIONS ========== */}
            <TabsContent value="applications">
              <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h3 className="font-display font-semibold text-foreground">All Applications ({applications.length})</h3>
                  <CreateApplicationDialog onCreated={fetchData} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ref</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Service</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">District</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Technician</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Scheduled</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => (
                        <tr key={app.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{app.ref_code}</td>
                          <td className="px-4 py-3 text-foreground">{app.customer_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{app.service}</td>
                          <td className="px-4 py-3 text-muted-foreground">{app.district}</td>
                          <td className="px-4 py-3">
                            {editingApp === app.id ? (
                              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                                <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusColors[app.status] || "#888", color: "white" }}>
                                {app.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingApp === app.id ? (
                              technicians.length > 0 ? (
                                <Select value={editForm.technician} onValueChange={(v) => setEditForm({ ...editForm, technician: v })}>
                                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Select..." /></SelectTrigger>
                                  <SelectContent>
                                    {technicians.map((t) => <SelectItem key={t.user_id} value={t.full_name}>{t.full_name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input value={editForm.technician} onChange={(e) => setEditForm({ ...editForm, technician: e.target.value })} placeholder="Name" className="h-8 text-xs w-36" />
                              )
                            ) : (
                              <span className="text-muted-foreground">{app.technician || "—"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingApp === app.id ? (
                              <Input type="date" value={editForm.scheduled_date} onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })} className="h-8 text-xs w-36" />
                            ) : (
                              <span className="text-muted-foreground">{app.scheduled_date || "—"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {editingApp === app.id ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(app.id)}><Save className="w-3.5 h-3.5 text-secondary" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingApp(null)}><X className="w-3.5 h-3.5" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(app)}><Pencil className="w-3.5 h-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteApp(app.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {applications.length === 0 && (
                        <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No applications yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ========== ASSIGN TECHNICIANS ========== */}
            <TabsContent value="assign">
              <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
                <div className="p-5 border-b border-border">
                  <h3 className="font-display font-semibold text-foreground">
                    Pending Applications — Assign Technician ({pendingApps.length})
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Applications with "Submitted" or "Site Survey" status. Select a technician and optional date, then click Assign.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ref</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">District</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Technician</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Schedule Date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApps.map((app) => (
                        <tr key={app.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{app.ref_code}</td>
                          <td className="px-4 py-3 text-foreground">{app.customer_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{app.district}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusColors[app.status] || "#888", color: "white" }}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {technicians.length > 0 ? (
                              <Select value={assignTech[app.id] || ""} onValueChange={(v) => setAssignTech((prev) => ({ ...prev, [app.id]: v }))}>
                                <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Select technician" /></SelectTrigger>
                                <SelectContent>
                                  {technicians.map((t) => <SelectItem key={t.user_id} value={t.full_name}>{t.full_name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={assignTech[app.id] || ""}
                                onChange={(e) => setAssignTech((prev) => ({ ...prev, [app.id]: e.target.value }))}
                                placeholder="Technician name"
                                className="h-8 text-xs w-36"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              value={assignDate[app.id] || ""}
                              onChange={(e) => setAssignDate((prev) => ({ ...prev, [app.id]: e.target.value }))}
                              className="h-8 text-xs w-36"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAssign(app.id)}>
                              <UserCheck className="w-3.5 h-3.5 mr-1" /> Assign
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {pendingApps.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No pending applications to assign.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ========== ANALYTICS ========== */}
            <TabsContent value="analytics">
              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                  <h3 className="font-display font-semibold text-foreground mb-4">Applications by District</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={districtData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
                      <Tooltip formatter={(value, _name, props) => [value, (props.payload as any).full || "District"]} />
                      <Bar dataKey="count" fill="hsl(180 70% 40%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                  <h3 className="font-display font-semibold text-foreground mb-4">Status Breakdown</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={statusColors[entry.name] || "#888"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                  <h3 className="font-display font-semibold text-foreground mb-4">Applications by Service Type</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={serviceData} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(25 95% 53%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                  <h3 className="font-display font-semibold text-foreground mb-4">Monthly Application Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(180 70% 40%)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* ========== PLAN ROUTES ========== */}
            <TabsContent value="plan">
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                  <h3 className="font-display font-semibold text-foreground mb-2">Fiber Route Planning</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use the draw tools on the map to plan new fiber routes (polylines) or place new nodes (markers). Routes and nodes are saved automatically.
                  </p>
                  <AdminDrawMap key={drawMapKey} onRouteCreated={fetchData} onNodeCreated={fetchData} />
                </div>

                <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <h3 className="font-display font-semibold text-foreground">Saved Routes ({fiberRoutes.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Route Name</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fiberRoutes.map((r) => (
                          <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-foreground">{r.route_name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRoute(r.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                            </td>
                          </tr>
                        ))}
                        {fiberRoutes.length === 0 && (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No routes yet. Draw one on the map above.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ========== MANAGE NODES ========== */}
            <TabsContent value="nodes">
              <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
                <div className="p-5 border-b border-border">
                  <h3 className="font-display font-semibold text-foreground">Fiber Nodes ({fiberNodes.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lat / Lng</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Capacity</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fiberNodes.map((node) => (
                        <tr key={node.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-foreground">
                            {editingNode === node.id ? (
                              <Input value={nodeEditForm.name} onChange={(e) => setNodeEditForm({ ...nodeEditForm, name: e.target.value })} className="h-8 text-xs w-36" />
                            ) : node.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                          </td>
                          <td className="px-4 py-3">
                            {editingNode === node.id ? (
                              <Input value={nodeEditForm.capacity} onChange={(e) => setNodeEditForm({ ...nodeEditForm, capacity: e.target.value })} className="h-8 text-xs w-24" type="number" />
                            ) : <span className="text-muted-foreground">{node.capacity}</span>}
                          </td>
                          <td className="px-4 py-3">
                            {editingNode === node.id ? (
                              <Select value={nodeEditForm.status} onValueChange={(v) => setNodeEditForm({ ...nodeEditForm, status: v })}>
                                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["Active", "Planned", "Maintenance"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                                backgroundColor: node.status === "Active" ? "#14b8a6" : node.status === "Planned" ? "#f59e0b" : "#ef4444",
                                color: "white",
                              }}>
                                {node.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {editingNode === node.id ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveNodeEdit(node.id)}><Save className="w-3.5 h-3.5 text-secondary" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNode(null)}><X className="w-3.5 h-3.5" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startNodeEdit(node)}><Pencil className="w-3.5 h-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteNode(node.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {fiberNodes.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No nodes. Use the Plan Routes tab to place markers on the map.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ========== HEATMAP ========== */}
            <TabsContent value="heatmap">
              <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                <h3 className="font-display font-semibold text-foreground mb-2">Application Demand Heatmap</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Heatmap intensity is based on application density. Warmer colors indicate higher demand areas.
                </p>
                <LeafletMap showHeatmap={true} showRoutes={true} showNodes={true} height="600px" />
                <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-secondary" />Active Node</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent" />Planned Node</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive" />Maintenance</div>
                  <div className="flex items-center gap-2"><div className="w-4 h-2 rounded" style={{ background: "linear-gradient(90deg, #22d3ee, #facc15, #f97316, #ef4444)" }} />Demand Intensity</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
