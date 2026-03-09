import { measureView } from '../measureView';

describe('measureView', () => {
  it('calls onMeasured with layout when ref has valid dimensions', () => {
    const onMeasured = jest.fn();
    const ref = {
      current: {
        measureInWindow: jest.fn((cb: Function) => cb(10, 20, 200, 300)),
      },
    } as never;

    measureView(ref, onMeasured);
    expect(onMeasured).toHaveBeenCalledWith({ x: 10, y: 20, width: 200, height: 300 });
  });

  it('calls onFailed when ref.current is null', () => {
    const onMeasured = jest.fn();
    const onFailed = jest.fn();
    const ref = { current: null } as never;

    measureView(ref, onMeasured, onFailed);
    expect(onMeasured).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalled();
  });

  it('calls onFailed when measureInWindow returns zero dimensions', () => {
    const onMeasured = jest.fn();
    const onFailed = jest.fn();
    const ref = {
      current: {
        measureInWindow: jest.fn((cb: Function) => cb(0, 0, 0, 0)),
      },
    } as never;

    measureView(ref, onMeasured, onFailed);
    expect(onMeasured).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalled();
  });

  it('does not crash when onFailed is not provided and ref is null', () => {
    const onMeasured = jest.fn();
    const ref = { current: null } as never;

    expect(() => measureView(ref, onMeasured)).not.toThrow();
    expect(onMeasured).not.toHaveBeenCalled();
  });

  it('calls onFailed when node has no measureInWindow method', () => {
    const onMeasured = jest.fn();
    const onFailed = jest.fn();
    const ref = { current: {} } as never;

    measureView(ref, onMeasured, onFailed);
    expect(onMeasured).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalled();
  });
});
