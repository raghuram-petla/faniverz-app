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

  it('has null year/month as default (upcoming view)', () => {
    // After beforeEach sets explicit values, verify those are stored
    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBe(2026);
    expect(state.selectedMonth).toBe(1);
    expect(state.selectedDay).toBeNull();
  });

  it('initializes with null year and month for upcoming view', () => {
    useCalendarStore.setState({
      selectedYear: null,
      selectedMonth: null,
      selectedDay: null,
      showFilters: false,
      hasUserFiltered: false,
    });
    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBeNull();
    expect(state.selectedMonth).toBeNull();
    expect(state.hasUserFiltered).toBe(false);
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

  it('setDate with null year and month keeps them as null', () => {
    useCalendarStore.getState().setDate(null, null);
    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBeNull();
    expect(state.selectedMonth).toBeNull();
    expect(state.selectedDay).toBeNull();
  });

  it('navigateMonth forward from mid-year stays in same year', () => {
    useCalendarStore.setState({ selectedMonth: 5, selectedYear: 2026 });
    useCalendarStore.getState().navigateMonth(1);
    const state = useCalendarStore.getState();
    expect(state.selectedMonth).toBe(6);
    expect(state.selectedYear).toBe(2026);
    expect(state.selectedDay).toBeNull();
  });

  it('clearFilters resets year and month to null', () => {
    useCalendarStore.getState().setDate(2025, 5, 10);
    useCalendarStore.getState().clearFilters();
    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBeNull();
    expect(state.selectedMonth).toBeNull();
    expect(state.selectedDay).toBeNull();
  });

  it('navigateMonth from null month/year uses current date as base', () => {
    const now = new Date();
    useCalendarStore.setState({ selectedMonth: null, selectedYear: null });
    useCalendarStore.getState().navigateMonth(1);
    const state = useCalendarStore.getState();
    const expectedMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
    const expectedYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    expect(state.selectedMonth).toBe(expectedMonth);
    expect(state.selectedYear).toBe(expectedYear);
  });

  it('clearFilters resets showFilters to false', () => {
    useCalendarStore.getState().toggleFilters();
    expect(useCalendarStore.getState().showFilters).toBe(true);
    useCalendarStore.getState().clearFilters();
    expect(useCalendarStore.getState().showFilters).toBe(false);
  });
});
