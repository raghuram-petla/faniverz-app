import { create } from 'zustand';

interface CalendarState {
  selectedDate: Date;
  currentMonth: number;
  currentYear: number;
  viewMode: 'month' | 'week';
  setSelectedDate: (date: Date) => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
  setViewMode: (mode: 'month' | 'week') => void;
}

const today = new Date();

export const useCalendarStore = create<CalendarState>()((set) => ({
  selectedDate: today,
  currentMonth: today.getMonth(),
  currentYear: today.getFullYear(),
  viewMode: 'month',
  setSelectedDate: (date) =>
    set({
      selectedDate: date,
      currentMonth: date.getMonth(),
      currentYear: date.getFullYear(),
    }),
  navigateMonth: (direction) =>
    set((state) => {
      let newMonth = state.currentMonth;
      let newYear = state.currentYear;

      if (direction === 'next') {
        if (newMonth === 11) {
          newMonth = 0;
          newYear += 1;
        } else {
          newMonth += 1;
        }
      } else {
        if (newMonth === 0) {
          newMonth = 11;
          newYear -= 1;
        } else {
          newMonth -= 1;
        }
      }

      return { currentMonth: newMonth, currentYear: newYear };
    }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
