import React, { useState, useMemo } from "react";
import { ICONS } from "../constants";
import { User } from "../types";
import { useLanguage, getLangText } from "../contexts/LanguageContext";
import { todayLocal } from "../lib/dateUtils";

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
    const today = todayLocal();
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
      </div>
    );
  }

  const todayStr = todayLocal();

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 tracking-tight capitalize">
          {monthName}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            aria-label={getLangText(language, { pt: "Mês anterior", en: "Previous month", fr: "Mois précédent", es: "Mes anterior" })}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-950 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <ICONS.ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            aria-label={getLangText(language, { pt: "Mês seguinte", en: "Next month", fr: "Mois suivant", es: "Mes siguiente" })}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-950 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <ICONS.ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day)
              return <div key={`empty-${idx}`} className="h-11" />;

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
                aria-pressed={isSelected}
                aria-label={new Date(`${day}T12:00:00`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                onClick={() => onSelectDate(day)}
                className={`
                  h-11 rounded-xl flex flex-col items-center justify-center transition-all relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
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
                  className={`text-sm ${isSelected ? "text-white font-bold" : "text-slate-800"}`}
                >
                  {dayNum}
                </span>
                {isAvailable && !isSelected && (
                  <div className="w-1 h-1 bg-orange-500 rounded-full mt-0.5" />
                )}
                {isToday && !isSelected && (
                  <span className="absolute inset-0 rounded-xl ring-1 ring-orange-400 pointer-events-none" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t("common.active")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-slate-100 border border-slate-200 rounded-full" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t("common.inactive")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChefAvailabilityCalendar;
