import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Wifi, LogOut, User } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
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
    ...(user && hasRole("admin") ? [{ to: "/admin", label: "Admin" }] : []),
    ...(user ? [{ to: "/profile", label: "Profile" }] : []),
    ...(!user ? [{ to: "/admin-login", label: "Admin Login" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 hero-gradient border-b border-secondary/20">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <Wifi className="w-5 h-5 text-secondary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-primary-foreground tracking-tight">
            ETL Fiber
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? "bg-secondary/20 text-secondary"
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
            <Button variant="hero" size="sm" className="ml-3" asChild>
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
            className="md:hidden hero-gradient overflow-hidden border-t border-secondary/20"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === l.to
                      ? "bg-secondary/20 text-secondary"
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
                <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-secondary font-medium">
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
