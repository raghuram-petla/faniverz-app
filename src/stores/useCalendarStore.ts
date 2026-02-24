import { create } from 'zustand';

interface CalendarState {
  selectedYear: number | null;
  selectedMonth: number | null;
  selectedDay: number | null;
  showFilters: boolean;
  hasUserFiltered: boolean;
  setDate: (year: number | null, month: number | null, day?: number | null) => void;
  navigateMonth: (direction: 1 | -1) => void;
  toggleFilters: () => void;
  clearFilters: () => void;
}

const now = new Date();

export const useCalendarStore = create<CalendarState>((set) => ({
  selectedYear: null,
  selectedMonth: null,
  selectedDay: null,
  showFilters: false,
  hasUserFiltered: false,

  setDate: (year, month, day = null) =>
    set({
      selectedYear: year,
      selectedMonth: month,
      selectedDay: day,
      hasUserFiltered: true,
    }),

  navigateMonth: (direction) =>
    set((state) => {
      const currentMonth = state.selectedMonth ?? now.getMonth();
      const currentYear = state.selectedYear ?? now.getFullYear();
      let newMonth = currentMonth + direction;
      let newYear = currentYear;
      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }
      return {
        selectedMonth: newMonth,
        selectedYear: newYear,
        selectedDay: null,
        hasUserFiltered: true,
      };
    }),

  toggleFilters: () => set((state) => ({ showFilters: !state.showFilters })),

  clearFilters: () =>
    set({
      selectedYear: null,
      selectedMonth: null,
      selectedDay: null,
      showFilters: false,
      hasUserFiltered: false,
    }),
}));
