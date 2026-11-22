import React, { useState, useMemo } from "react";
import { ICONS } from "../constants";
import { User } from "../types";
import { useLanguage, getLangText } from "../contexts/LanguageContext";

interface ChefAvailabilityCalendarProps {
  chef: User;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const ChefAvailabilityCalendar: React.FC<ChefAvailabilityCalendarProps> = ({
  chef,
  selectedDate,
  onSelectDate,
}) => {
  const { language, t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const dispo = useMemo(() => {
    let d = chef.disponibilidade || {};
    if (typeof d === "string") {
      try {
        d = JSON.parse(d);
      } catch (e) {
        d = {};
      }
    }
    return d;
  }, [chef.disponibilidade]);

  const hasAnyFutureAvailability = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const futureDates = Object.keys(dispo).filter(
      (date) => date >= today && dispo[date]?.length > 0,
    );
    return futureDates.length > 0 || chef.isAvailable; // If online, today is available
  }, [dispo, chef.isAvailable]);

  const daysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);

    const result = [];
    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      result.push(null);
    }
    // Days of the month
    for (let i = 1; i <= days; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`;
      result.push(dateStr);
    }
    return result;
  }, [currentMonth]);

  const locale = useMemo(() => {
    if (language === "en") return "en-US";
    if (language === "fr") return "fr-FR";
    if (language === "es") return "es-ES";
    return "pt-PT";
  }, [language]);

  const monthName = useMemo(() => {
    return currentMonth.toLocaleString(locale, {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth, locale]);

  const weekdays = useMemo(() => {
    const base = new Date(2023, 0, 1); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const str = d.toLocaleDateString(locale, { weekday: "short" });
      return str.charAt(0).toUpperCase() + str.slice(1, 3);
    });
  }, [locale]);

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  if (!hasAnyFutureAvailability) {
    return (
      <div className="p-6 text-center space-y-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 animate-in fade-in">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto shadow-sm border border-slate-100">
          <ICONS.CalendarOff size={16} className="text-slate-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight">
            {getLangText(language, { pt: "Sem datas agendadas.", en: "No dates scheduled.", fr: "Aucune date programmée.", es: "Sin fechas programadas." })}
          </h3>
          <p className="text-[9px] font-medium text-slate-400 max-w-[180px] mx-auto leading-relaxed">
            {getLangText(language, {
              pt: "Este chef ainda não definiu a sua agenda de rituais para os próximos tempos.",
              en: "This chef has not yet scheduled experiences for the upcoming dates.",
              fr: "Ce chef n'a pas encore défini son calendrier d'expériences pour les prochains jours.",
              es: "Este chef aún no ha definido su agenda de experiencias para las próximas fechas."
            })}
          </p>
        </div>
        <button className="px-4 py-2 bg-slate-950 text-white rounded-xl font-bold text-[9px] uppercase tracking-wider hover:bg-orange-500 transition-all cursor-pointer">
          {getLangText(language, { pt: "Notificar-me quando disponível", en: "Notify me when available", fr: "M'avertir dès disponibilité", es: "Avisarme cuando esté disponible" })}
        </button>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 tracking-tight capitalize">
          {monthName}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-950 transition-all shadow-sm cursor-pointer"
          >
            <ICONS.ChevronLeft size={12} />
          </button>
          <button
            onClick={nextMonth}
            className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-950 transition-all shadow-sm cursor-pointer"
          >
            <ICONS.ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="text-center text-[7px] font-bold text-slate-400 uppercase tracking-wider py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day)
              return <div key={`empty-${idx}`} className="h-8" />;

            const isAvailable =
              (dispo[day]?.length > 0 ||
                (day === todayStr && chef.isAvailable)) &&
              day >= todayStr;
            const isSelected = selectedDate === day;
            const isToday = day === todayStr;
            const dayNum = parseInt(day.split("-")[2]);

            return (
              <button
                key={day}
                disabled={!isAvailable}
                onClick={() => onSelectDate(day)}
                className={`
                  h-8 rounded-lg flex flex-col items-center justify-center transition-all relative group cursor-pointer
                  ${
                    isSelected
                      ? "bg-orange-500 text-white shadow-sm scale-105 z-10"
                      : isAvailable
                        ? "bg-slate-50 text-slate-900 hover:bg-orange-50 border border-transparent font-semibold"
                        : "bg-white text-slate-200 cursor-not-allowed opacity-30"
                  }
                `}
              >
                <span
                  className={`text-[11px] ${isSelected ? "text-white font-bold" : "text-slate-800"}`}
                >
                  {dayNum}
                </span>
                {isAvailable && !isSelected && (
                  <div className="w-0.5 h-0.5 bg-orange-500 rounded-full mt-0.5" />
                )}
                {isToday && !isSelected && (
                  <span className="absolute top-0.5 right-0.5 text-[5px] font-bold text-orange-500 uppercase tracking-tight">
                    {t("common.today")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">
            {t("common.active")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-slate-100 border border-slate-200 rounded-full" />
          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">
            {t("common.inactive")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChefAvailabilityCalendar;
