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

      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container grid md:grid-cols-2 gap-10 items-center py-16 md:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/60 backdrop-blur text-sm font-medium border border-border">
              <Sparkles className="w-4 h-4 text-primary" /> {t("hero.tag")}
            </span>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.05]">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">{t("hero.subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90">
                <Link to="/shop">{t("hero.cta")} <ArrowRight className="ml-1 w-4 h-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-foreground/20">
                <Link to="/mini-me">{t("hero.minime")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img src={hero} alt="3D printed products" width={1600} height={1000} className="rounded-3xl shadow-elegant w-full h-auto" />
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

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Print3D Studio
      </footer>
    </div>
  );
}
