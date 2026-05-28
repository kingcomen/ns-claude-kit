/**
 * Unit tests for lib_xxx_service — inner loop.
 * N/* modules are auto-stubbed by the SuiteCloud Jest preset; no manual jest.mock needed.
 *
 * Pattern: require the AMD module directly — the SuiteCloud transform converts
 * define([deps], factory) → CommonJS, so require() returns factory's return value.
 *
 * @author Wichit Wongta
 */

// Stub N/* modules before requiring the module under test.
jest.mock('N/search');
jest.mock('N/log');

const service = require('../../src/FileCabinet/SuiteScripts/XXX/lib_xxx_service');

describe('validatePost', () => {
  it('throws when body is null', () => {
    expect(() => service.validatePost(null)).toThrow('Missing required field: id');
  });

  it('throws when id is absent', () => {
    expect(() => service.validatePost({ name: 'test' })).toThrow('Missing required field: id');
  });

  it('returns the body unchanged when valid', () => {
    const body = { id: 42, name: 'test' };
    expect(service.validatePost(body)).toBe(body);
  });
});

describe('handlePost', () => {
  it('throws on malformed JSON body', () => {
    expect(() => service.handlePost({ body: 'not-json' })).toThrow();
  });

  it('throws when id is missing in body', () => {
    expect(() => service.handlePost({ body: JSON.stringify({ name: 'test' }) })).toThrow(
      'Missing required field: id'
    );
  });

  it('returns success with id when valid', () => {
    const result = service.handlePost({ body: JSON.stringify({ id: 42 }) });
    expect(result).toEqual({ success: true, id: 42 });
  });
});

describe('makeTimer', () => {
  it('returns an object with a log method', () => {
    const timer = service.makeTimer('test');
    expect(typeof timer.log).toBe('function');
    expect(() => timer.log()).not.toThrow();
  });
});
