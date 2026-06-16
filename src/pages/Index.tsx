import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import CategoryGrid from "@/components/CategoryGrid";
import ProductCard, { Product } from "@/components/ProductCard";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/hero.jpg";

export default function Index() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCategories(data || []));
    supabase.from("products").select("*").eq("active", true).limit(4).then(({ data }) => setFeatured((data as Product[]) || []));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-80 h-80 clip-hex bg-primary/20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-64 h-64 rotate-12 bg-accent/20 blur-3xl pointer-events-none" />
        <div className="container relative grid md:grid-cols-2 gap-10 items-center py-16 md:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-background/10 backdrop-blur text-xs font-mono-tech uppercase tracking-widest border border-primary-foreground/20">
              <Sparkles className="w-4 h-4 text-accent" /> {t("hero.tag")}
            </span>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.05]">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">{t("hero.subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-elegant hover:opacity-90 rounded-none">
                <Link to="/shop">{t("hero.cta")} <ArrowRight className="ml-1 w-4 h-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground rounded-none">
                <Link to="/mini-me">{t("hero.minime")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img src={hero} alt="FORJEIRO 3D — geometric forge of 3D printed products" width={1600} height={1000} className="shadow-elegant w-full h-auto clip-hex" />
          </div>
        </div>
      </section>

      <CategoryGrid categories={categories} />

      <section className="container pb-20">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">{t("shop.title")}</h2>
          <Link to="/shop" className="text-sm font-medium text-primary hover:underline">→</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground font-mono-tech">
        © {new Date().getFullYear()} FORJEIRO 3D
      </footer>
    </div>
  );
}
