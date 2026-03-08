import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { mockApplications, DISTRICTS, mockFiberNodes } from "@/lib/mock-data";
import { Users, FileText, CheckCircle, Wifi } from "lucide-react";

const statusColors: Record<string, string> = {
  Submitted: "hsl(45 90% 50%)",
  "Site Survey": "hsl(200 80% 50%)",
  Approved: "hsl(160 70% 45%)",
  "Installation Scheduled": "hsl(270 60% 55%)",
  Completed: "hsl(140 70% 40%)",
};

export default function Admin() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  // District stats
  const districtData = DISTRICTS.map((d) => ({
    name: d.length > 8 ? d.slice(0, 8) + "." : d,
    count: mockApplications.filter((a) => a.district === d).length,
  })).filter((d) => d.count > 0);

  // Status breakdown
  const statusData = Object.entries(
    mockApplications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: "Total Applications", value: mockApplications.length, icon: FileText, color: "text-secondary" },
    { label: "Completed", value: mockApplications.filter((a) => a.status === "Completed").length, icon: CheckCircle, color: "text-status-completed" },
    { label: "Active Nodes", value: mockFiberNodes.filter((n) => n.status === "Active").length, icon: Wifi, color: "text-secondary" },
    { label: "Pending", value: mockApplications.filter((a) => a.status !== "Completed").length, icon: Users, color: "text-accent" },
  ];

  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground mb-8">Network overview and application management.</p>

          {/* Stats */}
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

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
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

          {/* Applications table */}
          <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">All Applications</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Service</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">District</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mockApplications.map((app) => (
                    <tr
                      key={app.id}
                      className={`border-b border-border hover:bg-muted/30 cursor-pointer transition-colors ${selectedApp === app.id ? "bg-secondary/5" : ""}`}
                      onClick={() => setSelectedApp(selectedApp === app.id ? null : app.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{app.id}</td>
                      <td className="px-4 py-3 text-foreground">{app.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{app.service}</td>
                      <td className="px-4 py-3 text-muted-foreground">{app.district}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: statusColors[app.status], color: "white" }}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{app.dateCreated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
