import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Wifi, BarChart3, Shield, ArrowRight, Zap, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  { icon: Wifi, title: "Fiber Broadband", desc: "Up to 200Mbps symmetric fiber to your premises across Lesotho" },
  { icon: MapPin, title: "Coverage Checker", desc: "Interactive map with real-time coverage data and GPS auto-detect" },
  { icon: BarChart3, title: "Network Analytics", desc: "District-level demand analytics and capacity planning" },
  { icon: Shield, title: "99.9% Uptime", desc: "Enterprise-grade network reliability backed by SLA" },
  { icon: Zap, title: "Fast Installation", desc: "Track your application from submission to activation" },
  { icon: Globe, title: "Nationwide Reach", desc: "Connecting all 10 districts of Lesotho with fiber and wireless" },
];

const ROTATING_WORDS = ["the Future", "Every Home", "Every Business", "All 10 Districts"];
const MARQUEE_ITEMS = [
  "Fibre to the Home",
  "LTE Wireless",
  "Enterprise Connectivity",
  "5G Roaming",
  "EcoCash Payments",
  "Nationwide Coverage",
  "24/7 Support",
];

function Meteors({ count = 18 }: { count?: number }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        top: Math.random() * 60,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 4 + Math.random() * 6,
      })),
    [count]
  );
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute h-0.5 w-0.5 rounded-full bg-primary-foreground shadow-[0_0_8px_2px_hsl(195_90%_70%/0.8)] animate-meteor"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
          }}
        >
          <span className="absolute top-1/2 -translate-y-1/2 w-[60px] h-px bg-gradient-to-r from-primary-foreground/80 to-transparent" />
        </span>
      ))}
    </div>
  );
}

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % ROTATING_WORDS.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block align-bottom overflow-hidden h-[1.1em] min-w-[6ch]">
      <motion.span
        key={i}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        exit={{ y: "-100%", opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="block bg-gradient-to-r from-primary-foreground via-primary-foreground/80 to-primary-foreground/60 bg-clip-text text-transparent"
      >
        {ROTATING_WORDS[i]}
      </motion.span>
    </span>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen">
      {/* Hero with animated background */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-primary">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        {/* Animated grid */}
        <div aria-hidden className="absolute inset-0 bg-grid-fade" />
        {/* Aurora sweep */}
        <div
          aria-hidden
          className="absolute -inset-1/2 opacity-40 animate-aurora"
          style={{
            background:
              "conic-gradient(from 90deg at 50% 50%, transparent 0deg, hsl(195 90% 60% / 0.35) 60deg, transparent 120deg, hsl(220 90% 65% / 0.35) 200deg, transparent 280deg, hsl(170 80% 55% / 0.3) 340deg, transparent 360deg)",
          }}
        />
        {/* Meteor shower */}
        <Meteors count={20} />
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
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/40 to-primary/90" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-medium mb-6 border border-primary-foreground/20 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Econet Telecom Lesotho
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground leading-tight mb-6">
              Connecting Lesotho<br />
              to <RotatingWord />
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
              High-speed fiber optic broadband across all 10 districts.
              Apply online, track your installation, and get connected.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="relative bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-2xl shadow-primary-foreground/20 overflow-hidden group" asChild>
                <Link to="/apply">
                  <span className="relative z-10 inline-flex items-center">Apply Now <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" /></span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-shimmer" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-primary-foreground/40 text-primary-foreground bg-transparent hover:bg-primary-foreground/10" asChild>
                <Link to="/coverage">Check Coverage</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Marquee strip */}
        <div className="absolute bottom-0 left-0 right-0 z-10 border-y border-primary-foreground/10 bg-primary/40 backdrop-blur-sm py-3 overflow-hidden">
          <div className="flex w-max animate-marquee gap-12 px-6 text-primary-foreground/80 text-sm tracking-wide whitespace-nowrap">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60" />
                {item}
              </span>
            ))}
          </div>
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
