import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function Orders() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/auth"); return; }
    supabase.from("orders").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data || []));
  }, [user, loading, nav]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 max-w-4xl">
        <h1 className="font-display text-4xl font-bold mb-6">{t("orders.title")}</h1>
        {orders.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">{t("orders.empty")}</Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id} className="p-5 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                  <div className="font-medium mt-1">{(o.items as any[]).length} item(s) • R$ {Number(o.total).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <Badge variant="outline" className="capitalize">{o.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}