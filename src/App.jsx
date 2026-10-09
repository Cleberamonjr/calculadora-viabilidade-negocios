import React, { useEffect, useMemo, useState } from "react";
import { b2c, saas, b2b, brl, pct, n, score, label } from "./calculations";
import { scenarios } from "./scenarios";

const initial = {
  b2c: { price: 89, cost: 18, freight: 6, taxes: 5, packaging: 3, commission: 5, payment: 3, cac: 22, returnRate: 0.03, discount: 0.04, avgTicket: 129, orders: 180, pieces: 1.5, repurchase: 1.8, operating: 4500, initialInvestment: 12000, initialStock: 300, minimumStock: 80 },
  saas: { price: 39.9, free: 100, paying: 80, cac: 70, infra: 2.5, support: 4, fixed: 3500, development: 18000, growth: 10, churn: 4, activation: 65, publish: 55, share: 60, sales: 45 },
  b2b: { cost: 18, freight: 4, taxes: 3, customs: 2, storage: 1, packaging: 1, losses: 1.5, operating: 7000, price: 39.9, discount: 5, commission: 2, ticketClients: 80, orders: 90, supplierTerm: 30, stockDays: 45, customerTerm: 30, initialStock: 700, minimumStock: 250, safetyStock: 150, capital: 30000, initialInvestment: 25000, cac: 120 },
  market: { niche: "", target: "B2C e B2B", region: "", differentiation: "" }
};

const names = {
  price: "Preço", cost: "Custo da peça", freight: "Frete", taxes: "Impostos", packaging: "Embalagem",
  commission: "Comissão", payment: "Taxa de pagamento", cac: "CAC", avgTicket: "Ticket médio",
  orders: "Pedidos / mês", pieces: "Peças / pedido", operating: "Custo operacional / mês",
  initialInvestment: "Investimento inicial", initialStock: "Estoque inicial", minimumStock: "Estoque mínimo",
  free: "Usuários gratuitos", paying: "Usuários pagantes", infra: "Infra / usuário", support: "Suporte / usuário",
  fixed: "Custo fixo / mês", development: "Investimento desenvolvimento", growth: "Crescimento mensal %",
  churn: "Churn mensal %", activation: "Ativação %", publish: "Publicação catálogo %",
  share: "Compartilhamento %", sales: "Usuários que vendem %", customs: "Desembaraço",
  storage: "Armazenagem", losses: "Perdas", discount: "Desconto médio %",
  ticketClients: "Ticket médio / cliente", supplierTerm: "Prazo fornecedor (dias)",
  stockDays: "Dias de estoque", customerTerm: "Prazo cliente (dias)", safetyStock: "Estoque de segurança",
  capital: "Capital disponível"
};

const money = new Set([
  "price","cost","freight","taxes","packaging","commission","payment","cac","avgTicket",
  "operating","initialInvestment","infra","support","fixed","development","customs","storage",
  "losses","ticketClients","capital"
]);

function Field({ name, value, onChange, text = false }) {
  return (
    <label className="field">
      <span>{names[name] || name}</span>
      {text ? (
        <textarea value={value || ""} onChange={e => onChange(e.target.value)} />
      ) : (
        <div className="input">
          {money.has(name) && <b>R$</b>}
          <input
            type="number"
            step={money.has(name) ? "0.01" : "1"}
            value={value ?? 0}
            onChange={e => onChange(Number(e.target.value))}
          />
        </div>
      )}
    </label>
  );
}

function Card({ title, value, sub }) {
  return <div className="card"><small>{title}</small><strong>{value}</strong>{sub && <em>{sub}</em>}</div>;
}

function ResultCards({ result }) {
  const labels = {
    unit: "Custo unitário", contribution: "Contribuição", margin: "Margem",
    revenue: "Receita / mês", profit: "Lucro / mês", ltv: "LTV", ltvCac: "LTV / CAC",
    mrr: "MRR", arr: "ARR", gross: "Margem bruta", operating: "Resultado operacional",
    l2c: "LTV / CAC", be: "Ponto de equilíbrio", landed: "Custo posto", working: "Capital no ciclo",
    capital: "Capital necessário", roi: "ROI anual", payback: "Payback"
  };
  return (
    <div className="grid four">
      {Object.entries(result)
        .filter(([key]) => labels[key])
        .map(([key, value]) => {
          let display = typeof value === "number" ? brl(value) : value;
          if (key === "margin" || key === "roi") display = pct(value);
          if (key === "ltvCac" || key === "l2c") display = value.toFixed(1) + "x";
          if (key === "payback" || key === "be") display = value === Infinity ? "—" : value.toFixed(1) + (key === "be" ? " un." : " meses");
          return <Card key={key} title={labels[key]} value={display} />;
        })}
    </div>
  );
}

