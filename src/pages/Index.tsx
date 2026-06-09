import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Wifi, BarChart3, Shield, ArrowRight, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import heroBg from "@/assets/hero-bg.jpg";
import econetLogo from "@/assets/econet-logo.jpg";

const features = [
  { icon: Wifi, title: "Fiber Broadband", desc: "Up to 200Mbps symmetric fiber to your premises across Lesotho" },
  { icon: MapPin, title: "Coverage Checker", desc: "Interactive map with real-time coverage data and GPS auto-detect" },
  { icon: BarChart3, title: "Network Analytics", desc: "District-level demand analytics and capacity planning" },
  { icon: Shield, title: "99.9% Uptime", desc: "Enterprise-grade network reliability backed by SLA" },
  { icon: Zap, title: "Fast Installation", desc: "Track your application from submission to activation" },
  { icon: Globe, title: "Nationwide Reach", desc: "Connecting all 10 districts of Lesotho with fiber and wireless" },
];

export default function Index() {
  return (
    <div className="min-h-screen">
      {/* Hero with animated background */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-primary">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        {/* Animated orbs — Econet-inspired motion */}
        <motion.div
          aria-hidden
          className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(195 90% 55% / 0.35) 0%, transparent 70%)" }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(220 80% 50% / 0.45) 0%, transparent 70%)" }}
          animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(170 80% 50% / 0.25) 0%, transparent 70%)" }}
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/60 to-primary/85" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.1 }}
              className="flex justify-center mb-6"
            >
              <div className="bg-primary-foreground/95 backdrop-blur rounded-2xl px-5 py-3 shadow-2xl ring-1 ring-primary-foreground/30">
                <img src={econetLogo} alt="Econet Telecom Lesotho" className="h-12 w-auto" />
              </div>
            </motion.div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-medium mb-6 border border-primary-foreground/20">
              Econet Telecom Lesotho
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground leading-tight mb-6">
              Connecting Lesotho<br />
              <span className="text-primary-foreground/80">to the Future</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10">
              High-speed fiber optic broadband across all 10 districts.
              Apply online, track your installation, and get connected.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg" asChild>
                <Link to="/apply">
                  Apply Now <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-primary-foreground/40 text-primary-foreground bg-transparent hover:bg-primary-foreground/10" asChild>
                <Link to="/coverage">Check Coverage</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Enterprise-Grade Infrastructure
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built for businesses, homes, and institutions across Lesotho.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-telecom transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Ready to Get Connected?
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-lg mx-auto">
            Check if fiber is available in your area and apply online in minutes.
          </p>
          <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg" asChild>
            <Link to="/apply">Start Application <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
