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

// @invariant null values for year/month/day mean "use current date" — resolved by consumers
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

  // @edge wraps month overflow/underflow across year boundaries (Dec->Jan, Jan->Dec)
  // @sideeffect clears selectedDay on month navigation to prevent invalid day selection
  // @contract: uses fresh Date() on each call to avoid stale midnight crossing
  navigateMonth: (direction) =>
    set((state) => {
      const fresh = new Date();
      const currentMonth = state.selectedMonth ?? fresh.getMonth();
      const currentYear = state.selectedYear ?? fresh.getFullYear();
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

  // @contract resets all state to initial values — consumer reverts to showing current month
  clearFilters: () =>
    set({
      selectedYear: null,
      selectedMonth: null,
      selectedDay: null,
      showFilters: false,
      hasUserFiltered: false,
    }),
}));
