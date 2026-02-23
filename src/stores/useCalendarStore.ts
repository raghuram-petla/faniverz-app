import { create } from 'zustand';

interface CalendarState {
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number | null;
  showFilters: boolean;
  setDate: (year: number, month: number, day?: number | null) => void;
  navigateMonth: (direction: 1 | -1) => void;
  toggleFilters: () => void;
  clearFilters: () => void;
}

const now = new Date();

export const useCalendarStore = create<CalendarState>((set) => ({
  selectedYear: now.getFullYear(),
  selectedMonth: now.getMonth(),
  selectedDay: null,
  showFilters: false,

  setDate: (year, month, day = null) =>
    set({ selectedYear: year, selectedMonth: month, selectedDay: day }),

  navigateMonth: (direction) =>
    set((state) => {
      let newMonth = state.selectedMonth + direction;
      let newYear = state.selectedYear;
      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }
      return { selectedMonth: newMonth, selectedYear: newYear, selectedDay: null };
    }),

  toggleFilters: () => set((state) => ({ showFilters: !state.showFilters })),

  clearFilters: () =>
    set({
      selectedYear: now.getFullYear(),
      selectedMonth: now.getMonth(),
      selectedDay: null,
      showFilters: false,
    }),
}));
