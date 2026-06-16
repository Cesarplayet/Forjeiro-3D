import { Link, useNavigate } from "react-router-dom";
import { Hexagon, ShoppingBag, User, LogOut, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="container flex items-center justify-between h-16 gap-4">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl tracking-tight">
          <span className="w-9 h-9 clip-hex bg-gradient-primary grid place-items-center shadow-glow">
            <Hexagon className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span>FORJEIRO <span className="font-mono-tech text-primary">3D</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/shop" className="hover:text-primary transition-smooth">{t("nav.shop")}</Link>
          <Link to="/mini-me" className="hover:text-primary transition-smooth">{t("nav.minime")}</Link>
          {user && <Link to="/orders" className="hover:text-primary transition-smooth">{t("nav.orders")}</Link>}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "pt" ? "en" : "pt")}>
            <Languages className="w-4 h-4 mr-1" /> {lang.toUpperCase()}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => nav("/cart")} aria-label={t("nav.cart")} className="relative">
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground">
                {count}
              </Badge>
            )}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><User className="w-5 h-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => nav("/orders")}>{t("nav.orders")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => nav("/auth")} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft">
              {t("nav.login")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}