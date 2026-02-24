import { useCalendarStore } from '../useCalendarStore';

describe('useCalendarStore', () => {
  beforeEach(() => {
    useCalendarStore.setState({
      selectedYear: 2026,
      selectedMonth: 1,
      selectedDay: null,
      showFilters: false,
      hasUserFiltered: false,
    });
  });

  it('has current date as default', () => {
    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBe(2026);
    expect(state.selectedMonth).toBe(1);
    expect(state.selectedDay).toBeNull();
  });

  it('navigateMonth forward wraps year', () => {
    useCalendarStore.setState({ selectedMonth: 11, selectedYear: 2026 });
    useCalendarStore.getState().navigateMonth(1);
    const state = useCalendarStore.getState();
    expect(state.selectedMonth).toBe(0);
    expect(state.selectedYear).toBe(2027);
  });

  it('navigateMonth backward wraps year', () => {
    useCalendarStore.setState({ selectedMonth: 0, selectedYear: 2026 });
    useCalendarStore.getState().navigateMonth(-1);
    const state = useCalendarStore.getState();
    expect(state.selectedMonth).toBe(11);
    expect(state.selectedYear).toBe(2025);
  });

  it('setDate updates all fields', () => {
    useCalendarStore.getState().setDate(2025, 5, 15);
    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBe(2025);
    expect(state.selectedMonth).toBe(5);
    expect(state.selectedDay).toBe(15);
  });

  it('toggleFilters flips state', () => {
    expect(useCalendarStore.getState().showFilters).toBe(false);
    useCalendarStore.getState().toggleFilters();
    expect(useCalendarStore.getState().showFilters).toBe(true);
  });

  it('setDate sets hasUserFiltered to true', () => {
    expect(useCalendarStore.getState().hasUserFiltered).toBe(false);
    useCalendarStore.getState().setDate(2025, 5);
    expect(useCalendarStore.getState().hasUserFiltered).toBe(true);
  });

  it('navigateMonth sets hasUserFiltered to true', () => {
    expect(useCalendarStore.getState().hasUserFiltered).toBe(false);
    useCalendarStore.getState().navigateMonth(1);
    expect(useCalendarStore.getState().hasUserFiltered).toBe(true);
  });

  it('clearFilters resets hasUserFiltered to false', () => {
    useCalendarStore.getState().setDate(2025, 5);
    expect(useCalendarStore.getState().hasUserFiltered).toBe(true);
    useCalendarStore.getState().clearFilters();
    expect(useCalendarStore.getState().hasUserFiltered).toBe(false);
  });
});
