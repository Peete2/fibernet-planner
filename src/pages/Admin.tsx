import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { DISTRICTS } from "@/lib/mock-data";
import { Users, FileText, CheckCircle, Wifi, Pencil, Trash2, X, Save, BarChart3, Route, Flame, CalendarDays, UserCheck, Plus, Search, ChevronLeft, ChevronRight, ScrollText, UsersRound, Download, Brain, Radio, Cable, School, FileDown, ExternalLink, Package, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LeafletMap from "@/components/LeafletMap";
import AdminDrawMap from "@/components/AdminDrawMap";
import CreateApplicationDialog from "@/components/CreateApplicationDialog";
import SystemLogsPanel from "@/components/SystemLogsPanel";
import AdminUserManagement from "@/components/AdminUserManagement";
import ServicePlansManager from "@/components/ServicePlansManager";
import DocumentPreview from "@/components/DocumentPreview";
import AuditLogPanel from "@/components/AuditLogPanel";
import DistributorAdminPanel from "@/components/DistributorAdminPanel";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import StagePerformancePanel from "@/components/StagePerformancePanel";
import StageFunnel from "@/components/StageFunnel";
import ConfirmDialog from "@/components/ConfirmDialog";
import Footer from "@/components/Footer";
import PageSkeleton from "@/components/PageSkeleton";
import AISuggestionsPanel from "@/components/AISuggestionsPanel";
import ApCustomerManager from "@/components/ApCustomerManager";
import { BulkNodeImport } from "@/components/BulkNodeImport";
import { generateApplicationPDF, detectCategory, categoryLabels, type ServiceCategory } from "@/lib/pdf-generator";
import { logAudit } from "@/lib/audit";
import * as XLSX from "xlsx";

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
  title: string | null;
  service: string;
  district: string;
  location: string | null;
  status: string;
  technician: string | null;
  scheduled_date: string | null;
  created_at: string;
  document_url: string | null;
  affirmation_letter_url: string | null;
  applicant_role: string | null;
}

interface FiberNode {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: string;
  radius_km: number;
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

const SERVICE_TABS = [
  { id: "all", label: "All", icon: FileText },
  { id: "fmc", label: "Wi-Fi PLUS", icon: Wifi },
  { id: "lte", label: "Fixed LTE", icon: Radio },
  { id: "fibre", label: "Fibre (GPON)", icon: Cable },
  { id: "fwa", label: "Limited Wi-Fi", icon: School },
] as const;

export default function Admin() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [fiberNodes, setFiberNodes] = useState<FiberNode[]>([]);
  const [fiberRoutes, setFiberRoutes] = useState<FiberRoute[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [editingApp, setEditingApp] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ status: string; technician: string; scheduled_date: string }>({ status: "", technician: "", scheduled_date: "" });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [nodeEditForm, setNodeEditForm] = useState<{ name: string; capacity: string; status: string; radius_km: string }>({ name: "", capacity: "", status: "", radius_km: "4" });
  const [loading, setLoading] = useState(true);
  const [drawMapKey, setDrawMapKey] = useState(0);

  // Search & filter state
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [appDistrictFilter, setAppDistrictFilter] = useState("all");
  const [appServiceTab, setAppServiceTab] = useState("all");
  const [nodeSearch, setNodeSearch] = useState("");
  const [nodeStatusFilter, setNodeStatusFilter] = useState("all");

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [appPage, setAppPage] = useState(1);
  const [nodePage, setNodePage] = useState(1);

