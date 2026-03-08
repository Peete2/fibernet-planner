import { Link } from "react-router-dom";
import { Wifi } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-8 bg-card border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Wifi className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-sm text-foreground">ETL Fiber</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/coverage" className="hover:text-foreground transition-colors">Coverage</Link>
            <Link to="/apply" className="hover:text-foreground transition-colors">Apply</Link>
            <Link to="/track" className="hover:text-foreground transition-colors">Track</Link>
          </div>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Econet Telecom Lesotho. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
