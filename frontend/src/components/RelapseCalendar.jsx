// client/src/components/RelapseCalendar.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

const RelapseCalendar = ({ relapses = [] }) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [relapsesByDate, setRelapsesByDate] = useState({});

  useEffect(() => {
    // Group relapses by date
    const grouped = {};
    relapses.forEach((relapse) => {
      const date = new Date(relapse.relapse_time);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(relapse);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) =>
          new Date(a.relapse_time).getTime() -
          new Date(b.relapse_time).getTime(),
      );
    });
    setRelapsesByDate(grouped);
  }, [relapses]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const handleDateClick = (day) => {
    const dateKey = formatDateKey(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    if (relapsesByDate[dateKey]) {
      setSelectedDate({ day, relapses: relapsesByDate[dateKey] });
    }
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const hasRelapses =
        relapsesByDate[dateKey] && relapsesByDate[dateKey].length > 0;
      const relapseCount = hasRelapses ? relapsesByDate[dateKey].length : 0;
      const isToday =
        new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`
            relative p-2 md:h-12  h-6 w-6 md:w-12 flex items-center justify-center text-xs md:text-sm cursor-pointer rounded-lg transition-colors group
            ${isToday ? "bg-primary text-white font-bold" : "text-text-primary hover:bg-secondary"}
            ${hasRelapses ? "cursor-pointer" : ""}
          `}
        >
          {day}
          {hasRelapses && (
            <div className="absolute bottom-0.5 right-0.5 ">
              <div
                className={`
                relative md:w-[20px] w-4 h-4 md:h-5 px-1 rounded-full flex items-center justify-center bottom-2.5 left-2.5 md:bottom-6 md:left-1 md:group-hover:left-3 md:group-hover:bottom-9 transition-all text-xs font-bold
                ${isToday ? "bg-white text-primary bottom-2.5 left-2.5 md:bottom-9 md:left-3" : "bg-danger text-white"}
              `}
              >
                {relapseCount}
              </div>
            </div>
          )}
        </div>,
      );
    }

    return days;
  };

  const monthNames = [
    t("calendar.january"),
    t("calendar.february"),
    t("calendar.march"),
    t("calendar.april"),
    t("calendar.may"),
    t("calendar.june"),
    t("calendar.july"),
    t("calendar.august"),
    t("calendar.september"),
    t("calendar.october"),
    t("calendar.november"),
    t("calendar.december"),
  ];

  const dayNames = [
    t("calendar.sunday"),
    t("calendar.monday"),
    t("calendar.tuesday"),
    t("calendar.wednesday"),
    t("calendar.thursday"),
    t("calendar.friday"),
    t("calendar.saturday"),
  ];

  return (
    <div className="bg-surface rounded-2xl p-6 space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-text-primary">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
            aria-label={t("calendar.previousMonth")}
          >
            <IoChevronBack className="w-5 h-5 text-text-secondary" />
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
            aria-label={t("calendar.nextMonth")}
          >
            <IoChevronForward className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day, index) => (
            <div
              key={index}
              className="text-xs font-medium text-text-secondary text-center p-2"
            >
              {day.substring(0, 3)}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 place-items-center">{renderCalendarDays()}</div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-danger"></div>
          <span className="text-xs text-text-secondary">
            {t("calendar.relapseDay")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary"></div>
          <span className="text-xs text-text-secondary">
            {t("calendar.today")}
          </span>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="mt-4 p-4 bg-secondary rounded-lg border border-border">
          <h4 className="font-semibold text-text-primary mb-2">
            {t("calendar.relapsesOn", {
              date: new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                selectedDate.day,
              ).toLocaleDateString(),
            })}
          </h4>
          <div className="space-y-2">
            {selectedDate.relapses.map((relapse, index) => {
              const relapseDate = new Date(relapse.relapse_time);
              const formattedTime = relapseDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              return (
                <div key={relapse._id || index} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">
                      {formattedTime}
                    </span>
                    {relapse.relapse_note && (
                      <span className="text-text-primary">
                        - {relapse.relapse_note}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedDate(null)}
            className="mt-2 text-xs text-primary hover:text-primary-hover cursor-pointer"
          >
            {t("common.close")}
          </button>
        </div>
      )}

      {/* No Relapses Message */}
      {relapses.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-text-secondary">{t("calendar.noRelapses")}</p>
        </div>
      )}
    </div>
  );
};

export default RelapseCalendar;
