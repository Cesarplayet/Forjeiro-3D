import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Category = { id: string; slug: string; name_pt: string; name_en: string; icon: string | null };

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  const { lang, t } = useI18n();
  return (
    <section className="container py-16 relative">
      <div className="text-center mb-10">
        <div className="font-mono-tech text-xs uppercase tracking-[0.3em] text-primary mb-2">// 01 — Catálogo</div>
        <h2 className="text-3xl md:text-4xl font-bold">{t("categories.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("categories.subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map((c) => {
          const Icon = (Icons as any)[c.icon || "Box"] || Icons.Box;
          const isMiniMe = c.slug === "mini-me";
          return (
            <Link
              key={c.id}
              to={isMiniMe ? "/mini-me" : `/shop?cat=${c.slug}`}
              className={`group relative p-6 border-2 border-border bg-card shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-elegant hover:border-primary ${
                isMiniMe ? "bg-gradient-primary text-primary-foreground border-transparent" : ""
              }`}
            >
              <div className="absolute top-2 right-2 font-mono-tech text-[10px] opacity-50">
                0{(categories.indexOf(c) + 1)}
              </div>
              <Icon className={`w-8 h-8 mb-3 transition-smooth group-hover:scale-110 ${isMiniMe ? "" : "text-primary"}`} strokeWidth={1.75} />
              <div className="font-display font-bold uppercase tracking-wide text-sm">
                {lang === "pt" ? c.name_pt : c.name_en}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}