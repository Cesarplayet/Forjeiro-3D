import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Category = { id: string; slug: string; name_pt: string; name_en: string; icon: string | null };

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  const { lang, t } = useI18n();
  return (
    <section className="container py-16">
      <div className="text-center mb-10">
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
              className={`group rounded-2xl p-6 border border-border bg-card shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-elegant ${
                isMiniMe ? "bg-gradient-primary text-primary-foreground border-transparent" : ""
              }`}
            >
              <Icon className={`w-8 h-8 mb-3 transition-smooth group-hover:scale-110 ${isMiniMe ? "" : "text-primary"}`} />
              <div className="font-display font-semibold">
                {lang === "pt" ? c.name_pt : c.name_en}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}