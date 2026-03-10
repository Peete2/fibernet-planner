import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { WifiOff, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, hsl(var(--primary)) 2px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center px-6 relative z-10"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto mb-8 w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <WifiOff className="w-12 h-12 text-primary" />
        </motion.div>

        {/* Error code */}
        <h1 className="text-8xl md:text-9xl font-display font-bold text-primary/20 leading-none mb-2">
          404
        </h1>

        {/* Brand name */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-1 rounded-full bg-accent" />
          <span className="text-sm font-display font-semibold text-primary tracking-widest uppercase">
            Econet Telecom Lesotho
          </span>
          <div className="w-8 h-1 rounded-full bg-accent" />
        </div>

        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
          Connection Lost
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8 text-base">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on the network.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to="/coverage">
              <ArrowLeft className="w-4 h-4" />
              View Coverage Map
            </Link>
          </Button>
        </div>

        {/* Route info */}
        <p className="mt-8 text-xs text-muted-foreground/60">
          Requested: <code className="bg-muted px-2 py-0.5 rounded text-xs">{location.pathname}</code>
        </p>
      </motion.div>
    </div>
  );
};

export default NotFound;
