"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";

// --- Tipos de dados (para o SGP e para o local) ---
type ClienteEndereco = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  ll?: string | null;
};

type ClienteObj = {
  nome?: string | null;
  telefones?: string[] | null;
  email?: string | null;
  plano?: string | null;
  observacao?: string | null;
  contratoId?: string | number | null;
  endereco?: ClienteEndereco | null;
};

type Item = {
  tipo: string; // os | reserva_local
  id: string;
  contrato?: string | null;
  status?: string | null;
  data?: string | null; // YYYY-MM-DD
  hora?: string | null; // HH:mm
  motivo?: string | null;
  responsavel?: string | null; // VT01...
  usuario?: string | null;
  cliente?: ClienteObj | null;
  _internal?: any; // Para dados internos como reservationId
};

type Dia = { data: string; porViatura: Record<string, Item[]> };
type AgendaResp = {
  viaturas: string[];
  dias: Dia[];
  totais?: { os?: number; reservas?: number };
  meta?: any;
};

type FlatItem = Item & { _dia: string; _viatura: string };

type TabKey = "agenda" | "reservar" | "instalacao" | "pagamentos"; // Nova aba!

// --- Tipos para a Ficha de Instalação (localStorage) ---
type InstallStatus = "CRIADO" | "AGENDADO" | "CADASTRADO_SGP" | "FINALIZADO" | "CANCELADO";
type BillingDelivery = "WHATSAPP_EMAIL" | "APP";
type InstallFeePayment = "DINHEIRO" | "PIX" | "CARTAO";

type InstallationData = {
  id: string;
  createdAt: string;
  status: InstallStatus;
  nomeCompleto: string;
  cpf: string;
  nascimento?: string | null;
  contato1: string;
  contato2?: string | null;
  email?: string | null;
  enderecoFull: string;
  referencia?: string | null;
  vencimentoDia: 10 | 20 | 30;
  entregaFatura: BillingDelivery;
  taxaPagamento: InstallFeePayment;
  wifiNome: string;
  wifiSenha: string;
  planoCodigo: string;
  planoNome: string;
  planoMbps?: number | null;
  planoValor?: number | null;
  appsEscolhidos: { category: string; apps: string[] }[]; // Lista de apps estruturada
  criadoPor?: string | null;
  notasInternas?: string | null;
  reservaId?: string | null; // Link para a reserva local
};

// --- Estrutura para os planos e suas opções de apps ---
type AppCategory = "STANDARD" | "ADVANCED" | "TOP" | "PREMIUM";

type PlanAppChoice = {
  category: AppCategory;
  count: number; // Quantos apps podem ser escolhidos desta categoria
  options: string[]; // Lista de apps disponíveis nesta categoria
};

type PlanOption = {
  id: string; // Ex: "A", "B", "UNICA"
  name: string; // Ex: "Opção A", "Formato Único"
  choices: PlanAppChoice[];
};

type Plan = {
  codigo: string;
  nome: string;
  mbps: number;
  valor: number; // em centavos
  options: PlanOption[];
};

