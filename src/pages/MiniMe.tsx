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

type MiniMeRequest = {
  id: string;
  photo_paths: string[];
  preview_image_url: string | null;
  status: string;
};

const previewTaskKey = (requestId: string) => `mini-me-preview-task:${requestId}`;
const loadingPreviewUrl = "/Forjeiro-Carregando.gif";
const minMiniMeSize = 10;
const maxPreviewSize = 22;
const minPreviewPrice = 120;
const maxPreviewPrice = 500;

function calculateMiniMePrice(sizeCm: number) {
  const normalizedSize = Math.min(Math.max(sizeCm, minMiniMeSize), maxPreviewSize);
  const minVolume = minMiniMeSize ** 3;
  const maxVolume = maxPreviewSize ** 3;
  const currentVolume = normalizedSize ** 3;
  const ratio = (currentVolume - minVolume) / (maxVolume - minVolume);

  return Math.round(minPreviewPrice + ratio * (maxPreviewPrice - minPreviewPrice));
}

export default function MiniMe() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { add } = useCart();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [req, setReq] = useState<MiniMeRequest | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const [pollingPreview, setPollingPreview] = useState(false);
  const [size, setSize] = useState(15);
  const [cep, setCep] = useState("");
  const [shipping, setShipping] = useState<number | null>(null);
  const [modelNotes, setModelNotes] = useState("");
  const [supportNotes, setSupportNotes] = useState("");
  const [showSupport, setShowSupport] = useState(false);
  const previewReady = req?.status === "preview_ready" && Boolean(req.preview_image_url);
  const waitingPreview = busy || pollingPreview || req?.status === "processing";
  const previewActionLocked = busy || pollingPreview || waitingPreview;
  const miniMePrice = previewReady ? calculateMiniMePrice(size) : 0;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("mini_me_requests")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const latest = data[0] as MiniMeRequest;
          setReq(latest);
          setPreviewTaskId(localStorage.getItem(previewTaskKey(latest.id)));
        }
      });
  }, [user]);

  useEffect(() => {
    if (!req || !previewTaskId || !waitingPreview || busy || pollingPreview) return;

    const timeout = window.setTimeout(() => {
      void fetchPreviewResult(req, previewTaskId);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [req, previewTaskId, waitingPreview, busy, pollingPreview]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || [])
      .filter((file) => file.type === "image/jpeg" || file.type === "image/png" || /\.(jpe?g|png)$/i.test(file.name))
      .slice(0, 3);
    if ((e.target.files?.length || 0) > 0 && list.length === 0) {
      toast.error("Use uma imagem JPG, JPEG ou PNG.");
      return;
    }
    setFiles(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
    setReq(null);
    setPreviewTaskId(null);
  }

  function uploadName(file: File, index: number) {
    const ext = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name) ? "jpg" : "png";
    return `${Date.now()}-${index}.${ext}`;
  }

  async function refreshAuthSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      throw new Error("Sua sessao expirou. Entre novamente para continuar.");
    }
  }

  async function handleGenerateError(err: any) {
    const message = err?.message || String(err);
    const lower = message.toLowerCase();
    if (lower.includes("jwt") && lower.includes("expired")) {
      await supabase.auth.signOut();
      toast.error("Sua sessao expirou. Entre novamente para continuar.");
      nav("/auth");
      return;
    }
    toast.error(message);
  }

  async function fetchPreviewResult(request: MiniMeRequest, taskId: string) {
    setPollingPreview(true);
    try {
      await refreshAuthSession();
      const { data: generated, error: fnError } = await supabase.functions.invoke("generate-preview", {
        body: {
          requestId: request.id,
          photoPaths: request.photo_paths,
          sizeCm: size,
          notes: modelNotes,
          providerTaskId: taskId,
        },
      });

      if (fnError) {
        const details = (fnError as any)?.context?.error ?? (fnError as any)?.context?.message;
        throw new Error(details || fnError.message);
      }
      if (generated?.error) throw new Error(generated.error);
      if (generated?.provider_task_id) {
        localStorage.setItem(previewTaskKey(request.id), generated.provider_task_id);
        setPreviewTaskId(generated.provider_task_id);
      }
      if (generated?.preview_image_url) {
        localStorage.removeItem(previewTaskKey(request.id));
        setPreviewTaskId(null);
      }

      const { data: updated } = await supabase.from("mini_me_requests").select("*").eq("id", request.id).single();
      setReq({
        ...(updated as MiniMeRequest),
        preview_image_url: generated?.preview_image_url ?? updated?.preview_image_url ?? null,
      });
      if (!generated?.pending) toast.success("Preview gerada.");
    } catch (err: any) {
      await handleGenerateError(err);
    } finally {
      setPollingPreview(false);
    }
  }

  async function generate() {
    if (!user) { nav("/auth"); return; }
    if (waitingPreview || previewReady) return;
    if (files.length <= 0) { toast.error(t("minime.subtitle")); return; }
    setBusy(true);
    try {
      await refreshAuthSession();
      // Create request
      const { data: created, error: e1 } = await supabase
        .from("mini_me_requests")
        .insert({ user_id: user.id, status: "uploading", size_cm: size })
        .select().single();
      if (e1) throw e1;

      // Upload photos
      const paths: string[] = [];
      for (const [index, f] of files.entries()) {
        const path = `${user.id}/${created.id}/${uploadName(f, index)}`;
        const { error } = await supabase.storage.from("mini-me-photos").upload(path, f, {
          contentType: f.type,
        });
        if (error) throw error;
        paths.push(path);
      }

      await supabase
        .from("mini_me_requests")
        .update({ photo_paths: paths, status: "processing" })
        .eq("id", created.id);
      setReq({
        ...(created as MiniMeRequest),
        photo_paths: paths,
        preview_image_url: null,
        status: "processing",
      });

      const { data: generated, error: fnError } = await supabase.functions.invoke("generate-preview", {
        body: {
          requestId: created.id,
          photoPaths: paths,
          sizeCm: size,
          notes: modelNotes,
        },
      });

      if (fnError) {
        const details = (fnError as any)?.context?.error ?? (fnError as any)?.context?.message;
        throw new Error(details || fnError.message);
      }
      if (generated?.error) throw new Error(generated.error);
      if (generated?.provider_task_id) {
        localStorage.setItem(previewTaskKey(created.id), generated.provider_task_id);
        setPreviewTaskId(generated.provider_task_id);
      }
      if (generated?.preview_image_url) {
        localStorage.removeItem(previewTaskKey(created.id));
        setPreviewTaskId(null);
      }

      const { data: updated } = await supabase.from("mini_me_requests").select("*").eq("id", created.id).single();
      setReq({
        ...(updated as MiniMeRequest),
        preview_image_url: generated?.preview_image_url ?? updated?.preview_image_url ?? null,
      });
      if (fileRef.current) fileRef.current.value = "";
      toast.success(generated?.pending ? t("minime.processing") : "Preview gerada.");
    } catch (err: any) {
      await handleGenerateError(err);
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
    if (!req || !previewReady) return;
    add({
      id: `minime-${req.id}`,
      name: `Mini-Me ${size}cm`,
      price: miniMePrice, image_url: req.preview_image_url,
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
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                multiple
                onChange={pick}
                className="hidden"
              />
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {previews.map((p, i) => <img key={i} src={p} className="aspect-square object-cover rounded-lg" alt="" />)}
              </div>
            )}

            <div>
              <Label className="text-sm">{t("minime.size")}: <strong>{size} cm</strong></Label>
              <Slider value={[size]} min={minMiniMeSize} max={maxPreviewSize} step={1} onValueChange={(v) => setSize(v[0])} className="mt-2" />
            </div>

            <div>
              <Label className="text-sm">{t("minime.notes")}</Label>
              <Textarea
                value={modelNotes}
                onChange={(e) => setModelNotes(e.target.value)}
                maxLength={500}
                placeholder="Ex.: manter óculos, camiseta simples, cabelo curto, postura em pé."
                className="mt-2"
              />
            </div>

            <Button onClick={generate} disabled={previewActionLocked || previewReady || files.length === 0} className="w-full bg-gradient-primary text-primary-foreground">
              {previewActionLocked ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {previewActionLocked ? "Carregando previa" : previewReady ? "Previa gerada" : t("minime.generate")}
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">{t("minime.preview")}</h2>
            <div className="aspect-square rounded-2xl bg-gradient-hero grid place-items-center overflow-hidden">
              {req?.preview_image_url ? (
                <img src={req.preview_image_url} alt="preview" className="w-full h-full object-cover" />
              ) : waitingPreview ? (
                <div className="w-full h-full bg-background grid place-items-center p-6">
                  <img src={loadingPreviewUrl} alt={t("minime.processing")} className="max-w-full max-h-full object-contain" />
                </div>
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
                  <Button onClick={addMiniMeToCart} disabled={!previewReady} className="flex-1 bg-primary text-primary-foreground">
                    <ShoppingBag className="w-4 h-4 mr-2" /> R$ {miniMePrice.toFixed(2)}
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
