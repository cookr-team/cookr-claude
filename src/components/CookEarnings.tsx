import React, { useState, useMemo } from "react";
import { Booking, BookingStatus } from "../types";
import { ICONS, formatPrice, COMMISSION_RATE } from "../constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useLanguage, getLangText } from "../contexts/LanguageContext";
import { todayLocal } from "../lib/dateUtils";

interface CookEarningsProps {
  bookings: Booking[];
}

const CookEarnings: React.FC<CookEarningsProps> = ({ bookings }) => {
  const { language, t } = useLanguage();
  const [timeFilter, setTimeFilter] = useState("Este Mês");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [startDate, setStartDate] = useState(() => todayLocal().slice(0, 8) + "01");
  const [endDate, setEndDate] = useState(() => todayLocal());
  const [isEditingRange, setIsEditingRange] = useState(false);

  const rate = 1 - COMMISSION_RATE;
  const gross = (b: Booking) => Number(b.valorTotal) || 0;

  // Intervalo [from, to] (YYYY-MM-DD, inclusivo) do filtro escolhido
  const range = useMemo(() => {
    const today = todayLocal();
    if (timeFilter === "Este Mês") return { from: today.slice(0, 8) + "01", to: today };
    if (timeFilter === "Este Ano") return { from: today.slice(0, 4) + "-01-01", to: today };
    if (timeFilter === "Últimos 30 Dias") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { from, to: today };
    }
    return { from: startDate <= endDate ? startDate : endDate, to: startDate <= endDate ? endDate : startDate };
  }, [timeFilter, startDate, endDate]);

  const inRange = (b: Booking) => !!b.data && b.data >= range.from && b.data <= range.to;

  const completedInRange = useMemo(
    () => bookings.filter((b) => b.status === BookingStatus.COMPLETED && inRange(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookings, range],
  );

  const transactions = useMemo(
    () =>
      completedInRange
        .map((b) => {
          const g = gross(b);
          return {
            id: b.id,
            date: b.data,
            service: `${b.menu_selected || "Serviço Cookr"}${b.clientName ? ` · ${b.clientName}` : ""}`,
            status: "Concluído",
            gross: g,
            net: g * rate,
          };
        })
        .sort((x, y) => (x.date < y.date ? 1 : -1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedInRange],
  );

  const stats = useMemo(() => {
    const upcoming = bookings.filter(
      (b) => b.status === BookingStatus.ACCEPTED || b.status === BookingStatus.IN_PROGRESS,
    );
    return {
      net: transactions.reduce((acc, t) => acc + t.net, 0),
      pending: upcoming.reduce((acc, b) => acc + gross(b) * rate, 0),
      count: transactions.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, bookings]);

  const filteredTransactions = transactions;

  const chartData = useMemo(() => {
    const ptMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    const buckets: { key: string; name: string; bruto: number; líquido: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        name: `${ptMonths[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`,
        bruto: 0,
        líquido: 0,
      });
    }
    bookings.forEach((b) => {
      if (b.status !== BookingStatus.COMPLETED || !b.data) return;
      const bucket = buckets.find((m) => m.key === b.data.slice(0, 7));
      if (bucket) {
        bucket.bruto += gross(b);
        bucket.líquido += gross(b) * rate;
      }
    });
    return buckets.map((m) => ({
      name: m.name,
      bruto: Number(m.bruto.toFixed(2)),
      líquido: Number(m.líquido.toFixed(2)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 text-white p-3 rounded-lg border border-white/10 shadow-lg text-left text-[10px] font-sans">
          <p className="font-extrabold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-3 justify-between">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name === "bruto" ? "Bruto" : "Líquido"}:
                </span>
                <span className="font-black text-white">{formatPrice(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("Relatorio de Ganhos - Cookr", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Data de emissao: ${new Date().toLocaleDateString("pt-PT")} | Filtro: ${timeFilter}`,
      14,
      30,
    );

    // Stats Summary
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Resumo de Performance", 14, 45);

    const statsData = [
      ["Total de Rituais", stats.count.toString()],
      ["Ganhos concluidos (Liquido)", formatPrice(stats.net)],
      ["A Receber (Liquido)", formatPrice(stats.pending)],
    ];

    autoTable(doc, {
      startY: 50,
      head: [["Metrica", "Valor"]],
      body: statsData,
      theme: "striped",
      headStyles: { fillColor: [249, 115, 22] }, // orange-500 (#F97316)
    });

    // Transactions Table
    doc.setFontSize(14);
    doc.text(
      "Historico de Transacoes",
      14,
      (doc as any).lastAutoTable.finalY + 15,
    );

    const tableData = filteredTransactions.map((t) => [
      t.date,
      t.service,
      t.status,
      formatPrice(t.gross),
      formatPrice(t.net),
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["Data", "Servico", "Estado", "Bruto", "Liquido"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42] }, // slate-950
    });

    doc.save(`relatorio-ganhos-${timeFilter.replace(/\s+/g, "-").toLowerCase()}-${todayLocal()}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 pb-20 pt-2 px-4 animate-in fade-in duration-500">
      <header className="border-b border-slate-100 pb-4 text-left">
        <h1 className="text-xl md:text-3xl font-extrabold text-slate-950 uppercase tracking-tight leading-none mb-1">
          {getLangText(language, { pt: "Meus Ganhos.", en: "My Earnings.", fr: "Mes Revenus.", es: "Mis Ingresos." })}
        </h1>
        <div className="flex justify-between items-center w-full relative">
          <p className="text-[7.5px] md:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">
            {getLangText(language, { pt: "Performance & Faturação", en: "Performance & Billing", fr: "Performance & Facturation", es: "Rendimiento y Facturación" })}
          </p>

          {/* Date Filter Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all text-[8.5px] font-extrabold uppercase tracking-wider cursor-pointer"
            >
              <ICONS.Calendar size={12} className="text-orange-500" />
              <span>{getLangText(language, { pt: "Filtro", en: "Filter", fr: "Filtre", es: "Filtro" })}: {timeFilter}</span>
              <ICONS.ChevronDown size={10} className="text-slate-400" />
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-150 rounded-xl shadow-xl z-50 py-1 text-left animate-in fade-in slide-in-from-top-1 duration-200">
                {["Este Mês", "Últimos 30 Dias", "Este Ano", "Intervalo Customizado"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setTimeFilter(opt);
                      setShowFilterDropdown(false);
                      if (opt === "Intervalo Customizado") {
                        setIsEditingRange(true);
                      } else {
                        setIsEditingRange(false);
                      }
                    }}
                    className={`w-full px-3.5 py-2 text-[8px] font-bold uppercase tracking-wider text-left transition-colors flex items-center justify-between cursor-pointer ${
                      timeFilter === opt
                        ? "bg-orange-50/40 text-orange-600 font-black"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt}</span>
                    {timeFilter === opt && <ICONS.Check size={10} className="text-orange-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Custom Date Range Picker simulation */}
      {isEditingRange && (
        <div className="bg-orange-50/30 border border-orange-100/30 p-3.5 rounded-xl text-left space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <ICONS.Filter size={12} className="text-orange-500" />
            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700">Intervalo personalizado</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[9px] font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[9px] font-semibold text-slate-800"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsEditingRange(false)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[8px] font-extrabold uppercase tracking-wider text-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => setIsEditingRange(false)}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-[8px] font-extrabold uppercase tracking-wider text-white rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Aplicar Intervalo
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-slate-950 rounded-xl border border-white/5 text-left relative overflow-hidden group shadow-sm flex flex-col justify-between min-h-[145px]">
          <div className="absolute top-0 right-0 w-20 md:w-24 h-24 bg-orange-500/10 rounded-full -mr-10 -mt-10 blur-xl group-hover:bg-orange-500/15 transition-all" />
          <div className="p-4 md:p-5 pb-1 space-y-2 relative z-10">
            <p className="text-[7.5px] md:text-[8.5px] font-bold text-orange-500 uppercase tracking-wider">
              Ganhos Concluídos
            </p>
            <p className="text-xl md:text-2xl font-extrabold text-white leading-none">
              {formatPrice(stats.net)}
            </p>
            <div className="flex items-center gap-1.5 text-[8px] md:text-[8.5px] font-medium text-white/50 pt-0.5">
              <ICONS.CheckCircle
                size={11}
                className="text-emerald-500 shrink-0"
              />
              <span>Serviços já realizados</span>
            </div>
          </div>
          <div className="px-4 pb-4 md:px-5 md:pb-5 pt-2 mt-auto border-t border-white/5 relative z-10">
            <p className="text-xs text-gray-400 leading-tight font-medium opacity-90">
              Comissão Cookr já deduzida
            </p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-100 shadow-xs text-left min-h-[145px] flex flex-col justify-between">
          <div className="space-y-2">
            <p className="text-[7.5px] md:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider max-w-full">
              A Receber
            </p>
            <p className="text-xl md:text-2xl font-extrabold text-slate-950 leading-none">
              {formatPrice(stats.pending)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[8px] md:text-[8.5px] font-medium text-slate-400 pt-0.5 mt-auto">
            <ICONS.Clock size={11} className="text-orange-500 shrink-0" />
            <span>Serviços confirmados por realizar</span>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-100 shadow-xs text-left min-h-[145px] flex flex-col justify-between">
          <div className="space-y-2">
            <p className="text-[7.5px] md:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider max-w-full">
              Total de Rituais
            </p>
            <p className="text-xl md:text-2xl font-extrabold text-slate-950 leading-none">
              {stats.count}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[8px] md:text-[8.5px] font-medium text-slate-400 pt-0.5 mt-auto">
            <ICONS.CheckCircle size={11} className="text-orange-500 shrink-0" />
            <span>No período selecionado</span>
          </div>
        </div>
      </div>

      {/* Evolução dos Ganhos Line Chart */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-150 shadow-xs text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-xs md:text-sm font-extrabold text-slate-900 uppercase tracking-tight">
              Evolução de Ganhos.
            </h3>
            <p className="text-[7.5px] md:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
              Análise de faturamento nos últimos 6 meses (líquido vs bruto)
            </p>
          </div>
          <div className="flex items-center gap-4 text-[7px] md:text-[8px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50 p-1.5 px-2.5 rounded-lg border border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Bruto</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Líquido</span>
            </div>
          </div>
        </div>

        <div className="w-full h-[220px] pt-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -24, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 700 }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 700 }}
                tickFormatter={(val) => `${val}€`}
              />
              <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: "#f1f5f9", strokeWidth: 1.5 }} />
              <Line
                type="monotone"
                dataKey="bruto"
                name="bruto"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 1, fill: "#fff" }}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#f97316" }}
              />
              <Line
                type="monotone"
                dataKey="líquido"
                name="líquido"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 1, fill: "#fff" }}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 px-1">
          <h3 className="text-xs md:text-sm font-bold text-slate-900 uppercase tracking-tight">
            Histórico de Transações.
          </h3>
          <button
            onClick={exportToPDF}
            className="px-3 py-1.5 bg-orange-50/15 hover:bg-orange-50/25 text-[8px] md:text-[9px] font-bold uppercase text-orange-600 tracking-wider hover:text-orange-700 rounded-lg border border-orange-100/30 transition-all active:scale-95 text-center inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ICONS.FileText size={11} />
            <span>Exportar PDF</span>
          </button>
        </div>

        {/* Unified clean minimalist list table with fine dividing lines */}
        <div className="bg-white rounded-xl border border-slate-150 shadow-xs overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-300">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx) => (
              <div 
                key={tx.id} 
                className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 text-orange-500">
                    <ICONS.FileText size={14} />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase leading-none">
                      {tx.service}
                    </p>
                    <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">
                      {tx.date}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[8px] uppercase tracking-wider">
                    {tx.status}
                  </span>
                  <span className="text-xs md:text-sm font-black text-emerald-600 leading-none">
                    +{formatPrice(tx.net)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400">
              <ICONS.FileText size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[8.5px] font-bold uppercase tracking-wider">Ainda não existem transações concluídas neste período.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CookEarnings);
