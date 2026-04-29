import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export type Product = {
  id: string;
  name_pt: string;
  name_en: string;
  description_pt: string | null;
  description_en: string | null;
  price: number;
  image_url: string | null;
};

export default function ProductCard({ p }: { p: Product }) {
  const { lang, t } = useI18n();
  const { add } = useCart();
  const name = lang === "pt" ? p.name_pt : p.name_en;
  const desc = lang === "pt" ? p.description_pt : p.description_en;
  return (
    <div className="group rounded-2xl overflow-hidden bg-card border border-border shadow-soft hover:shadow-elegant transition-smooth hover:-translate-y-1">
      <div className="aspect-square overflow-hidden bg-muted">
        {p.image_url ? (
          <img src={p.image_url} alt={name} loading="lazy" className="w-full h-full object-cover transition-smooth group-hover:scale-105" />
        ) : null}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold leading-tight">{name}</h3>
          {desc && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{desc}</p>}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-lg">R$ {Number(p.price).toFixed(2)}</span>
          <Button
            size="sm"
            onClick={() => {
              add({ id: p.id, name, price: Number(p.price), image_url: p.image_url, kind: "product" });
              toast.success(name);
            }}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            <ShoppingBag className="w-4 h-4 mr-1" /> {t("shop.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}