// --- Dados dos Planos (detalhado conforme sua especificação) ---
const PLANOS: Plan[] = [
  {
    codigo: "ESSENCIAL_100",
    nome: "Plano Essencial 100",
    mbps: 100,
    valor: 8499,
    options: [{
      id: "UNICA",
      name: "Combo Standard (1 App)",
      choices: [{
        category: "STANDARD",
        count: 1,
        options: [
          "Ubook+", "Estuda+", "Pequenos Leitores", "Looke", "Sky+ Light SVA",
          "PlayKids+", "Kaspersky Standard (1 licença)", "Hub Vantagens",
          "Revistaria", "Fluid", "Social Comics", "QNutri", "Playlist", "Kiddle Pass"
        ]
      }]
    }]
  },
  {
    codigo: "MINI_PLUS_300",
    nome: "Plano Mini Plus 300",
    mbps: 300,
    valor: 10999,
    options: [{
      id: "UNICA",
      name: "Advanced (1 App)",
      choices: [{
        category: "ADVANCED",
        count: 1,
        options: [
          "Deezer", "DocWay", "Sky+ Light com Globo SVA",
          "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
          "HotGo", "Kiddle Pass"
        ]
      }]
    }]
  },
  {
    codigo: "PLUS_300",
    nome: "Plano Plus 300",
    mbps: 300,
    valor: 11999,
    options: [
      {
        id: "A",
        name: "Opção A: Top (1 App)",
        choices: [{
          category: "TOP",
          count: 1,
          options: [
            "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA",
            "Leitura360", "Cindie"
          ]
        }]
      },
      {
        id: "B",
        name: "Opção B: Standard (1 App) + Advanced (1 App)",
        choices: [
          {
            category: "STANDARD",
            count: 1,
            options: [
              "Ubook+", "Estuda+", "Pequenos Leitores", "Looke", "Sky+ Light SVA",
              "PlayKids+", "Kaspersky Standard (1 licença)", "Hub Vantagens",
              "Revistaria", "Fluid", "Social Comics", "QNutri", "Playlist", "Kiddle Pass"
            ]
          },
          {
            category: "ADVANCED",
            count: 1,
            options: [
              "Deezer", "DocWay", "Sky+ Light com Globo SVA",
              "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
              "HotGo", "Kiddle Pass"
            ]
          }
        ]
      }
    ]
  },
  {
    codigo: "ULTRA_500",
    nome: "Plano Ultra 500",
    mbps: 500,
    valor: 14999,
    options: [
      {
        id: "A",
        name: "Opção A: Top (1 App) + Standard (1 App)",
        choices: [
          {
            category: "TOP",
            count: 1,
            options: [
              "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA",
              "Leitura360", "Cindie"
            ]
          },
          {
            category: "STANDARD",
            count: 1,
            options: [
              "Ubook+", "Estuda+", "Pequenos Leitores", "Looke", "Sky+ Light SVA",
              "PlayKids+", "Kaspersky Standard (1 licença)", "Hub Vantagens",
              "Revistaria", "Fluid", "Social Comics", "QNutri", "Playlist", "Kiddle Pass"
            ]
          }
        ]
      },
      {
        id: "B",
        name: "Opção B: Advanced (1 App) + Standard (2 Apps)",
        choices: [
          {
            category: "ADVANCED",
            count: 1,
            options: [
              "Deezer", "DocWay", "Sky+ Light com Globo SVA",
              "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
              "HotGo", "Kiddle Pass"
            ]
          },
          {
            category: "STANDARD",
            count: 2,
            options: [
              "Ubook+", "Estuda+", "Pequenos Leitores", "Looke", "Sky+ Light SVA",
              "PlayKids+", "Kaspersky Standard (1 licença)", "Hub Vantagens",
              "Revistaria", "Fluid", "Social Comics", "QNutri", "Playlist", "Kiddle Pass"
            ]
          }
        ]
      },
      {
        id: "C",
        name: "Opção C: Advanced (2 Apps)",
        choices: [{
          category: "ADVANCED",
          count: 2,
          options: [
            "Deezer", "DocWay", "Sky+ Light com Globo SVA",
            "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
            "HotGo", "Kiddle Pass"
          ]
        }]
      }
    ]
  },
  {
    codigo: "PREMIUM_ULTRA_500",
    nome: "Plano Premium Ultra 500",
    mbps: 500,
    valor: 15999,
    options: [{
      id: "UNICA",
      name: "Premium (1 App)",
      choices: [{
        category: "PREMIUM",
        count: 1,
        options: [
          "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)",
          "ZenWellness", "Queima Diária", "Smart Content"
        ]
      }]
    }]
  },
  {
    codigo: "MAX_700",
    nome: "Plano Max 700",
    mbps: 700,
    valor: 17999,
    options: [
      {
        id: "A",
        name: "Opção A: Premium (1 App)",
        choices: [{
          category: "PREMIUM",
          count: 1,
          options: [
            "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)",
            "ZenWellness", "Queima Diária", "Smart Content"
          ]
        }]
      },
      {
        id: "B",
        name: "Opção B: Top (1 App) + Advanced (1 App)",
        choices: [
          {
            category: "TOP",
            count: 1,
            options: [
              "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA",
              "Leitura360", "Cindie"
            ]
          },
          {
            category: "ADVANCED",
            count: 1,
            options: [
              "Deezer", "DocWay", "Sky+ Light com Globo SVA",
              "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
              "HotGo", "Kiddle Pass"
            ]
          }
        ]
      }
    ]
  },
  {
    codigo: "PLUS_MAX_700",
    nome: "Plano Plus Max 700",
    mbps: 700,
    valor: 19999,
    options: [
      {
        id: "A",
        name: "Opção A: Premium (2 Apps)",
        choices: [{
          category: "PREMIUM",
          count: 2,
          options: [
            "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)",
            "ZenWellness", "Queima Diária", "Smart Content"
          ]
        }]
      },
      {
        id: "B",
        name: "Opção B: Top (2 Apps) + Advanced (1 App)",
        choices: [
          {
            category: "TOP",
            count: 2,
            options: [
              "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA",
              "Leitura360", "Cindie"
            ]
          },
          {
            category: "ADVANCED",
            count: 1,
            options: [
              "Deezer", "DocWay", "Sky+ Light com Globo SVA",
              "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
              "HotGo", "Kiddle Pass"
            ]
          }
        ]
      }
    ]
  }
];

// --- Motivos de Reserva ---
const RESERVA_MOTIVOS = [
  "Instalação",
  "Mudança de Endereço",
  "Reativação",
  "Suporte",
  "Recolhimento",
];

// --- Tipos para Pagamentos (replicados do Worker) ---
type ProcessedPayment = {
  contratoId: string;
  cliente: string;
  cpfcnpj: string;
  plano: string;
  valorPlanoRef: number;
  valorBoleto: number;
  valorPago: number;
  dataPagamento: string; // YYYY-MM-DD
  portador: string;
  endereco: string;
  cidade: string;
  uf: string;
  valorSCM: number;
  valorSCI: number;
  valorSVA: number;
  formaPagamento: string;
  tituloId: string;
  nossoNumero: string;
  numeroDocumento: string;
  chaveUnica: string;
};

