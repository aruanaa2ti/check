import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/politica")({
  head: () => ({
    meta: [
      { title: "a2 Soluções em T.I." },
      { name: "description", content: "Política de Privacidade da A2 Soluções em T.I. sobre cookies, dados de contato, ferramentas e área do cliente." },
    ],
  }),
  component: PoliticaPage,
});

const sections = [
  {
    title: "Coleta de informações",
    text: "Podemos coletar informações fornecidas voluntariamente por você em contatos por telefone, WhatsApp, e-mail, formulários e na área do cliente, como nome, e-mail, telefone, empresa e dados necessários para atendimento.",
  },
  {
    title: "Cookies",
    text: "Utilizamos cookies e recursos semelhantes para melhorar a navegação, memorizar preferências e entender o uso do site. Você pode bloquear cookies nas configurações do seu navegador, mas algumas funcionalidades podem ser afetadas.",
  },
  {
    title: "Ferramentas do site",
    text: "Ferramentas como Meu IP, Gerador de Senha e Downloads são oferecidas para conveniência. O Gerador de Senha opera localmente no navegador. A ferramenta Meu IP pode consultar APIs públicas para exibir informações aproximadas de conexão.",
  },
  {
    title: "Uso dos dados",
    text: "Os dados são usados para responder solicitações, prestar suporte, administrar serviços contratados, manter a segurança da operação e melhorar nossos canais digitais.",
  },
  {
    title: "Compartilhamento",
    text: "Não vendemos dados pessoais. Podemos compartilhar informações quando necessário para operação dos serviços, cumprimento de obrigações legais, segurança, prevenção a fraudes ou atendimento contratado.",
  },
  {
    title: "Segurança",
    text: "Adotamos medidas técnicas e administrativas para proteger informações contra acessos não autorizados, perda, alteração ou divulgação indevida.",
  },
  {
    title: "Direitos do titular",
    text: "Você pode solicitar acesso, correção, atualização ou exclusão de dados pessoais, observadas obrigações legais e contratuais aplicáveis.",
  },
  {
    title: "Contato",
    text: "Para dúvidas sobre esta política ou sobre o tratamento de dados, entre em contato pelo e-mail contato@a2ti.com.br.",
  },
];

function PoliticaPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-gradient-hero py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Privacidade</div>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entenda como a A2 Soluções em T.I. trata informações, cookies e dados relacionados aos nossos canais digitais.
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-glow sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Resumo</h2>
                <p className="text-sm text-muted-foreground">Última atualização: junho de 2026.</p>
              </div>
            </div>

            <div className="space-y-5">
              {sections.map((section) => (
                <section key={section.title} className="rounded-xl border border-border bg-secondary/40 p-4">
                  <h3 className="font-semibold">{section.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.text}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
