/**
 * Unit tests for lib_sdb_service.js
 * @author Wichit Wongta
 */

jest.mock('N/query', () => ({ runSuiteQL: jest.fn() }));
jest.mock('N/format', () => ({
  Type: { DATE: 'DATE' },
  parse: jest.fn(({ value }) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }),
}));
jest.mock('N/log', () => ({ debug: jest.fn(), error: jest.fn() }));

const service = require('../../src/FileCabinet/SuiteScripts/Teibto/SDB/lib_sdb_service');
const query   = require('N/query');

const ROWS = [{ month: '2026-01', total: 50000 }];

function mockQuery(rows) {
  query.runSuiteQL.mockReturnValueOnce({ asMappedResults: () => rows });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── toSuiteQLDate ────────────────────────────────────────────────────────────

describe('toSuiteQLDate', () => {
  it('pads single-digit month and day', () => {
    expect(service.toSuiteQLDate('2026-01-05')).toBe('01/05/2026');
  });

  it('handles double-digit month and day', () => {
    expect(service.toSuiteQLDate('2026-12-31')).toBe('12/31/2026');
  });
});

// ─── fetchRevenue ─────────────────────────────────────────────────────────────

describe('fetchRevenue', () => {
  it('returns mapped results', () => {
    mockQuery(ROWS);
    const result = service.fetchRevenue({ dateFrom: '2026-01-01', dateTo: '2026-01-31', repId: null });
    expect(result).toEqual(ROWS);
    expect(query.runSuiteQL).toHaveBeenCalledTimes(1);
  });

  it('includes salesrep filter when repId is provided', () => {
    mockQuery([]);
    service.fetchRevenue({ dateFrom: '2026-01-01', dateTo: '2026-01-31', repId: '42' });
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain('t.salesrep = 42');
  });

  it('omits salesrep filter when repId is null', () => {
    mockQuery([]);
    service.fetchRevenue({ dateFrom: '2026-01-01', dateTo: '2026-01-31', repId: null });
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).not.toContain('salesrep');
  });

  it('converts dates to MM/DD/YYYY in SQL', () => {
    mockQuery([]);
    service.fetchRevenue({ dateFrom: '2026-03-01', dateTo: '2026-03-31', repId: null });
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain("'03/01/2026'");
    expect(sql).toContain("'03/31/2026'");
  });
});

// ─── fetchTopCustomers ────────────────────────────────────────────────────────

describe('fetchTopCustomers', () => {
  it('returns mapped results', () => {
    mockQuery([{ customer: 'ACME', total: 200000 }]);
    const result = service.fetchTopCustomers({ dateFrom: '2026-01-01', dateTo: '2026-03-31', repId: null, limit: 5 });
    expect(result).toEqual([{ customer: 'ACME', total: 200000 }]);
  });

  it('uses FETCH FIRST N ROWS ONLY with provided limit', () => {
    mockQuery([]);
    service.fetchTopCustomers({ dateFrom: '2026-01-01', dateTo: '2026-03-31', repId: null, limit: 5 });
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain('FETCH FIRST 5 ROWS ONLY');
  });

  it('defaults limit to 10 when not provided', () => {
    mockQuery([]);
    service.fetchTopCustomers({ dateFrom: '2026-01-01', dateTo: '2026-03-31', repId: null });
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain('FETCH FIRST 10 ROWS ONLY');
  });
});

// ─── fetchPipeline ────────────────────────────────────────────────────────────

describe('fetchPipeline', () => {
  it('returns mapped results', () => {
    mockQuery([{ stage: 'CLOSEDWON', count: 3, total: 90000 }]);
    const result = service.fetchPipeline({ dateFrom: '2026-01-01', dateTo: '2026-03-31', repId: null });
    expect(result).toEqual([{ stage: 'CLOSEDWON', count: 3, total: 90000 }]);
  });

  it('queries Opportunity transaction type', () => {
    mockQuery([]);
    service.fetchPipeline({ dateFrom: '2026-01-01', dateTo: '2026-03-31', repId: null });
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain("'Opprtnty'");
  });
});

// ─── fetchTopItems ────────────────────────────────────────────────────────────

describe('fetchTopItems', () => {
  it('returns mapped results', () => {
    mockQuery([{ item: 'Widget A', qty: 100, total: 5000 }]);
    const result = service.fetchTopItems({ dateFrom: '2026-01-01', dateTo: '2026-03-31', repId: null });
    expect(result).toEqual([{ item: 'Widget A', qty: 100, total: 5000 }]);
  });

  it('includes rep filter when repId provided', () => {
    mockQuery([]);
    service.fetchTopItems({ dateFrom: '2026-01-01', dateTo: '2026-03-31', repId: '7' });
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain('t.salesrep = 7');
  });

  it('excludes lines with no item', () => {
    mockQuery([]);
    service.fetchTopItems({ dateFrom: '2026-01-01', dateTo: '2026-03-31', repId: null });
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain('tl.item IS NOT NULL');
  });
});
