import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import econetLogo from "@/assets/econet-logo.jpg";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/coverage", label: "Coverage Map" },
  { to: "/apply", label: "Apply" },
  { to: "/track", label: "Track" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, hasRole, signOut } = useAuth();

  const navLinks = [
    ...publicLinks,
    ...(user ? [{ to: "/dashboard", label: "My Apps" }] : []),
    ...(user && hasRole("technician") ? [{ to: "/tech", label: "Tech Jobs" }] : []),
    ...(user && (hasRole("main_admin") || hasRole("admin")) ? [{ to: "/admin", label: "Admin" }] : []),
    ...(user && hasRole("moderator") ? [{ to: "/moderator", label: "Moderator" }] : []),
    ...(user && hasRole("service_delivery") ? [{ to: "/service-delivery", label: "Service Delivery" }] : []),
    ...(user && hasRole("technical") ? [{ to: "/technical", label: "Technical" }] : []),
    ...(user && hasRole("billing") ? [{ to: "/billing", label: "Billing" }] : []),
    ...(user ? [{ to: "/profile", label: "Profile" }] : []),
    ...(!user ? [{ to: "/admin-login", label: "Admin Login" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary border-b border-primary-foreground/10">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary-foreground rounded-md px-2 py-1 flex items-center">
            <img src={econetLogo} alt="Econet Telecom Lesotho" className="h-7 w-auto" />
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-2 ml-3">
              <NotificationBell />
              <span className="text-xs text-primary-foreground/60 flex items-center gap-1">
                <User className="w-3 h-3" />
                {profile?.full_name || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-primary-foreground/70 hover:text-primary-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" className="ml-3 bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>

        <button className="md:hidden text-primary-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-primary overflow-hidden border-t border-primary-foreground/10"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === l.to
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-primary-foreground/70"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              {user ? (
                <button onClick={handleSignOut} className="block px-3 py-2 text-sm text-primary-foreground/70">
                  Sign Out
                </button>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-primary-foreground font-medium">
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
