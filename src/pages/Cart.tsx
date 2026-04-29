import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Cart() {
  const { t } = useI18n();
  const { items, remove, setQty, subtotal, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [cep, setCep] = useState("");
  const [shipping, setShipping] = useState(0);
  const [busy, setBusy] = useState(false);

  const total = subtotal + shipping;

  async function calc() {
    if (cep.length < 8) { toast.error("CEP"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("calc-shipping", {
        body: { cep, weight_g: items.length * 200 },
      });
      if (error) throw error;
      setShipping(data.fee);
    } catch {
      setShipping(20 + items.length * 5);
    } finally { setBusy(false); }
  }

  async function checkout() {
    if (!user) { nav("/auth"); return; }
    if (items.length === 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        items: items as any,
        subtotal, shipping_fee: shipping, total,
        cep, status: "pending",
      });
      if (error) throw error;
      clear();
      toast.success("✓");
      nav("/orders");
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 max-w-4xl">
        <h1 className="font-display text-4xl font-bold mb-6">{t("cart.title")}</h1>
        {items.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">{t("cart.empty")}</Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              {items.map((i) => (
                <Card key={i.id} className="p-4 flex items-center gap-4">
                  {i.image_url && <img src={i.image_url} className="w-16 h-16 rounded-lg object-cover" alt="" />}
                  <div className="flex-1">
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-muted-foreground">R$ {i.price.toFixed(2)}</div>
                  </div>
                  <Input type="number" min={1} value={i.quantity} onChange={(e) => setQty(i.id, parseInt(e.target.value) || 1)} className="w-16" />
                  <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>

            <Card className="p-6 h-fit space-y-4">
              <div className="flex gap-2">
                <Input placeholder={t("cart.cep")} value={cep} onChange={(e) => setCep(e.target.value)} maxLength={9} />
                <Button variant="outline" onClick={calc} disabled={busy}>
                  <Truck className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>{t("cart.subtotal")}</span><span>R$ {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>{t("cart.shipping")}</span><span>R$ {shipping.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border mt-2"><span>{t("cart.total")}</span><span>R$ {total.toFixed(2)}</span></div>
              </div>
              <Button onClick={checkout} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
                {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {t("cart.checkout")}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}