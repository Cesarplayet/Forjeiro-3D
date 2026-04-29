import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "pt" | "en";

type Dict = Record<string, { pt: string; en: string }>;

const dict: Dict = {
  "nav.home": { pt: "Início", en: "Home" },
  "nav.shop": { pt: "Loja", en: "Shop" },
  "nav.minime": { pt: "Mini-Me", en: "Mini-Me" },
  "nav.orders": { pt: "Pedidos", en: "Orders" },
  "nav.login": { pt: "Entrar", en: "Sign in" },
  "nav.signup": { pt: "Criar conta", en: "Sign up" },
  "nav.logout": { pt: "Sair", en: "Sign out" },
  "nav.cart": { pt: "Carrinho", en: "Cart" },

  "hero.tag": { pt: "Impressão 3D sob medida", en: "Custom 3D printing" },
  "hero.title": { pt: "Suas ideias, impressas em 3D.", en: "Your ideas, printed in 3D." },
  "hero.subtitle": { pt: "Produtos para games, cozinha, decoração e até uma versão mini de você mesmo.", en: "Products for games, kitchen, decor — even a mini version of yourself." },
  "hero.cta": { pt: "Explorar a loja", en: "Browse the shop" },
  "hero.minime": { pt: "Criar meu Mini-Me", en: "Create my Mini-Me" },

  "categories.title": { pt: "Categorias", en: "Categories" },
  "categories.subtitle": { pt: "Encontre o que combina com você", en: "Find what suits you" },

  "shop.title": { pt: "Loja", en: "Shop" },
  "shop.all": { pt: "Tudo", en: "All" },
  "shop.add": { pt: "Adicionar", en: "Add" },
  "shop.empty": { pt: "Nenhum produto nesta categoria.", en: "No products in this category." },

  "cart.title": { pt: "Seu carrinho", en: "Your cart" },
  "cart.empty": { pt: "Carrinho vazio", en: "Cart is empty" },
  "cart.subtotal": { pt: "Subtotal", en: "Subtotal" },
  "cart.shipping": { pt: "Frete", en: "Shipping" },
  "cart.total": { pt: "Total", en: "Total" },
  "cart.cep": { pt: "CEP", en: "ZIP" },
  "cart.calc": { pt: "Calcular frete", en: "Calculate shipping" },
  "cart.checkout": { pt: "Finalizar pedido", en: "Place order" },
  "cart.remove": { pt: "Remover", en: "Remove" },
  "cart.coupon": { pt: "Cupom", en: "Coupon" },
  "cart.couponApply": { pt: "Aplicar", en: "Apply" },
  "cart.couponApplied": { pt: "Cupom aplicado", en: "Coupon applied" },
  "cart.couponInvalid": { pt: "Cupom inválido", en: "Invalid coupon" },
  "cart.discount": { pt: "Desconto", en: "Discount" },

  "minime.title": { pt: "Mini-Me 3D", en: "3D Mini-Me" },
  "minime.subtitle": { pt: "Envie 3 a 5 fotos para gerar uma versão 3D de você.", en: "Upload 3–5 photos to generate a 3D version of yourself." },
  "minime.upload": { pt: "Enviar fotos", en: "Upload photos" },
  "minime.generate": { pt: "Gerar prévia 3D", en: "Generate 3D preview" },
  "minime.preview": { pt: "Prévia", en: "Preview" },
  "minime.size": { pt: "Tamanho (cm)", en: "Size (cm)" },
  "minime.shipping": { pt: "Simular frete", en: "Simulate shipping" },
  "minime.support": { pt: "Solicitar ajustes", en: "Request adjustments" },
  "minime.notes": { pt: "Descreva o que gostaria de ajustar", en: "Describe what you'd like adjusted" },
  "minime.send": { pt: "Enviar solicitação", en: "Send request" },
  "minime.processing": { pt: "Processando seu modelo...", en: "Processing your model..." },
  "minime.tip": { pt: "Dica: fotos frontais e laterais com boa iluminação dão o melhor resultado.", en: "Tip: front and side photos with good lighting give the best results." },

  "auth.signin": { pt: "Entrar", en: "Sign in" },
  "auth.signup": { pt: "Criar conta", en: "Create account" },
  "auth.email": { pt: "E-mail", en: "Email" },
  "auth.password": { pt: "Senha", en: "Password" },
  "auth.name": { pt: "Nome completo", en: "Full name" },
  "auth.google": { pt: "Continuar com Google", en: "Continue with Google" },
  "auth.or": { pt: "ou", en: "or" },
  "auth.haveAccount": { pt: "Já tem conta? Entrar", en: "Have an account? Sign in" },
  "auth.noAccount": { pt: "Não tem conta? Criar agora", en: "No account? Sign up" },

  "orders.title": { pt: "Meus pedidos", en: "My orders" },
  "orders.empty": { pt: "Nenhum pedido ainda.", en: "No orders yet." },

  "common.loading": { pt: "Carregando...", en: "Loading..." },
  "common.back": { pt: "Voltar", en: "Back" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "pt");
  useEffect(() => { localStorage.setItem("lang", lang); document.documentElement.lang = lang; }, [lang]);
  const t = (k: keyof typeof dict) => dict[k]?.[lang] ?? String(k);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}