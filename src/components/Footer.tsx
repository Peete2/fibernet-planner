import { Link } from "react-router-dom";
import econetLogo from "@/assets/econet-logo.jpg";

export default function Footer() {
  return (
    <footer className="py-8 bg-card border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={econetLogo} alt="Econet Telecom Lesotho" className="h-8 w-auto" />
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
