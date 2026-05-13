import { useEffect, useState } from "react";
import { Search, Shield, UserRound, School, Building2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  district: string | null;
  account_type: string;
  created_at: string;
  roles: string[];
}

const roleOptions = ["main_admin", "moderator", "service_delivery", "technical", "billing", "technician", "customer", "admin"] as const;

const accountTypeIcons: Record<string, typeof UserRound> = {
  individual: UserRound,
  school: School,
  business: Building2,
};

export default function AdminUserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleting, setDeleting] = useState<UserProfile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone, district, account_type, created_at")
      .order("created_at", { ascending: false });

    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (profiles) {
      const roleMap: Record<string, string[]> = {};
      allRoles?.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      setUsers(
        profiles.map((p: any) => ({
          ...p,
          roles: roleMap[p.user_id] || ["customer"],
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role } as any);
    if (error) {
      if (error.code === "23505") toast.info("User already has this role");
      else toast.error(error.message);
    } else {
      toast.success(`Role "${role}" added`);
      fetchUsers();
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role as any);
    if (error) toast.error(error.message);
    else {
      toast.success(`Role "${role}" removed`);
      fetchUsers();
    }
  };

  const deleteUser = async (target: UserProfile) => {
    setBusyId(target.user_id);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: target.user_id },
    });
    setBusyId(null);
    setDeleting(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to delete user");
      return;
    }
    toast.success(`Deleted ${target.full_name || target.email}`);
    fetchUsers();
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.roles.includes(roleFilter);
    const matchType = typeFilter === "all" || u.account_type === typeFilter;
    return matchSearch && matchRole && matchType;
  });

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading users...</div>;

  return (
    <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
      <div className="p-5 border-b border-border space-y-3">
        <h3 className="font-display font-semibold text-foreground">User Management ({filtered.length})</h3>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9 h-9 text-sm" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roleOptions.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">District</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roles</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const Icon = accountTypeIcons[u.account_type] || UserRound;
              return (
                <tr key={u.user_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-foreground">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground capitalize">
                      <Icon className="w-3.5 h-3.5" /> {u.account_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.district || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary/15 text-secondary capitalize">
                          <Shield className="w-2.5 h-2.5" />{r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Select onValueChange={(role) => addRole(u.user_id, role)}>
                      <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue placeholder="Add role" /></SelectTrigger>
                      <SelectContent>
                        {roleOptions.filter((r) => !u.roles.includes(r)).map((r) => (
                          <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {u.roles.length > 1 && (
                      <div className="flex gap-1 mt-1">
                        {u.roles.filter((r) => r !== "customer").map((r) => (
                          <Button key={r} variant="ghost" size="sm" className="h-5 text-[10px] text-destructive px-1" onClick={() => removeRole(u.user_id, r)}>
                            ✕ {r}
                          </Button>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={u.user_id === user?.id || busyId === u.user_id}
                      className="h-6 text-[10px] text-destructive px-1 mt-1"
                      onClick={() => setDeleting(u)}
                      title={u.user_id === user?.id ? "You cannot delete yourself" : "Delete user"}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete user
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete user permanently?"
        description={deleting ? `This removes ${deleting.full_name || deleting.email} from the system, including their roles and profile. This cannot be undone.` : ""}
        confirmText="Delete user"
        destructive
        onConfirm={() => deleting && deleteUser(deleting)}
      />
    </div>
  );
}