// --- Funções utilitárias ---
function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(dateISO: string, days: number) {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
function statusTone(status?: string | null, tipo?: string) {
  if (tipo === "reserva_local") return "gold"; // Reservas locais sempre gold
  const s = (status || "").toLowerCase();
  if (s.includes("reserv")) return "gold";
  if (s.includes("abert")) return "green";
  if (s.includes("execu")) return "orange";
  if (s.includes("canc") || s.includes("perd")) return "red";
  return "muted";
}
function safeText(text?: string | number | null) {
  return text ? String(text) : "-";
}
function fmtHour(hour?: string | null) {
  if (!hour) return "-";
  const [h, m] = hour.split(":");
  return `${h}:${m}`;
}
function phonesLinha(cliente?: ClienteObj | null) {
  if (!cliente || !cliente.telefones || cliente.telefones.length === 0) return "-";
  return cliente.telefones.join(" / ");
}
function clienteEnderecoLinha(cliente?: ClienteObj | null) {
  if (!cliente || !cliente.endereco) return "-";
  const { logradouro, numero, bairro, cidade, uf } = cliente.endereco;
  const parts = [logradouro, numero, bairro, cidade, uf].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}
function moneyBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>("agenda");
  const [agendaData, setAgendaData] = useState<AgendaResp | null>(null);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [errorAgenda, setErrorAgenda] = useState<string | null>(null);
  const [selectedViatura, setSelectedViatura] = useState<string | null>(null);
  const [selectedAgendaItem, setSelectedAgendaItem] = useState<FlatItem | null>(null);
  const [agendaSearchQuery, setAgendaSearchQuery] = useState<string>("");

  // --- Estados para Reservar Serviço ---
  const [rMotivo, setRMotivo] = useState(RESERVA_MOTIVOS[0]);
  const [rData, setRData] = useState(hojeISO());
  const [rHora, setRHora] = useState("08:00");
  const [rViatura, setRViatura] = useState("");
  const [rClienteNome, setRClienteNome] = useState("");
  const [rClienteContato, setRClienteContato] = useState("");
  const [rClienteEndereco, setRClienteEndereco] = useState("");
  const [localReservations, setLocalReservations] = useState<Item[]>([]);

  // --- Estados para Nova Instalação ---
  const [iNome, setINome] = useState("");
  const [iCpf, setICpf] = useState("");
  const [iNasc, setINasc] = useState("");
  const [iContato1, setIContato1] = useState("");
  const [iContato2, setIContato2] = useState("");
  const [iEmail, setIEmail] = useState("");
  const [iEndereco, setIEndereco] = useState("");
  const [iRef, setIRef] = useState("");
  const [iVenc, setIVenc] = useState<10 | 20 | 30>(10);
  const [iFatura, setIFatura] = useState<BillingDelivery>("WHATSAPP_EMAIL");
  const [iTaxa, setITaxa] = useState<InstallFeePayment>("DINHEIRO");
  const [iWifiNome, setIWifiNome] = useState("");
  const [iWifiSenha, setIWifiSenha] = useState("");
  const [iPlanoCodigo, setIPlanoCodigo] = useState(PLANOS[0].codigo);
  const [iPlanoOptionId, setIPlanoOptionId] = useState(PLANOS[0].options[0].id);
  const [iAppsSelecionados, setIAppsSelecionados] = useState<string[]>([]);
  const [localInstallations, setLocalInstallations] = useState<InstallationData[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationData | null>(null);
  const [qInstallations, setQInstallations] = useState<string>("");

  // --- Estados para Pagamentos ---
  const [pagamentosData, setPagamentosData] = useState<ProcessedPayment[]>([]);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);
  const [errorPagamentos, setErrorPagamentos] = useState<string | null>(null);
  const [pagamentosDataInicio, setPagamentosDataInicio] = useState(addDays(hojeISO(), -7)); // Últimos 7 dias
  const [pagamentosDataFim, setPagamentosDataFim] = useState(hojeISO());

  // --- Efeitos e Lógica Comum ---

  // Carregar agenda
  useEffect(() => {
    const fetchAgenda = async () => {
      setLoadingAgenda(true);
      setErrorAgenda(null);
      try {
        const response = await fetch("/api/agenda");
        if (!response.ok) {
          throw new Error(`Erro ao buscar agenda: ${response.statusText}`);
        }
        const data: AgendaResp = await response.json();
        setAgendaData(data);
        if (data.viaturas.length > 0) {
          setSelectedViatura(data.viaturas[0]);
        }
      } catch (err: any) {
        setErrorAgenda(err.message);
      } finally {
        setLoadingAgenda(false);
      }
    };
    fetchAgenda();
  }, []);

  // Carregar reservas locais
  useEffect(() => {
    const storedReservations = localStorage.getItem("localReservations");
    if (storedReservations) {
      setLocalReservations(JSON.parse(storedReservations));
    }
  }, []);

  // Salvar reservas locais
  useEffect(() => {
    localStorage.setItem("localReservations", JSON.stringify(localReservations));
  }, [localReservations]);

  // Carregar instalações locais
  useEffect(() => {
    const storedInstallations = localStorage.getItem("localInstallations");
    if (storedInstallations) {
      setLocalInstallations(JSON.parse(storedInstallations));
    }
  }, []);

  // Salvar instalações locais
  useEffect(() => {
    localStorage.setItem("localInstallations", JSON.stringify(localInstallations));
  }, [localInstallations]);

  // Lógica de seleção de plano e apps
  const selectedPlan = useMemo(() => {
    return PLANOS.find(p => p.codigo === iPlanoCodigo) || PLANOS[0];
  }, [iPlanoCodigo]);

  const selectedPlanOption = useMemo(() => {
    return selectedPlan.options.find(opt => opt.id === iPlanoOptionId) || selectedPlan.options[0];
  }, [selectedPlan, iPlanoOptionId]);

  const handleAppToggle = useCallback((app: string, category: AppCategory, maxCount: number) => {
    setIAppsSelecionados(prev => {
      const currentAppsInCategory = prev.filter(a =>
        selectedPlanOption.choices.find(c => c.category === category)?.options.includes(a)
      );

      if (prev.includes(app)) {
        return prev.filter(a => a !== app);
      } else {
        if (currentAppsInCategory.length < maxCount) {
          return [...prev, app];
        } else {
          alert(`Você já selecionou o máximo de ${maxCount} app(s) para a categoria ${category}.`);
          return prev;
        }
      }
    });
  }, [selectedPlanOption]);

  // Adicionar reserva local
  const addLocalReservation = () => {
    if (!rClienteNome || !rClienteContato || !rClienteEndereco || !rViatura) {
      alert("Por favor, preencha todos os campos obrigatórios da reserva.");
      return;
    }
    const newReservation: Item = {
      tipo: "reserva_local",
      id: `RES-${Date.now()}`,
      data: rData,
      hora: rHora,
      motivo: rMotivo,
      responsavel: rViatura,
      cliente: {
        nome: rClienteNome,
        telefones: [rClienteContato],
        endereco: { logradouro: rClienteEndereco },
      },
      status: "Reservado",
      _internal: {
        reservationId: `RES-${Date.now()}`,
      },
    };
    setLocalReservations(prev => [...prev, newReservation]);
    alert("Reserva salva localmente!");
    // Limpar campos
    setRClienteNome("");
    setRClienteContato("");
    setRClienteEndereco("");
  };

  // Remover reserva local
  const removeLocalReservation = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta reserva?")) {
      setLocalReservations(prev => prev.filter(res => res.id !== id));
    }
  };

  // Adicionar instalação local
  const addLocalInstallation = () => {
    if (!iNome || !iCpf || !iContato1 || !iEndereco || !iWifiNome || !iWifiSenha || !iPlanoCodigo) {
      alert("Por favor, preencha todos os campos obrigatórios da ficha de instalação.");
      return;
    }
    if (iWifiSenha.length < 8) {
      alert("A senha do Wi-Fi deve ter no mínimo 8 dígitos.");
      return;
    }

    const appsCategorized = selectedPlanOption.choices.map(choice => ({
      category: choice.category,
      apps: iAppsSelecionados.filter(app => choice.options.includes(app))
    }));

    const newInstallation: InstallationData = {
      id: `INST-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "CRIADO",
      nomeCompleto: iNome,
      cpf: iCpf,
      nascimento: iNasc || null,
      contato1: iContato1,
      contato2: iContato2 || null,
      email: iEmail || null,
      enderecoFull: iEndereco,
      referencia: iRef || null,
      vencimentoDia: iVenc,
      entregaFatura: iFatura,
      taxaPagamento: iTaxa,
      wifiNome: iWifiNome,
      wifiSenha: iWifiSenha,
      planoCodigo: selectedPlan.codigo,
      planoNome: selectedPlan.nome,
      planoMbps: selectedPlan.mbps,
      planoValor: selectedPlan.valor,
      appsEscolhidos: appsCategorized,
    };
    setLocalInstallations(prev => [...prev, newInstallation]);
    alert("Ficha de instalação salva localmente!");
    // Limpar campos (opcional, dependendo do fluxo)
    setINome(""); setICpf(""); setINasc(""); setIContato1(""); setIContato2(""); setIEmail("");
    setIEndereco(""); setIRef(""); setIWifiNome(""); setIWifiSenha("");
    setIAppsSelecionados([]);
  };

  // Remover instalação local
  const removeLocalInstallation = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta ficha de instalação?")) {
      setLocalInstallations(prev => prev.filter(inst => inst.id !== id));
    }
  };

  // Filtrar instalações salvas
  const filteredInstallations = useMemo(() => {
    if (!qInstallations) return localInstallations;
    const query = qInstallations.toLowerCase();
    return localInstallations.filter(inst =>
      inst.nomeCompleto.toLowerCase().includes(query) ||
      inst.cpf.toLowerCase().includes(query) ||
      inst.contato1.toLowerCase().includes(query) ||
      inst.enderecoFull.toLowerCase().includes(query) ||
      inst.planoNome.toLowerCase().includes(query)
    );
  }, [localInstallations, qInstallations]);

  // Filtrar agenda
  const filteredAgendaData = useMemo(() => {
    if (!agendaData) return null;
    if (!agendaSearchQuery) return agendaData;

    const query = agendaSearchQuery.toLowerCase();
    const filteredDias = agendaData.dias.map(dia => {
      const newPorViatura: Record<string, Item[]> = {};
      for (const viaturaKey in dia.porViatura) {
        const filteredItems = dia.porViatura[viaturaKey].filter(item => {
          const searchFields = [
            item.cliente?.nome,
            item.cliente?.contratoId,
            item.cliente?.plano,
            item.cliente?.endereco?.logradouro,
            item.cliente?.endereco?.numero,
            item.cliente?.endereco?.bairro,
            item.cliente?.endereco?.cidade,
            item.motivo,
            item.id,
            item.contrato,
            item.responsavel,
            item.usuario,
          ].map(s => String(s || "").toLowerCase());
          return searchFields.some(field => field.includes(query));
        });
        if (filteredItems.length > 0) {
          newPorViatura[viaturaKey] = filteredItems;
        }
      }
      return { ...dia, porViatura: newPorViatura };
    });

    return { ...agendaData, dias: filteredDias.filter(dia => Object.keys(dia.porViatura).length > 0) };
  }, [agendaData, agendaSearchQuery]);

  // --- Lógica para Pagamentos ---
  const fetchPagamentos = useCallback(async () => {
    setLoadingPagamentos(true);
    setErrorPagamentos(null);
    try {
      const response = await fetch(`/api/pagamentos?inicio=${pagamentosDataInicio}&fim=${pagamentosDataFim}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || `Erro ao buscar pagamentos: ${response.statusText}`);
      }
      const data: ProcessedPayment[] = await response.json();
      setPagamentosData(data);
    } catch (err: any) {
      setErrorPagamentos(err.message);
    } finally {
      setLoadingPagamentos(false);
    }
  }, [pagamentosDataInicio, pagamentosDataFim]);

  // Carregar pagamentos ao mudar a aba ou as datas
  useEffect(() => {
    if (tab === "pagamentos") {
      fetchPagamentos();
    }
  }, [tab, pagamentosDataInicio, pagamentosDataFim, fetchPagamentos]);

  // Cálculos para o Dashboard de Pagamentos
  const pagamentosSummary = useMemo(() => {
    const totalRecebido = pagamentosData.reduce((sum, p) => sum + p.valorPago, 0);
    const totalPagamentos = pagamentosData.length;
    const ticketMedio = totalPagamentos > 0 ? totalRecebido / totalPagamentos : 0;

    const totalSCM = pagamentosData
      .filter(p => p.portador.toUpperCase().includes("SCM"))
      .reduce((sum, p) => sum + p.valorSCM + p.valorSCI + p.valorSVA, 0);

    const totalSVA = pagamentosData
      .filter(p => p.portador.toUpperCase().includes("SVA"))
      .reduce((sum, p) => sum + p.valorSCM + p.valorSCI + p.valorSVA, 0);

    const pagamentosPorDia: Record<string, { count: number; total: number }> = {};
    pagamentosData.forEach(p => {
      if (!pagamentosPorDia[p.dataPagamento]) {
        pagamentosPorDia[p.dataPagamento] = { count: 0, total: 0 };
      }
      pagamentosPorDia[p.dataPagamento].count++;
      pagamentosPorDia[p.dataPagamento].total += p.valorPago;
    });

    const dailySummary = Object.keys(pagamentosPorDia).sort().map(date => ({
      date,
      count: pagamentosPorDia[date].count,
      total: pagamentosPorDia[date].total,
      ticketMedio: pagamentosPorDia[date].count > 0 ? pagamentosPorDia[date].total / pagamentosPorDia[date].count : 0,
    }));

    return {
      totalRecebido,
      totalPagamentos,
      ticketMedio,
      totalSCM,
      totalSVA,
      dailySummary,
    };
  }, [pagamentosData]);


  return (
    <>
      <div className="topbar">
        <div className="container topbarInner">
          <div className="brand">
            <div className="brandLogo">
              {/* Substitua o 'E' por sua imagem */}
              <Image src="/etech-logo.png" alt="Logo Etech" width={44} height={44} />
            </div>
            <div>
              <div className="brandTitle">Agenda Operacional Etech - SGP</div>
              <div className="brandSub">Agenda Etech - SGP</div>
            </div>
          </div>

          <div className="navTabs">
            <button className={cx("tab", tab === "agenda" && "tabActive")} onClick={() => setTab("agenda")}>
              Agenda
            </button>
            <button className={cx("tab", tab === "reservar" && "tabActive")} onClick={() => setTab("reservar")}>
              Reservar Serviço
            </button>
            <button className={cx("tab", tab === "instalacao" && "tabActive")} onClick={() => setTab("instalacao")}>
              Nova Instalação
            </button>
            <button className={cx("tab", tab === "pagamentos" && "tabActive")} onClick={() => setTab("pagamentos")}>
              Pagamentos
            </button>
          </div>
        </div>
      </div>

      <div className="container content">
        {/* --- ABA AGENDA --- */}
        {tab === "agenda" ? (
          <section className="panel">
            <div className="filters">
              <div className="field">
                <label>Viatura</label>
                <select value={selectedViatura || ""} onChange={(e) => setSelectedViatura(e.target.value)}>
                  {agendaData?.viaturas.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field grow">
                <label>Buscar na Agenda (Cliente, Contrato, Endereço, Plano, Motivo, ID)</label>
                <input
                  type="text"
                  value={agendaSearchQuery}
                  onChange={(e) => setAgendaSearchQuery(e.target.value)}
                  placeholder="Buscar na agenda..."
                />
              </div>
            </div>

            {loadingAgenda ? (
              <div className="chip" style={{ margin: 12 }}>Carregando agenda...</div>
            ) : errorAgenda ? (
              <div className="chip" style={{ margin: 12, background: "rgba(239,68,68,.2)" }}>Erro: {errorAgenda}</div>
            ) : (
              <div className="grid" style={{ marginTop: 14 }}>
                {filteredAgendaData?.dias.map((dia) => (
                  <div key={dia.data} className="col">
                    <div className="colHead">
                      <div className="colTitle">{new Date(dia.data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</div>
                      <div className="pill">{Object.values(dia.porViatura).flat().length} itens</div>
                    </div>
                    <div className="cards">
                      {dia.porViatura[selectedViatura || ""]?.map((item) => (
                        <div
                          key={item.id}
                          className={cx("cardCompact", statusTone(item.status, item.tipo))}
                          onClick={() => setSelectedAgendaItem({ ...item, _dia: dia.data, _viatura: selectedViatura || "" })}
                        >
                          <div className="cardCompactTop">
                            <div className="cardCompactTime">{fmtHour(item.hora)}</div>
                            <div className="cardCompactBadges">
                              <div className="pill ghost">{item.tipo === "reserva_local" ? "Reserva Local" : item.tipo}</div>
                              <div className="pill ghost">{item.status}</div>
                            </div>
                          </div>
                          <div className="titleMainClamp">{safeText(item.cliente?.nome)}</div>
                          <div className="titleSub">{safeText(item.motivo)}</div>
                          <div className="cardCompactBody">
                            <div className="kvRow"><span className="k">Contrato</span><span className="v">{safeText(item.contrato)}</span></div>
                            <div className="kvRow"><span className="k">Plano</span><span className="v">{safeText(item.cliente?.plano)}</span></div>
                            <div className="kvRow"><span className="k">Endereço</span><span className="v vClamp2">{safeText(clienteEnderecoLinha(item.cliente))}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* --- ABA RESERVAR SERVIÇO --- */}
        {tab === "reservar" ? (
          <section className="panel" style={{ marginTop: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Nova Reserva (salva no navegador)</div>
              <div className="chip">Os dados ficam salvos neste navegador</div>
            </div>

            <div className="filters">
              <div className="field">
                <label>Motivo</label>
                <select value={rMotivo} onChange={(e) => setRMotivo(e.target.value)}>
                  {RESERVA_MOTIVOS.map((motivo) => (
                    <option key={motivo} value={motivo}>
                      {motivo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Data</label>
                <input type="date" value={rData} onChange={(e) => setRData(e.target.value)} />
              </div>
              <div className="field">
                <label>Hora</label>
                <input type="time" value={rHora} onChange={(e) => setRHora(e.target.value)} />
              </div>
              <div className="field">
                <label>Viatura</label>
                <select value={rViatura} onChange={(e) => setRViatura(e.target.value)}>
                  <option value="">Selecione</option>
                  {agendaData?.viaturas.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field grow">
                <label>Nome do Cliente</label>
                <input value={rClienteNome} onChange={(e) => setRClienteNome(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Contato do Cliente</label>
                <input value={rClienteContato} onChange={(e) => setRClienteContato(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Endereço do Cliente</label>
                <input value={rClienteEndereco} onChange={(e) => setRClienteEndereco(e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: "span 3", display: "flex", justifyContent: "flex-end" }}>
                <button className="btn primary" onClick={addLocalReservation}>
                  Salvar Reserva
                </button>
              </div>
            </div>

            <div className="hr" />

            <div style={{ fontWeight: 950, marginBottom: 10 }}>Reservas salvas (neste navegador)</div>
            {localReservations.length === 0 ? (
              <div className="chip">Nenhuma reserva salva.</div>
            ) : (
              <div className="installationsList"> {/* Reutilizando estilo da lista de instalações */}
                {localReservations.map((it) => (
                  <section key={it.id} className="installationItem">
                    <div className="name">{it.cliente?.nome}</div>
                    <div className="contact">{it.cliente?.telefones?.[0]} • {it.cliente?.endereco?.logradouro}</div>
                    <div className="plan">{it.motivo} • {it.data} {fmtHour(it.hora)} • {it.responsavel}</div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <button className="btn" onClick={() => removeLocalReservation(it.id)}>Remover</button>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* --- ABA NOVA INSTALAÇÃO --- */}
        {tab === "instalacao" ? (
          <section className="panel" style={{ marginTop: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Ficha de instalação (salva no navegador)</div>
              <div className="chip">Os dados ficam salvos neste navegador</div>
            </div>

            <div className="filters">
              <div className="field grow">
                <label>Nome Completo</label>
                <input value={iNome} onChange={(e) => setINome(e.target.value)} />
              </div>
              <div className="field">
                <label>CPF</label>
                <input value={iCpf} onChange={(e) => setICpf(e.target.value)} />
              </div>
              <div className="field">
                <label>Data de Nascimento</label>
                <input type="date" value={iNasc} onChange={(e) => setINasc(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Contato 1 (WhatsApp)</label>
                <input value={iContato1} onChange={(e) => setIContato1(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Contato 2</label>
                <input value={iContato2} onChange={(e) => setIContato2(e.target.value)} />
              </div>
              <div className="field grow">
                <label>E-mail</label>
                <input value={iEmail} onChange={(e) => setIEmail(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Endereço completo</label>
                <input value={iEndereco} onChange={(e) => setIEndereco(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Ponto de referência</label>
                <input value={iRef} onChange={(e) => setIRef(e.target.value)} />
              </div>

              <div className="field">
                <label>Dia de vencimento</label>
                <select value={iVenc} onChange={(e) => setIVenc(Number(e.target.value) as 10 | 20 | 30)}>
                  <option value={10}>Dia 10</option>
                  <option value={20}>Dia 20</option>
                  <option value={30}>Dia 30</option>
                </select>
              </div>

              <div className="field">
                <label>Receber fatura</label>
                <select value={iFatura} onChange={(e) => setIFatura(e.target.value as BillingDelivery)}>
                  <option value="WHATSAPP_EMAIL">WhatsApp/E-mail</option>
                  <option value="APP">Central do Cliente (Aplicativo)</option>
                </select>
              </div>

              <div className="field">
                <label>Pagamento da taxa (R$50,00)</label>
                <select value={iTaxa} onChange={(e) => setITaxa(e.target.value as InstallFeePayment)}>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão</option>
                </select>
              </div>

              <div className="field grow">
                <label>Nome do Wi-Fi</label>
                <input value={iWifiNome} onChange={(e) => setIWifiNome(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Senha do Wi-Fi (mínimo 8 dígitos)</label>
                <input value={iWifiSenha} onChange={(e) => setIWifiSenha(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Plano E-TECH</label>
                <select value={iPlanoCodigo} onChange={(e) => {
                  setIPlanoCodigo(e.target.value);
                  // Ao mudar de plano, resetar a opção e os apps selecionados
                  const newPlan = PLANOS.find(p => p.codigo === e.target.value) || PLANOS[0];
                  setIPlanoOptionId(newPlan.options[0].id);
                  setIAppsSelecionados([]);
                }}>
                  {PLANOS.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.nome} ({p.mbps}MB) - {moneyBRLFromCents(p.valor)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlan.options.length > 1 && (
                <div className="field grow">
                  <label>Formato do Plano</label>
                  <select value={iPlanoOptionId} onChange={(e) => {
                    setIPlanoOptionId(e.target.value);
                    setIAppsSelecionados([]); // Limpa apps ao mudar de opção
                  }}>
                    {selectedPlan.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field grow" style={{ gridColumn: "1 / -1" }}>
                <label>Aplicativos do Plano ({selectedPlan.nome} - {selectedPlanOption.name})</label>
                {selectedPlanOption.choices.map((choice) => (
                  <div key={choice.category} className="appGroup">
                    <div className="appGroupTitle">
                      {choice.category} (Escolha {choice.count} app{choice.count > 1 ? 's' : ''})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {choice.options.map((app) => (
                        <label key={app} className="chip" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={iAppsSelecionados.includes(app)}
                            onChange={() => handleAppToggle(app, choice.category, choice.count)}
                            style={{ marginRight: "6px" }}
                          />
                          {app}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="field" style={{ gridColumn: "span 3", display: "flex", justifyContent: "flex-end" }}>
                <button className="btn primary" onClick={addLocalInstallation}>
                  Salvar Ficha
                </button>
              </div>
            </div>

            <div className="hr" />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
              <div style={{ fontWeight: 950 }}>Fichas de Instalação salvas (neste navegador)</div>
              <div className="field grow search-field" style={{ margin: 0 }}>
                <input type="text" value={qInstallations} onChange={(e) => setQInstallations(e.target.value)} placeholder="Buscar instalações salvas..." />
              </div>
            </div>

            {filteredInstallations.length === 0 ? (
              <div className="chip">Nenhuma ficha de instalação salva ou encontrada com a busca.</div>
            ) : (
              <div className="installationsList">
                {filteredInstallations.map((inst) => (
                  <div key={inst.id} className="installationItem">
                    <div className="name">{inst.nomeCompleto}</div>
                    <div className="contact">{inst.contato1} {inst.email ? `• ${inst.email}` : ''}</div>
                    <div className="plan">{inst.planoNome} • {inst.status}</div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", gridColumn: "span 3" }}>
                      <button className="btn" onClick={() => setSelectedInstallation(inst)}>Ver Detalhes</button>
                      <button className="btn" onClick={() => removeLocalInstallation(inst.id)}>Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* --- ABA PAGAMENTOS --- */}
        {tab === "pagamentos" ? (
          <section className="panel" style={{ marginTop: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Relatório de Pagamentos</div>
              <div className="chip">Dados do SGP via Cloudflare Worker</div>
            </div>

            <div className="filters">
              <div className="field">
                <label>Data Início</label>
                <input type="date" value={pagamentosDataInicio} onChange={(e) => setPagamentosDataInicio(e.target.value)} />
              </div>
              <div className="field">
                <label>Data Fim</label>
                <input type="date" value={pagamentosDataFim} onChange={(e) => setPagamentosDataFim(e.target.value)} />
              </div>
              <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn primary" onClick={fetchPagamentos} disabled={loadingPagamentos}>
                  {loadingPagamentos ? "Carregando..." : "Buscar Pagamentos"}
                </button>
              </div>
            </div>

            {loadingPagamentos ? (
              <div className="chip" style={{ margin: 12 }}>Carregando pagamentos...</div>
            ) : errorPagamentos ? (
              <div className="chip" style={{ margin: 12, background: "rgba(239,68,68,.2)" }}>Erro: {errorPagamentos}</div>
            ) : (
              <>
                <div className="hr" />

                <div style={{ fontWeight: 950, marginBottom: 10 }}>Resumo do Período</div>
                <div className="summaryGrid">
                  <div className="summaryCard">
                    <div className="summaryTitle">Total Recebido</div>
                    <div className="summaryValue">{moneyBRLFromCents(pagamentosSummary.totalRecebido * 100)}</div>
                  </div>
                  <div className="summaryCard">
                    <div className="summaryTitle">Total Pagamentos</div>
                    <div className="summaryValue">{pagamentosSummary.totalPagamentos}</div>
                  </div>
                  <div className="summaryCard">
                    <div className="summaryTitle">Ticket Médio</div>
                    <div className="summaryValue">{moneyBRLFromCents(pagamentosSummary.ticketMedio * 100)}</div>
                  </div>
                  <div className="summaryCard">
                    <div className="summaryTitle">Total SCM</div>
                    <div className="summaryValue">{moneyBRLFromCents(pagamentosSummary.totalSCM * 100)}</div>
                  </div>
                  <div className="summaryCard">
                    <div className="summaryTitle">Total SVA</div>
                    <div className="summaryValue">{moneyBRLFromCents(pagamentosSummary.totalSVA * 100)}</div>
                  </div>
                </div>

                <div className="hr" />

                <div style={{ fontWeight: 950, marginBottom: 10 }}>Pagamentos por Dia</div>
                {pagamentosSummary.dailySummary.length === 0 ? (
                  <div className="chip">Nenhum pagamento encontrado para o período.</div>
                ) : (
                  <div className="dailySummaryTable">
                    <div className="dailySummaryHeader">
                      <div>Data</div>
                      <div>Pagamentos</div>
                      <div>Total Recebido</div>
                      <div>Ticket Médio</div>
                    </div>
                    {pagamentosSummary.dailySummary.map(day => (
                      <div key={day.date} className="dailySummaryRow">
                        <div>{new Date(day.date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                        <div>{day.count}</div>
                        <div>{moneyBRLFromCents(day.total * 100)}</div>
                        <div>{moneyBRLFromCents(day.ticketMedio * 100)}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="hr" />

                <div style={{ fontWeight: 950, marginBottom: 10 }}>Detalhes dos Pagamentos</div>
                {pagamentosData.length === 0 ? (
                  <div className="chip">Nenhum pagamento detalhado para exibir.</div>
                ) : (
                  <div className="pagamentosTable">
                    <div className="pagamentosTableHeader">
                      <div>Data</div>
                      <div>Cliente</div>
                      <div>Plano</div>
                      <div>Valor Pago</div>
                      <div>Portador</div>
                      <div>SCM</div>
                      <div>SCI</div>
                      <div>SVA</div>
                    </div>
                    {pagamentosData.map((p) => (
                      <div key={p.chaveUnica} className="pagamentosTableRow">
                        <div>{new Date(p.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                        <div>{p.cliente}</div>
                        <div>{p.plano}</div>
                        <div>{moneyBRLFromCents(p.valorPago * 100)}</div>
                        <div>{p.portador}</div>
                        <div>{moneyBRLFromCents(p.valorSCM * 100)}</div>
                        <div>{moneyBRLFromCents(p.valorSCI * 100)}</div>
                        <div>{moneyBRLFromCents(p.valorSVA * 100)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        ) : null}

        <footer className="footer">
          <div className="muted small">Desenvolvido por Paulo Sales.</div>
        </footer>
      </div>

      {/* --- MODAL DETALHES (para itens da agenda) --- */}
      {selectedAgendaItem ? (
        <div className="overlay" onMouseDown={() => setSelectedAgendaItem(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalTitleMain">
                  {selectedAgendaItem.tipo === "reserva_local" ? "Reserva (local)" : "Ordem de Serviço"} •{" "}
                  {selectedAgendaItem._viatura} • {selectedAgendaItem._dia} {fmtHour(selectedAgendaItem.hora)}
                </div>
                <div className="modalTitleSub">
                  {safeText(selectedAgendaItem.motivo)} • {safeText(selectedAgendaItem.status)}
                </div>
              </div>
              <button className="iconBtn" onClick={() => setSelectedAgendaItem(null)}>
                X
              </button>
            </div>

            <div className="modalBody">
              <div className="modalGrid">
                <section className="modalBlock">
                  <div className="modalBlockTitle">Serviço</div>
                  <div className="kvRow"><span className="k">Tipo</span><span className="v">{safeText(selectedAgendaItem.tipo)}</span></div>
                  <div className="kvRow"><span className="k">ID</span><span className="v">{safeText(selectedAgendaItem.id)}</span></div>
                  <div className="kvRow"><span className="k">Contrato</span><span className="v">{safeText(selectedAgendaItem.contrato)}</span></div>
                  <div className="kvRow"><span className="k">Motivo</span><span className="v vClamp2">{safeText(selectedAgendaItem.motivo)}</span></div>
                  <div className="kvRow"><span className="k">Usuário</span><span className="v">{safeText(selectedAgendaItem.usuario)}</span></div>
                  <div className="kvRow"><span className="k">Resp.</span><span className="v">{safeText(selectedAgendaItem.responsavel)}</span></div>
                </section>

                <section className="modalBlock">
                  <div className="modalBlockTitle">Cliente</div>
                  <div className="kvRow"><span className="k">Nome</span><span className="v vClamp2">{safeText(selectedAgendaItem.cliente?.nome)}</span></div>
                  <div className="kvRow"><span className="k">Contato</span><span className="v">{safeText(phonesLinha(selectedAgendaItem.cliente))}</span></div>
                  <div className="kvRow"><span className="k">Email</span><span className="v">{safeText(selectedAgendaItem.cliente?.email)}</span></div>
                  <div className="kvRow"><span className="k">Plano</span><span className="v vClamp2">{safeText(selectedAgendaItem.cliente?.plano)}</span></div>
                  <div className="kvRow"><span className="k">Endereço</span><span className="v vClamp2">{safeText(clienteEnderecoLinha(selectedAgendaItem.cliente))}</span></div>
                </section>
              </div>
            </div>

            <div className="modalFoot">
              <div className="chip small">ESC para fechar</div>
              <button className="btn" onClick={() => setSelectedAgendaItem(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- MODAL DETALHES (para fichas de instalação) --- */}
      {selectedInstallation ? (
        <div className="overlay" onMouseDown={() => setSelectedInstallation(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalTitleMain">
                  Ficha de Instalação • {selectedInstallation.nomeCompleto}
                </div>
                <div className="modalTitleSub">
                  {selectedInstallation.planoNome} • {selectedInstallation.status}
                </div>
              </div>
              <button className="iconBtn" onClick={() => setSelectedInstallation(null)}>
                X
              </button>
            </div>

            <div className="modalBody">
              <div className="modalGrid">
                <section className="modalBlock">
                  <div className="modalBlockTitle">Dados do Cliente</div>
                  <div className="kvRow"><span className="k">Nome</span><span className="v vClamp2">{safeText(selectedInstallation.nomeCompleto)}</span></div>
                  <div className="kvRow"><span className="k">CPF</span><span className="v">{safeText(selectedInstallation.cpf)}</span></div>
                  <div className="kvRow"><span className="k">Nascimento</span><span className="v">{safeText(selectedInstallation.nascimento)}</span></div>
                  <div className="kvRow"><span className="k">Contato 1</span><span className="v">{safeText(selectedInstallation.contato1)}</span></div>
                  <div className="kvRow"><span className="k">Contato 2</span><span className="v">{safeText(selectedInstallation.contato2)}</span></div>
                  <div className="kvRow"><span className="k">E-mail</span><span className="v">{safeText(selectedInstallation.email)}</span></div>
                </section>

                <section className="modalBlock">
                  <div className="modalBlockTitle">Endereço e Cobrança</div>
                  <div className="kvRow"><span className="k">Endereço</span><span className="v vClamp2">{safeText(selectedInstallation.enderecoFull)}</span></div>
                  <div className="kvRow"><span className="k">Referência</span><span className="v vClamp2">{safeText(selectedInstallation.referencia)}</span></div>
                  <div className="kvRow"><span className="k">Vencimento</span><span className="v">Dia {selectedInstallation.vencimentoDia}</span></div>
                  <div className="kvRow"><span className="k">Fatura</span><span className="v">{safeText(selectedInstallation.entregaFatura)}</span></div>
                  <div className="kvRow"><span className="k">Taxa Inst.</span><span className="v">{safeText(selectedInstallation.taxaPagamento)}</span></div>
                </section>

                <section className="modalBlock" style={{ gridColumn: "1 / -1" }}>
                  <div className="modalBlockTitle">Detalhes do Serviço</div>
                  <div className="kvRow"><span className="k">Plano</span><span className="v">{safeText(selectedInstallation.planoNome)} ({selectedInstallation.planoMbps}MB)</span></div>
                  <div className="kvRow"><span className="k">Valor</span><span className="v">{moneyBRLFromCents(selectedInstallation.planoValor || 0)}</span></div>
                  <div className="kvRow"><span className="k">Wi-Fi Nome</span><span className="v">{safeText(selectedInstallation.wifiNome)}</span></div>
                  <div className="kvRow"><span className="k">Wi-Fi Senha</span><span className="v">{safeText(selectedInstallation.wifiSenha)}</span></div>
                  <div className="kvRow"><span className="k">Apps Escolhidos</span><span className="v vClamp2">
                    {selectedInstallation.appsEscolhidos.map(cat =>
                      cat.apps.length > 0 ? `${cat.category}: ${cat.apps.join(", ")}` : ''
                    ).filter(Boolean).join(" • ") || "Nenhum"
                    }
                  </span></div>
                  <div className="kvRow"><span className="k">Status</span><span className="v">{safeText(selectedInstallation.status)}</span></div>
                  <div className="kvRow"><span className="k">Criado em</span><span className="v">{new Date(selectedInstallation.createdAt).toLocaleString('pt-BR')}</span></div>
                </section>
              </div>
            </div>

            <div className="modalFoot">
              <div className="chip small">ESC para fechar</div>
              <button className="btn" onClick={() => setSelectedInstallation(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