  // Assignment state for the Assign tab
  const [assignTech, setAssignTech] = useState<Record<string, string>>({});
  const [assignDate, setAssignDate] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    const [appsRes, nodesRes, routesRes, techRes] = await Promise.all([
      supabase.from("applications").select("id, ref_code, customer_name, title, service, district, location, status, technician, scheduled_date, created_at, document_url, affirmation_letter_url, applicant_role").order("created_at", { ascending: false }),
      supabase.from("fiber_nodes").select("id, name, latitude, longitude, capacity, status, radius_km"),
      supabase.from("fiber_routes").select("id, route_name, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "technician"),
    ]);
    if (appsRes.data) setApplications(appsRes.data);
    if (nodesRes.data) setFiberNodes(nodesRes.data);
    if (routesRes.data) setFiberRoutes(routesRes.data);

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

  useEffect(() => {
    const channel = supabase
      .channel('admin-applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filtered applications with service category tab
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch = !appSearch || 
        app.customer_name.toLowerCase().includes(appSearch.toLowerCase()) ||
        app.ref_code.toLowerCase().includes(appSearch.toLowerCase()) ||
        (app.location || "").toLowerCase().includes(appSearch.toLowerCase()) ||
        (app.technician || "").toLowerCase().includes(appSearch.toLowerCase());
      const matchesStatus = appStatusFilter === "all" || app.status === appStatusFilter;
      const matchesDistrict = appDistrictFilter === "all" || app.district === appDistrictFilter;
      const matchesServiceTab = appServiceTab === "all" || detectCategory(app.service) === appServiceTab;
      return matchesSearch && matchesStatus && matchesDistrict && matchesServiceTab;
    });
  }, [applications, appSearch, appStatusFilter, appDistrictFilter, appServiceTab]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications.length, fmc: 0, lte: 0, fibre: 0, fwa: 0 };
    applications.forEach((app) => {
      const cat = detectCategory(app.service);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [applications]);

  const filteredNodes = useMemo(() => {
    return fiberNodes.filter((node) => {
      const matchesSearch = !nodeSearch || node.name.toLowerCase().includes(nodeSearch.toLowerCase());
      const matchesStatus = nodeStatusFilter === "all" || node.status === nodeStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [fiberNodes, nodeSearch, nodeStatusFilter]);

  useEffect(() => { setAppPage(1); }, [appSearch, appStatusFilter, appDistrictFilter, appServiceTab]);
  useEffect(() => { setNodePage(1); }, [nodeSearch, nodeStatusFilter]);

  const appTotalPages = Math.max(1, Math.ceil(filteredApps.length / ITEMS_PER_PAGE));
  const paginatedApps = filteredApps.slice((appPage - 1) * ITEMS_PER_PAGE, appPage * ITEMS_PER_PAGE);
  const nodeTotalPages = Math.max(1, Math.ceil(filteredNodes.length / ITEMS_PER_PAGE));
  const paginatedNodes = filteredNodes.slice((nodePage - 1) * ITEMS_PER_PAGE, nodePage * ITEMS_PER_PAGE);

  const startEdit = (app: Application) => {
    setEditingApp(app.id);
    setEditForm({ status: app.status, technician: app.technician || "", scheduled_date: app.scheduled_date || "" });
  };

  const saveEdit = async (id: string) => {
    const before = applications.find((a) => a.id === id);
    const { error } = await supabase
      .from("applications")
      .update({
        status: editForm.status,
        technician: editForm.technician || null,
        scheduled_date: editForm.scheduled_date || null,
      })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Application updated");
    setEditingApp(null);

    // Audit
    logAudit({
      action: before && before.status !== editForm.status ? "status_change" : "update",
      target_type: "application",
      target_id: id,
      target_label: before?.ref_code,
      before: before ? { status: before.status, technician: before.technician, scheduled_date: before.scheduled_date } : null,
      after: { status: editForm.status, technician: editForm.technician || null, scheduled_date: editForm.scheduled_date || null },
    });

    // Fire-and-forget status-change email
    if (before && before.status !== editForm.status) {
      try {
        const { data: full } = await supabase.from("applications").select("email, customer_name, ref_code, service").eq("id", id).single();
        if (full?.email) {
          supabase.functions.invoke("send-status-email", {
            body: {
              to: full.email,
              customerName: full.customer_name,
              refCode: full.ref_code,
              service: full.service,
              oldStatus: before.status,
              newStatus: editForm.status,
            },
          }).catch((e) => console.warn("Email send failed:", e));
        }
      } catch (e) { console.warn(e); }
    }
    fetchData();
  };

  const deleteApp = async (id: string) => {
    const target = applications.find((a) => a.id === id);
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      logAudit({ action: "delete", target_type: "application", target_id: id, target_label: target?.ref_code, before: target });
      toast.success("Application deleted");
      fetchData();
    }
  };

  const handleAssign = async (appId: string) => {
    const tech = assignTech[appId];
    const date = assignDate[appId];
    if (!tech) { toast.error("Select a technician"); return; }

    const target = applications.find((a) => a.id === appId);
    const { error } = await supabase.from("applications").update({
      technician: tech,
      scheduled_date: date || null,
      status: date ? "Installation Scheduled" : "Site Survey",
    }).eq("id", appId);

    if (error) toast.error(error.message);
    else {
      logAudit({
        action: "assign", target_type: "application", target_id: appId, target_label: target?.ref_code,
        before: target ? { technician: target.technician, scheduled_date: target.scheduled_date, status: target.status } : null,
        after: { technician: tech, scheduled_date: date || null, status: date ? "Installation Scheduled" : "Site Survey" },
      });
      toast.success("Technician assigned");
      fetchData();
    }
  };

  const startNodeEdit = (node: FiberNode) => {
    setEditingNode(node.id);
    setNodeEditForm({ name: node.name, capacity: String(node.capacity), status: node.status, radius_km: String(node.radius_km ?? 4) });
  };

  const saveNodeEdit = async (id: string) => {
    const before = fiberNodes.find((n) => n.id === id);
    const after = {
      name: nodeEditForm.name,
      capacity: parseInt(nodeEditForm.capacity, 10),
      status: nodeEditForm.status,
      radius_km: parseFloat(nodeEditForm.radius_km) || 4,
    };
    const { error } = await supabase.from("fiber_nodes").update({
      ...after,
    } as any).eq("id", id);
    if (error) toast.error(error.message);
    else {
      logAudit({ action: "update", target_type: "fiber_node", target_id: id, target_label: after.name, before, after });
      toast.success("Node updated");
      setEditingNode(null);
      fetchData();
    }
  };

  const deleteNode = async (id: string) => {
    const target = fiberNodes.find((n) => n.id === id);
    const { error } = await supabase.from("fiber_nodes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      logAudit({ action: "delete", target_type: "fiber_node", target_id: id, target_label: target?.name, before: target });
      toast.success("Node deleted");
      fetchData();
    }
  };

  const deleteRoute = async (id: string) => {
    const target = fiberRoutes.find((r) => r.id === id);
    const { error } = await supabase.from("fiber_routes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      logAudit({ action: "delete", target_type: "fiber_route", target_id: id, target_label: target?.route_name });
      toast.success("Route deleted");
      fetchData();
      setDrawMapKey((k) => k + 1);
    }
  };

  const handleDownloadDoc = async (docUrl: string) => {
    const { data } = await supabase.storage.from("fwa-documents").createSignedUrl(docUrl, 300, { download: true });
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = docUrl.split("/").pop() || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      toast.error("Failed to generate download link");
    }
  };

  const exportApplicationsCSV = () => {
    if (filteredApps.length === 0) { toast.error("No applications to export"); return; }
    const headers = ["Ref", "Customer", "Title", "Service", "District", "Location", "Status", "Technician", "Scheduled", "Created"];
    const rows = filteredApps.map((a) => [
      a.ref_code, a.customer_name, a.title || "", a.service, a.district, a.location || "",
      a.status, a.technician || "", a.scheduled_date || "", new Date(a.created_at).toISOString().slice(0, 10),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Auto column widths
    ws["!cols"] = headers.map((h, i) => ({
      wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");
    XLSX.writeFile(wb, `applications-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${filteredApps.length} application${filteredApps.length === 1 ? "" : "s"}`);
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

  const monthlyData = (() => {
    const months: Record<string, number> = {};
    applications.forEach((a) => {
      const m = new Date(a.created_at).toLocaleDateString("en", { year: "numeric", month: "short" });
      months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).map(([month, count]) => ({ month, count })).reverse();
  })();

  const pendingApps = applications.filter((a) => ["Submitted", "Site Survey"].includes(a.status));

  const stats = [
    { label: "Total Applications", value: applications.length, icon: FileText, color: "text-secondary" },
    { label: "Completed", value: applications.filter((a) => a.status === "Completed").length, icon: CheckCircle, color: "text-secondary" },
    { label: "Active Nodes", value: fiberNodes.filter((n) => n.status === "Active").length, icon: Wifi, color: "text-secondary" },
    { label: "Pending", value: pendingApps.length, icon: Users, color: "text-accent" },
  ];

  if (loading) return <PageSkeleton variant="admin" />;

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
              <TabsTrigger value="funnel" className="gap-1.5"><BarChart3 className="w-4 h-4" />Funnel</TabsTrigger>
              <TabsTrigger value="plan" className="gap-1.5"><Route className="w-4 h-4" />Plan Routes</TabsTrigger>
              <TabsTrigger value="nodes" className="gap-1.5"><Wifi className="w-4 h-4" />Manage Nodes</TabsTrigger>
              <TabsTrigger value="plans" className="gap-1.5"><Package className="w-4 h-4" />Service Plans</TabsTrigger>
              <TabsTrigger value="ai-planner" className="gap-1.5"><Brain className="w-4 h-4" />AI Planner</TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-1.5"><Flame className="w-4 h-4" />Heatmap</TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5"><UsersRound className="w-4 h-4" />Users</TabsTrigger>
              <TabsTrigger value="distributors" className="gap-1.5"><UsersRound className="w-4 h-4" />Distributors</TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5"><ScrollText className="w-4 h-4" />System Logs</TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5"><Shield className="w-4 h-4" />Audit Log</TabsTrigger>
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
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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

              <div className="mt-8">
                <h3 className="font-display font-semibold text-foreground mb-3">Staff Performance — All Roles</h3>
                {(["moderation","service_delivery","technical","billing"] as const).map((s) => (
                  <div key={s} className="mb-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{s.replace("_"," ")}</p>
                    <StagePerformancePanel stage={s} scope="all" />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ========== APPLICATIONS (sectioned by service) ========== */}
            <TabsContent value="applications">
              <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
                <div className="p-5 border-b border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-foreground">All Applications ({filteredApps.length}{filteredApps.length !== applications.length ? ` of ${applications.length}` : ""})</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={exportApplicationsCSV} className="gap-1.5">
                        <Download className="w-4 h-4" /> Export Excel
                      </Button>
                      <CreateApplicationDialog onCreated={fetchData} />
                    </div>
                  </div>

                  {/* Service category sub-tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    {SERVICE_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const count = categoryCounts[tab.id] || 0;
                      const isActive = appServiceTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setAppServiceTab(tab.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {tab.label}
                          <Badge variant={isActive ? "default" : "outline"} className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] justify-center">
                            {count}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={appSearch} onChange={(e) => setAppSearch(e.target.value)} placeholder="Search by name, ref, location..." className="pl-9 h-9 text-sm" />
                    </div>
                    <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
                      <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={appDistrictFilter} onValueChange={setAppDistrictFilter}>
                      <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="All districts" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Districts</SelectItem>
                        {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
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
                      {paginatedApps.map((app) => {
                        const appCategory = detectCategory(app.service);
                        const isFwa = appCategory === "fwa";
                        return (
                          <tr key={app.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-foreground">{app.ref_code}</td>
                            <td className="px-4 py-3 text-foreground">
                              <div>{app.title ? `${app.title} ` : ""}{app.customer_name}</div>
                              {isFwa && app.applicant_role && (
                                <Badge variant="outline" className="text-[10px] mt-0.5">{app.applicant_role}</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <span className="text-xs">{app.service}</span>
                            </td>
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
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Download PDF" onClick={async () => {
                                      const { data } = await supabase.from("applications").select("*").eq("id", app.id).single();
                                      if (data) generateApplicationPDF(data as any);
                                      else toast.error("Failed to load application data");
                                    }}><FileDown className="w-3.5 h-3.5" /></Button>
                                    {isFwa && app.document_url && (
                                      <>
                                        <DocumentPreview path={app.document_url} label={`ID — ${app.customer_name}`} />
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download ID document" onClick={() => handleDownloadDoc(app.document_url!)}>
                                          <ExternalLink className="w-3.5 h-3.5 text-accent" />
                                        </Button>
                                      </>
                                    )}
                                    {isFwa && app.affirmation_letter_url && (
                                      <>
                                        <DocumentPreview path={app.affirmation_letter_url} label={`Affirmation letter — ${app.customer_name}`} />
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download affirmation letter" onClick={() => handleDownloadDoc(app.affirmation_letter_url!)}>
                                          <School className="w-3.5 h-3.5 text-secondary" />
                                        </Button>
                                      </>
                                    )}
                                    <ConfirmDialog onConfirm={() => deleteApp(app.id)} title="Delete application?" description={`This will permanently delete application ${app.ref_code}.`} />
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredApps.length === 0 && (
                        <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">{applications.length === 0 ? "No applications yet." : "No applications match your filters."}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredApps.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      Showing {(appPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(appPage * ITEMS_PER_PAGE, filteredApps.length)} of {filteredApps.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={appPage <= 1} onClick={() => setAppPage((p) => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: appTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === appTotalPages || Math.abs(p - appPage) <= 1)
                        .reduce<(number | string)[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          typeof p === "string" ? (
                            <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                          ) : (
                            <Button key={p} variant={p === appPage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setAppPage(p)}>
                              {p}
                            </Button>
                          )
                        )}
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={appPage >= appTotalPages} onClick={() => setAppPage((p) => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
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
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* ========== FUNNEL & UTILIZATION ========== */}
            <TabsContent value="funnel">
              <StageFunnel />
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
                              <ConfirmDialog onConfirm={() => deleteRoute(r.id)} title="Delete route?" description={`This will permanently delete route "${r.route_name}".`} />
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
                <div className="p-5 border-b border-border space-y-3">
                  <h3 className="font-display font-semibold text-foreground">Fiber Nodes ({filteredNodes.length}{filteredNodes.length !== fiberNodes.length ? ` of ${fiberNodes.length}` : ""})</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={nodeSearch} onChange={(e) => setNodeSearch(e.target.value)} placeholder="Search nodes..." className="pl-9 h-9 text-sm" />
                    </div>
                    <Select value={nodeStatusFilter} onValueChange={setNodeStatusFilter}>
                      <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {["Active", "Planned", "Maintenance"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lat / Lng</th>
                         <th className="px-4 py-3 text-left font-medium text-muted-foreground">Capacity</th>
                         <th className="px-4 py-3 text-left font-medium text-muted-foreground">Radius (km)</th>
                         <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedNodes.map((node) => (
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
                              <Input value={nodeEditForm.radius_km} onChange={(e) => setNodeEditForm({ ...nodeEditForm, radius_km: e.target.value })} className="h-8 text-xs w-20" type="number" step="0.5" min="0.5" />
                            ) : <span className="text-muted-foreground">{node.radius_km ?? 4} km</span>}
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
                                  <ConfirmDialog onConfirm={() => deleteNode(node.id)} title="Delete node?" description={`This will permanently delete node "${node.name}".`} />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredNodes.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{fiberNodes.length === 0 ? "No nodes. Use the Plan Routes tab to place markers on the map." : "No nodes match your filters."}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredNodes.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      Showing {(nodePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(nodePage * ITEMS_PER_PAGE, filteredNodes.length)} of {filteredNodes.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={nodePage <= 1} onClick={() => setNodePage((p) => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: nodeTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === nodeTotalPages || Math.abs(p - nodePage) <= 1)
                        .reduce<(number | string)[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          typeof p === "string" ? (
                            <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                          ) : (
                            <Button key={p} variant={p === nodePage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setNodePage(p)}>
                              {p}
                            </Button>
                          )
                        )}
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={nodePage >= nodeTotalPages} onClick={() => setNodePage((p) => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <ApCustomerManager />
              </div>
              <div className="mt-4">
                <BulkNodeImport onComplete={fetchData} />
              </div>
            </TabsContent>

            {/* ========== AI PLANNER ========== */}
            <TabsContent value="plans">
              <ServicePlansManager />
            </TabsContent>
            <TabsContent value="ai-planner">
              <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                <AISuggestionsPanel onNodeCreated={fetchData} />
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

            {/* ========== USER MANAGEMENT ========== */}
            <TabsContent value="users">
              <AdminUserManagement />
            </TabsContent>

            {/* ========== DISTRIBUTORS ========== */}
            <TabsContent value="distributors">
              <DistributorAdminPanel />
            </TabsContent>

            {/* ========== SYSTEM LOGS ========== */}
            <TabsContent value="logs">
              <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
                <h3 className="font-display font-semibold text-foreground mb-2">System Logs</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor backend errors, warnings, and system events. Critical and error logs require attention.
                </p>
                <SystemLogsPanel />
              </div>
            </TabsContent>

            {/* ========== AUDIT LOG ========== */}
            <TabsContent value="audit">
              <AuditLogPanel />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
