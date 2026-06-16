import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Sparkles, Truck, Wrench, Loader2, ShoppingBag } from "lucide-react";

export default function MiniMe() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { add } = useCart();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [req, setReq] = useState<Req | null>(null);
  const [size, setSize] = useState(15);
  const [cep, setCep] = useState("");
  const [shipping, setShipping] = useState<number | null>(null);
  const [supportNotes, setSupportNotes] = useState("");
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("mini_me_requests")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setReq(data[0] as any); });
  }, [user]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []).slice(0, 3);
    setFiles(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  }

  async function generate() {
    if (!user) { nav("/auth"); return; }
    if (files.length <= 0) { toast.error(t("minime.subtitle")); return; }
    setBusy(true);
    try {
      // Create request
      const { data: created, error: e1 } = await supabase
        .from("mini_me_requests")
        .insert({ user_id: user.id, status: "uploading", size_cm: size })
        .select().single();
      if (e1) throw e1;

      // Upload photos
      const paths: string[] = [];
      for (const f of files) {
        const path = `${user.id}/${created.id}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("mini-me-photos").upload(path, f);
        if (error) throw error;
        paths.push(path);
      }

      // Mark as processing & save paths
      await supabase.from("mini_me_requests").update({ photo_paths: paths, status: "processing" }).eq("id", created.id);
      // const { data, error } = await supabase.functions.invoke("generate-preview", {
      //   body: {
      //     test: true
      //   }
      // });
      // console.log("DATA:", data);
      // console.log("ERROR:", error);

      // Call Hunyuan 3D API
      const response = await fetch(
        "https://ibwjccnivacwluppnfft.supabase.co/functions/v1/hyper-api",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlid2pjY25pdmFjd2x1cHBuZmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODY2OTAsImV4cCI6MjA5MzY2MjY5MH0.28Rirq3NBh9aiRMP3D-DzdrXvsPIY-HGFYe7Gm7i1KM"
          },
          body: JSON.stringify({
            requestId: created.id,
            photoPaths: paths
          })
        }
      );

      const fn2 = await response.json();
      console.log(fn2.preview_image_url);

      await supabase
        .from("mini_me_requests")
        .update({
          preview_image_url: fn2.preview_image_url,
          status: "preview_ready"
        })
        .eq("id", created.id);

      let preview = previews[0];
      if (fn2 && fn2.preview_image_url) preview = fn2.preview_image_url;

      await supabase.from("mini_me_requests").update({
        status: "preview_ready", preview_image_url: preview,
      }).eq("id", created.id);

      const { data: updated } = await supabase.from("mini_me_requests").select("*").eq("id", created.id).single();
      setReq(updated as any);
      toast.success("✨");
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  }

  async function calcShipping() {
    if (!cep || cep.length < 8) { toast.error("CEP"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("calc-shipping", {
        body: { cep, weight_g: Math.max(50, size * 8), service: "minime" },
      });
      if (error) throw error;
      setShipping(data.fee);
      toast.success(`R$ ${data.fee.toFixed(2)} • ${data.estimate}`);
    } catch (err: any) {
      // Fallback: simple estimate
      const fee = 25 + size * 0.8;
      setShipping(fee);
      toast.message(`R$ ${fee.toFixed(2)}`);
    } finally { setBusy(false); }
  }

  function addMiniMeToCart() {
    if (!req) return;
    const price = 199 + size * 8;
    add({
      id: `minime-${req.id}`,
      name: `Mini-Me ${size}cm`,
      price, image_url: req.preview_image_url,
      kind: "minime", meta: { requestId: req.id, size },
    });
    nav("/cart");
  }

  async function sendSupport() {
    if (!req || !supportNotes.trim()) return;
    await supabase.from("mini_me_requests").update({
      status: "support_requested", support_notes: supportNotes,
    }).eq("id", req.id);
    toast.success("✓");
    setShowSupport(false);
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" /> {t("minime.title")}
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-4">{t("minime.title")}</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">{t("minime.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">{t("minime.upload")}</h2>
            <p className="text-sm text-muted-foreground">{t("minime.tip")}</p>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary transition-smooth"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm">{files.length > 0 ? `${files.length} / 3` : t("minime.upload")}</p>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={pick} className="hidden" />
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {previews.map((p, i) => <img key={i} src={p} className="aspect-square object-cover rounded-lg" alt="" />)}
              </div>
            )}

            <div>
              <Label className="text-sm">{t("minime.size")}: <strong>{size} cm</strong></Label>
              <Slider value={[size]} min={10} max={30} step={1} onValueChange={(v) => setSize(v[0])} className="mt-2" />
            </div>

            <Button onClick={generate} disabled={busy || files.length < 0} className="w-full bg-gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t("minime.generate")}
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">{t("minime.preview")}</h2>
            <div className="aspect-square rounded-2xl bg-gradient-hero grid place-items-center overflow-hidden">
              {req?.preview_image_url ? (
                <img src={req.preview_image_url} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground p-6">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">—</p>
                </div>
              )}
            </div>

            {req && (
              <>
                <div className="flex gap-2">
                  <Input placeholder={t("cart.cep")} value={cep} onChange={(e) => setCep(e.target.value)} maxLength={9} />
                  <Button variant="outline" onClick={calcShipping} disabled={busy}>
                    <Truck className="w-4 h-4 mr-1" /> {t("minime.shipping")}
                  </Button>
                </div>
                {shipping !== null && (
                  <div className="text-sm text-muted-foreground">
                    {t("cart.shipping")}: <strong className="text-foreground">R$ {shipping.toFixed(2)}</strong>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={addMiniMeToCart} className="flex-1 bg-primary text-primary-foreground">
                    <ShoppingBag className="w-4 h-4 mr-2" /> R$ {(199 + size * 8).toFixed(2)}
                  </Button>
                  <Button variant="outline" onClick={() => setShowSupport((s) => !s)}>
                    <Wrench className="w-4 h-4 mr-1" /> {t("minime.support")}
                  </Button>
                </div>

                {showSupport && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Textarea
                      placeholder={t("minime.notes")} value={supportNotes}
                      onChange={(e) => setSupportNotes(e.target.value)} maxLength={500}
                    />
                    <Button size="sm" onClick={sendSupport} disabled={!supportNotes.trim()}>
                      {t("minime.send")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}