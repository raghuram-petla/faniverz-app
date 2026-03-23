import { createWrapper } from './helpers/createWrapper';

describe('createWrapper', () => {
  it('returns a React component function', () => {
    const Wrapper = createWrapper();
    expect(typeof Wrapper).toBe('function');
  });

  it('creates a fresh wrapper on each call', () => {
    const Wrapper1 = createWrapper();
    const Wrapper2 = createWrapper();
    expect(Wrapper1).not.toBe(Wrapper2);
  });
});
