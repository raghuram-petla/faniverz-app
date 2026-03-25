import '@testing-library/jest-dom/vitest';

// Stub jsdom methods that print "Not implemented" to stderr.
window.alert = vi.fn();
window.confirm = vi.fn(() => true);
window.prompt = vi.fn(() => '');

// jsdom and React print noise directly to process.stderr, bypassing console spies.
// Intercept stderr to suppress known noisy patterns.
if (!process.env.VERBOSE_TESTS) {
  const origStderrWrite = process.stderr.write.bind(process.stderr);
  const stderrNoise =
    /Not implemented|wrapped in act\(\.\.\.\)|react\.dev\/link\/wrap-tests-with-act/;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.stderr as any).write = (chunk: any, ...rest: any[]) => {
    if (typeof chunk === 'string' && stderrNoise.test(chunk)) return true;
    return origStderrWrite(chunk, ...rest);
  };
}

// Suppress noisy console output during tests (expected errors from error-path tests).
// Set VERBOSE_TESTS=1 to see all console output when debugging:
//   VERBOSE_TESTS=1 npx vitest run
// Uses direct replacement (not vi.spyOn) so it survives vi.restoreAllMocks().
if (!process.env.VERBOSE_TESTS) {
  const noop = () => {};
  console.error = noop;
  console.warn = noop;
  console.log = noop; // eslint-disable-line no-console
}
