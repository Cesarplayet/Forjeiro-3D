import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { z } from "zod";
import { lovable } from "@/integrations/lovable/index";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
  name: z.string().trim().min(1).max(100).optional(),
});

export default function AuthPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav("/", { replace: true }); }, [user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name: mode === "signup" ? name : undefined });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success(t("auth.signup") + " ✓");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally { setLoading(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <div className="container max-w-md py-16">
        <Card className="p-8 shadow-elegant">
          <h1 className="font-display text-3xl font-bold mb-6">
            {mode === "signin" ? t("auth.signin") : t("auth.signup")}
          </h1>

          <Button variant="outline" className="w-full mb-4" onClick={google} type="button">
            {t("auth.google")}
          </Button>
          <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
            <span className="flex-1 h-px bg-border" />{t("auth.or")}<span className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div><Label>{t("auth.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
              </div>
            )}
            <div><Label>{t("auth.email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div><Label>{t("auth.password")}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} maxLength={72} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
              {mode === "signin" ? t("auth.signin") : t("auth.signup")}
            </Button>
          </form>

          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 text-sm text-primary hover:underline w-full text-center">
            {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
          </button>
        </Card>
      </div>
    </div>
  );
}