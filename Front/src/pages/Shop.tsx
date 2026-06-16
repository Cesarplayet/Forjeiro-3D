import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProductCard, { Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function Shop() {
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat");
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCategories(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = supabase.from("products").select("*, categories!inner(slug)").eq("active", true);
    if (cat) q = q.eq("categories.slug", cat);
    q.then(({ data }) => { setProducts((data as Product[]) || []); setLoading(false); });
  }, [cat]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10">
        <h1 className="font-display text-4xl font-bold mb-6">{t("shop.title")}</h1>
        <div className="flex flex-wrap gap-2 mb-8">
          <Button variant={!cat ? "default" : "outline"} size="sm" onClick={() => setParams({})}>
            {t("shop.all")}
          </Button>
          {categories.filter((c) => c.slug !== "mini-me").map((c) => (
            <Button
              key={c.id}
              variant={cat === c.slug ? "default" : "outline"}
              size="sm"
              onClick={() => setParams({ cat: c.slug })}
            >
              {lang === "pt" ? c.name_pt : c.name_en}
            </Button>
          ))}
        </div>
        {loading ? (
          <div className="text-muted-foreground">{t("common.loading")}</div>
        ) : products.length === 0 ? (
          <div className="text-muted-foreground py-20 text-center">{t("shop.empty")}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}