function Engine({ title, description, data, update, result, fields }) {
  return (
    <>
      <section className="hero"><div><i>MOTOR INDEPENDENTE</i><h2>{title}</h2><p>{description}</p></div></section>
      <section className="panel"><h3>Premissas</h3><div className="fields">
        {fields.map(key => <Field key={key} name={key} value={data[key]} onChange={v => update(key, v)} />)}
      </div></section>
      <ResultCards result={result} />
    </>
  );
}

export default function App() {
  const [data, setData] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("viab-data"));
      if (!saved || typeof saved !== "object") return initial;
      // Merge saved values with the current schema so older browser data cannot
      // leave a required section or calculation field undefined.
      return Object.fromEntries(
        Object.entries(initial).map(([section, defaults]) => [
          section,
          { ...defaults, ...(saved[section] && typeof saved[section] === "object" ? saved[section] : {}) }
        ])
      );
    } catch {
      return initial;
    }
  });
  const [tab, setTab] = useState("dashboard");
  const [scenario, setScenario] = useState("BASE");

  useEffect(() => { localStorage.setItem("viab-data", JSON.stringify(data)); }, [data]);

  const B = useMemo(() => b2c(data.b2c), [data.b2c]);
  const S = useMemo(() => saas(data.saas), [data.saas]);
  const A = useMemo(() => b2b(data.b2b), [data.b2b]);

  const scores = {
    b2c: score({ margin: B.margin, ltvCac: B.ltvCac, payback: B.payback, capital: B.capital, working: 0, recurrence: data.b2c.repurchase * 20, breakEven: B.breakEven, risk: 20 }),
    saas: score({ margin: S.mrr ? S.gross / S.mrr : 0, ltvCac: S.l2c, payback: data.saas.cac / Math.max(1, data.saas.price), capital: data.saas.development, working: 0, recurrence: 80, breakEven: S.be, risk: data.saas.churn > 8 ? 45 : 15 }),
    b2b: score({ margin: A.margin, ltvCac: 1, payback: A.payback, capital: A.capital, working: A.working, recurrence: 70, breakEven: A.be, risk: A.stock > 3000 ? 40 : 20 })
  };

  const resetData = () => {
    const cleared = Object.fromEntries(
      Object.entries(initial).map(([section, fields]) => [
        section,
        Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, typeof value === "number" ? 0 : ""])
        )
      ])
    );
    setData(cleared);
    setScenario("BASE");
  };

  const update = (section, field, value) => setData(d => ({ ...d, [section]: { ...d[section], [field]: value } }));

  const applyScenario = key => {
    setScenario(key);
    const m = scenarios[key];
    setData(d => ({
      ...d,
      b2c: { ...d.b2c, price: d.b2c.price * m.price, cost: d.b2c.cost * m.cost, cac: d.b2c.cac * m.cac, avgTicket: d.b2c.avgTicket * m.ticket, orders: Math.round(d.b2c.orders * m.volume), repurchase: d.b2c.repurchase * m.repurchase },
      saas: { ...d.saas, cac: d.saas.cac * m.cac, churn: d.saas.churn * m.churn, growth: d.saas.growth * m.volume },
      b2b: { ...d.b2b, price: d.b2b.price * m.price, cost: d.b2b.cost * m.cost, orders: Math.round(d.b2b.orders * m.volume) }
    }));
  };

  let content;

  if (tab === "b2c") {
    content = <Engine title="B2C · Venda direta" description="Altere uma premissa e observe o impacto financeiro imediatamente." data={data.b2c} update={(f,v) => update("b2c",f,v)} result={B} fields={["price","cost","freight","taxes","packaging","commission","payment","cac","avgTicket","orders","pieces","operating","initialInvestment","initialStock","minimumStock"]} />;
  } else if (tab === "saas") {
    content = <Engine title="SaaS · Catálogo para revendedores" description="Modele aquisição, recorrência, churn, infraestrutura e ponto de equilíbrio." data={data.saas} update={(f,v) => update("saas",f,v)} result={S} fields={["price","free","paying","cac","infra","support","fixed","development","growth","churn","activation","publish","share","sales"]} />;
  } else if (tab === "b2b") {
    content = <Engine title="LADO A · Distribuição B2B" description="Modele custo posto, estoque, ciclo financeiro e necessidade de capital." data={data.b2b} update={(f,v) => update("b2b",f,v)} result={A} fields={["cost","freight","taxes","customs","storage","packaging","losses","operating","price","discount","commission","ticketClients","orders","supplierTerm","stockDays","customerTerm","initialStock","minimumStock","safetyStock","capital","initialInvestment","cac"]} />;
  } else if (tab === "capital") {
    const days = n(data.b2b.supplierTerm) + n(data.b2b.stockDays) + n(data.b2b.customerTerm);
    const need = Math.max(B.revenue, A.revenue) / 30 * days;
    content = <>
      <section className="hero"><div><i>CICLO FINANCEIRO</i><h2>Capital de giro</h2><p>Compra → estoque → venda → recebimento → reposição.</p></div></section>
      <div className="flow">{["CAPITAL INVESTIDO","ESTOQUE","VENDA","RECEBIMENTO","REPOSIÇÃO"].map(x => <b key={x}>{x}</b>)}</div>
      <div className="grid three"><Card title="Ciclo financeiro" value={days + " dias"} /><Card title="Receita-base mensal" value={brl(Math.max(B.revenue,A.revenue))} /><Card title="Capital de giro estimado" value={brl(need)} /></div>
      <section className="panel"><h3>Leitura</h3><p>Faturamento não é caixa. Quanto maior o ciclo entre pagamento ao fornecedor e recebimento do cliente, maior a reserva necessária para crescer.</p></section>
    </>;
  } else if (tab === "mercado") {
    content = <>
      <section className="hero"><div><i>INTELIGÊNCIA DE MERCADO</i><h2>Mercado & IA</h2><p>O índice abaixo é uma estimativa interna de viabilidade, não uma probabilidade estatística de sucesso.</p></div></section>
      <section className="panel"><h3>Contexto do negócio</h3><div className="fields">
        <Field name="Nicho" value={data.market.niche} text onChange={v => update("market","niche",v)} />
        <Field name="Público / modelo" value={data.market.target} text onChange={v => update("market","target",v)} />
        <Field name="Estado / região" value={data.market.region} text onChange={v => update("market","region",v)} />
        <Field name="Diferenciação" value={data.market.differentiation} text onChange={v => update("market","differentiation",v)} />
      </div></section>
      <div className="grid three">
        <Card title="Índice B2C" value={scores.b2c + "/100"} sub={label(scores.b2c)} />
        <Card title="Índice SaaS" value={scores.saas + "/100"} sub={label(scores.saas)} />
        <Card title="Índice B2B" value={scores.b2b + "/100"} sub={label(scores.b2b)} />
      </div>
      <section className="panel"><h3>Próxima camada</h3><p>A análise de mercado deve consultar fontes externas e devolver concorrentes, tendências, regiões, data da pesquisa, fontes e nível de confiança. Chaves de API não devem ficar no JavaScript público do GitHub Pages.</p></section>
    </>;
  } else {
    const ranking = [["B2C",scores.b2c],["SaaS",scores.saas],["B2B",scores.b2b]].sort((a,b) => b[1] - a[1]);
    content = <>
      <section className="hero">
        <div><i>DECISÃO EMPRESARIAL</i><h2>Qual motor merece capital primeiro?</h2><p>Compare margem, caixa, recorrência, risco e capital. Receita alta, sozinha, não determina viabilidade.</p></div>
        <label className="scenario">Cenário<select value={scenario} onChange={e => applyScenario(e.target.value)}>{Object.keys(scenarios).map(k => <option key={k} value={k}>{k}</option>)}</select></label>
      </section>
      <div className="grid three">
        <Card title="B2C · Receita / mês" value={brl(B.revenue)} sub={"Score " + scores.b2c + " · " + label(scores.b2c)} />
        <Card title="SaaS · MRR" value={brl(S.mrr)} sub={"Score " + scores.saas + " · " + label(scores.saas)} />
        <Card title="B2B · Receita / mês" value={brl(A.revenue)} sub={"Score " + scores.b2b + " · " + label(scores.b2b)} />
      </div>
      <section className="panel"><h3>Comparativo</h3>
        {[
          ["B2C",scores.b2c,B.margin,B.capital,B.ltvCac],
          ["SaaS",scores.saas,S.mrr ? S.gross/S.mrr : 0,data.saas.development,S.l2c],
          ["B2B",scores.b2b,A.margin,A.capital,A.payback]
        ].map(r => <div className="row" key={r[0]}><b>{r[0]}</b><strong>{r[1]}</strong><span>Margem {pct(r[2])}</span><span>Capital {brl(r[3])}</span><span>{r[0] === "B2B" ? "Payback " + (r[4] === Infinity ? "—" : r[4].toFixed(1) + " meses") : "LTV/CAC " + r[4].toFixed(1) + "x"}</span></div>)}
      </section>
      <section className="panel"><h3>Recomendação</h3><p>{ranking[0][0]} apresenta o maior índice nas premissas atuais ({ranking[0][1]}/100). Valide margem, CAC, recompra/churn e capital necessário antes de investir.</p></section>
    </>;
  }

  return <>
    <header><div><i>DECISÃO EMPRESARIAL</i><h1>Calculadora de <b>Viabilidade</b></h1><p>B2C · SaaS · B2B</p></div><button onClick={resetData}>Zerar dados</button></header>
    <nav>{[["dashboard","Visão empresarial"],["b2c","B2C"],["saas","SaaS"],["b2b","LADO A · B2B"],["capital","Capital de giro"],["mercado","Mercado & IA"]].map(([key,text]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{text}</button>)}</nav>
    <main>{content}</main>
    <footer>Índice 0–100 baseado nas premissas informadas. Não representa probabilidade estatística. Dados salvos localmente.</footer>
  </>;
}
