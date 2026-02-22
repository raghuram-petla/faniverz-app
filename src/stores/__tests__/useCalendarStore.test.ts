import { useCalendarStore } from '../useCalendarStore';

describe('useCalendarStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    const today = new Date();
    useCalendarStore.setState({
      selectedDate: today,
      currentMonth: today.getMonth(),
      currentYear: today.getFullYear(),
      viewMode: 'month',
    });
  });

  it('initializes with today as selected date', () => {
    const state = useCalendarStore.getState();
    const today = new Date();
    expect(state.selectedDate.getDate()).toBe(today.getDate());
    expect(state.currentMonth).toBe(today.getMonth());
    expect(state.currentYear).toBe(today.getFullYear());
  });

  it('defaults to month view mode', () => {
    const state = useCalendarStore.getState();
    expect(state.viewMode).toBe('month');
  });

  it('setSelectedDate updates date, month, and year', () => {
    const newDate = new Date(2026, 5, 15); // June 15, 2026
    useCalendarStore.getState().setSelectedDate(newDate);

    const state = useCalendarStore.getState();
    expect(state.selectedDate).toBe(newDate);
    expect(state.currentMonth).toBe(5);
    expect(state.currentYear).toBe(2026);
  });

  it('navigateMonth next increments month', () => {
    useCalendarStore.setState({ currentMonth: 3, currentYear: 2026 });
    useCalendarStore.getState().navigateMonth('next');

    const state = useCalendarStore.getState();
    expect(state.currentMonth).toBe(4);
    expect(state.currentYear).toBe(2026);
  });

  it('navigateMonth prev decrements month', () => {
    useCalendarStore.setState({ currentMonth: 3, currentYear: 2026 });
    useCalendarStore.getState().navigateMonth('prev');

    const state = useCalendarStore.getState();
    expect(state.currentMonth).toBe(2);
    expect(state.currentYear).toBe(2026);
  });

  it('navigateMonth next wraps December to January of next year', () => {
    useCalendarStore.setState({ currentMonth: 11, currentYear: 2026 });
    useCalendarStore.getState().navigateMonth('next');

    const state = useCalendarStore.getState();
    expect(state.currentMonth).toBe(0);
    expect(state.currentYear).toBe(2027);
  });

  it('navigateMonth prev wraps January to December of previous year', () => {
    useCalendarStore.setState({ currentMonth: 0, currentYear: 2026 });
    useCalendarStore.getState().navigateMonth('prev');

    const state = useCalendarStore.getState();
    expect(state.currentMonth).toBe(11);
    expect(state.currentYear).toBe(2025);
  });

  it('setViewMode changes view mode', () => {
    useCalendarStore.getState().setViewMode('week');
    expect(useCalendarStore.getState().viewMode).toBe('week');

    useCalendarStore.getState().setViewMode('month');
    expect(useCalendarStore.getState().viewMode).toBe('month');
  });
});
