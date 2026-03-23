import { describe, it, expect } from 'vitest';
import { makeRequest, nextResponseMock, chainable } from './test-utils';

describe('makeRequest', () => {
  it('returns an object with json() that resolves to the body', async () => {
    const req = makeRequest({ name: 'test' });
    const body = await req.json();
    expect(body).toEqual({ name: 'test' });
  });

  it('returns default Bearer valid-token for authorization header', () => {
    const req = makeRequest({});
    expect(req.headers.get('authorization')).toBe('Bearer valid-token');
  });

  it('uses custom auth header when provided', () => {
    const req = makeRequest({}, 'Bearer custom');
    expect(req.headers.get('authorization')).toBe('Bearer custom');
  });

  it('returns null for non-authorization headers', () => {
    const req = makeRequest({});
    expect(req.headers.get('content-type')).toBeNull();
  });
});

describe('nextResponseMock', () => {
  it('creates json response with default 200 status', async () => {
    const res = nextResponseMock.NextResponse.json({ ok: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(await res.json()).toEqual({ ok: true });
  });

  it('creates json response with custom status', () => {
    const res = nextResponseMock.NextResponse.json({ error: 'bad' }, { status: 400 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'bad' });
  });
});

describe('chainable', () => {
  it('supports chaining .select().eq().order()', async () => {
    const mock = chainable([{ id: '1' }]);
    const result = await (mock.select as Function)('*').eq('id', '1').order('created_at');
    expect(result).toEqual({ data: [{ id: '1' }], error: null });
  });

  it('resolves .single() with the data', async () => {
    const mock = chainable({ id: '1', name: 'test' });
    const result = await (mock.select as Function)('*').eq('id', '1').single();
    expect(result).toEqual({ data: { id: '1', name: 'test' }, error: null });
  });

  it('returns error when provided', async () => {
    const mock = chainable(null, { message: 'Not found' });
    const result = await (mock.select as Function)('*').single();
    expect(result).toEqual({ data: null, error: { message: 'Not found' } });
  });

  it('supports .insert().select() chain', async () => {
    const mock = chainable({ id: 'new' });
    const result = await (mock.insert as Function)({}).select().single();
    expect(result.data).toEqual({ id: 'new' });
  });

  it('defaults to empty array data', async () => {
    const mock = chainable();
    const result = await (mock.select as Function)('*');
    expect(result.data).toEqual([]);
  });
});
