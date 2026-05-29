/**
 * Unit tests for lib_so_service.js (Phase 1 MVP).
 * @author Wichit Wongta
 */

jest.mock('N/query', () => ({ runSuiteQL: jest.fn() }));
jest.mock('N/search', () => ({
  Type: { CUSTOMER: 'customer' },
  lookupFields: jest.fn(),
}));
jest.mock('N/runtime', () => ({ isFeatureInEffect: jest.fn() }));
jest.mock('N/log', () => ({ debug: jest.fn(), error: jest.fn() }));

const mockRec = {
  setValue:                jest.fn(),
  getValue:                jest.fn(() => 'SO-0001'),
  selectNewLine:           jest.fn(),
  setCurrentSublistValue:  jest.fn(),
  commitLine:              jest.fn(),
  save:                    jest.fn(() => 12345),
};

jest.mock('N/record', () => ({
  Type:   { SALES_ORDER: 'salesorder' },
  create: jest.fn(() => mockRec),
}));

const service = require('../../src/FileCabinet/SuiteScripts/Teibto/SO/lib_so_service');
const query   = require('N/query');
const search  = require('N/search');
const record  = require('N/record');
const runtime = require('N/runtime');

function mockSql(rows) {
  query.runSuiteQL.mockReturnValueOnce({ asMappedResults: () => rows });
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mockRec).forEach(fn => fn.mockClear && fn.mockClear());
  mockRec.getValue.mockReturnValue('SO-0001');
  mockRec.save.mockReturnValue(12345);
});

// ─── escapeQ ──────────────────────────────────────────────────────────────────

describe('escapeQ', () => {
  it("doubles single quotes to prevent SQL injection", () => {
    expect(service.escapeQ("O'Brien")).toBe("O''Brien");
  });

  it('handles null and undefined', () => {
    expect(service.escapeQ(null)).toBe('');
    expect(service.escapeQ(undefined)).toBe('');
  });
});

// ─── searchCustomer ───────────────────────────────────────────────────────────

describe('searchCustomer', () => {
  it('returns mapped results from SuiteQL', () => {
    mockSql([{ id: 1, entityid: 'ACME', companyname: 'Acme Co' }]);
    const result = service.searchCustomer('acme');
    expect(result).toEqual([{ id: 1, entityid: 'ACME', companyname: 'Acme Co' }]);
  });

  it('returns empty array when query is too short', () => {
    const result = service.searchCustomer('a');
    expect(result).toEqual([]);
    expect(query.runSuiteQL).not.toHaveBeenCalled();
  });

  it('returns empty array when query is null/empty', () => {
    expect(service.searchCustomer(null)).toEqual([]);
    expect(service.searchCustomer('')).toEqual([]);
    expect(query.runSuiteQL).not.toHaveBeenCalled();
  });

  it('caps results with FETCH FIRST 20 ROWS ONLY', () => {
    mockSql([]);
    service.searchCustomer('acme');
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain('FETCH FIRST 20 ROWS ONLY');
  });

  it('escapes single quotes in user input', () => {
    mockSql([]);
    service.searchCustomer("O'Brien");
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain("o''brien"); // lowercased + escaped
    // All single quotes in the SQL must be in even-count groups (balanced literals)
    const quoteCount = (sql.match(/'/g) || []).length;
    expect(quoteCount % 2).toBe(0);
  });
});

// ─── searchItem ───────────────────────────────────────────────────────────────

describe('searchItem', () => {
  it('returns mapped results', () => {
    mockSql([{ id: 99, itemid: 'WIDGET', displayname: 'Widget', itemtype: 'InvtPart' }]);
    expect(service.searchItem('widg')).toEqual([
      { id: 99, itemid: 'WIDGET', displayname: 'Widget', itemtype: 'InvtPart' },
    ]);
  });

  it('queries item table not entity', () => {
    mockSql([]);
    service.searchItem('widg');
    expect(query.runSuiteQL.mock.calls[0][0].query).toMatch(/FROM\s+item\b/i);
  });
});

// ─── lookupCustomer ───────────────────────────────────────────────────────────

describe('lookupCustomer', () => {
  it('uses search.lookupFields with cascade columns (incl. salesrep)', () => {
    search.lookupFields.mockReturnValueOnce({ currency: [{ value: 1 }], terms: [], taxitem: [] });
    service.lookupCustomer(42);
    expect(search.lookupFields).toHaveBeenCalledWith({
      type: 'customer',
      id: 42,
      columns: ['currency', 'terms', 'taxitem', 'subsidiary', 'salesrep', 'defaultshippingaddress'],
    });
  });
});

// ─── searchSalesrep ───────────────────────────────────────────────────────────

describe('searchSalesrep', () => {
  it('returns mapped employee results', () => {
    mockSql([{ id: 17, entityid: 'Alice' }]);
    expect(service.searchSalesrep('alic')).toEqual([{ id: 17, entityid: 'Alice' }]);
  });

  it('filters to issalesrep=T only', () => {
    mockSql([]);
    service.searchSalesrep('alic');
    const sql = query.runSuiteQL.mock.calls[0][0].query;
    expect(sql).toContain("issalesrep = 'T'");
  });

  it('returns empty array when query is too short', () => {
    expect(service.searchSalesrep('a')).toEqual([]);
    expect(query.runSuiteQL).not.toHaveBeenCalled();
  });
});

// ─── loadFormData ─────────────────────────────────────────────────────────────

describe('loadFormData', () => {
  function setupOWQueries() {
    // 6 queries when OneWorld: subsidiary, location, classification, department, currency, term
    for (let i = 0; i < 6; i++) {
      query.runSuiteQL.mockReturnValueOnce({ asMappedResults: () => [] });
    }
  }

  it('runs all dropdown queries in OneWorld mode', () => {
    runtime.isFeatureInEffect.mockReturnValue(true);
    setupOWQueries();
    const out = service.loadFormData();
    expect(out.isOneWorld).toBe(true);
    expect(query.runSuiteQL).toHaveBeenCalledTimes(6);
    const sqls = query.runSuiteQL.mock.calls.map(c => c[0].query);
    expect(sqls.some(s => /FROM\s+subsidiary/i.test(s))).toBe(true);
    expect(sqls.some(s => /FROM\s+location/i.test(s))).toBe(true);
    expect(sqls.some(s => /FROM\s+classification/i.test(s))).toBe(true);
    expect(sqls.some(s => /FROM\s+department/i.test(s))).toBe(true);
    expect(sqls.some(s => /FROM\s+currency/i.test(s))).toBe(true);
    expect(sqls.some(s => /FROM\s+term\b/i.test(s))).toBe(true);
  });

  it('skips subsidiary query when OneWorld is OFF', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    for (let i = 0; i < 5; i++) {
      query.runSuiteQL.mockReturnValueOnce({ asMappedResults: () => [] });
    }
    const out = service.loadFormData();
    expect(out.isOneWorld).toBe(false);
    expect(out.subsidiaries).toEqual([]);
    expect(query.runSuiteQL).toHaveBeenCalledTimes(5);
    const sqls = query.runSuiteQL.mock.calls.map(c => c[0].query);
    expect(sqls.some(s => /FROM\s+subsidiary/i.test(s))).toBe(false);
  });

  it('filters inactive rows for every dropdown', () => {
    runtime.isFeatureInEffect.mockReturnValue(true);
    setupOWQueries();
    service.loadFormData();
    query.runSuiteQL.mock.calls.forEach(c => {
      expect(c[0].query).toMatch(/isinactive\s*=\s*'F'/i);
    });
  });
});

// ─── createSalesOrder ─────────────────────────────────────────────────────────

describe('createSalesOrder', () => {
  const validPayload = {
    header: { entity: 100, trandate: '2026-05-29', memo: 'test' },
    lines:  [{ item: 99, quantity: 2, rate: 50, description: 'a widget' }],
  };

  it('throws when header.entity is missing', () => {
    expect(() => service.createSalesOrder({ header: {}, lines: validPayload.lines }))
      .toThrow('header.entity is required');
  });

  it('throws when lines array is empty', () => {
    expect(() => service.createSalesOrder({ header: { entity: 1 }, lines: [] }))
      .toThrow('at least one line');
  });

  it('throws when a line has no item', () => {
    expect(() => service.createSalesOrder({
      header: { entity: 1 }, lines: [{ quantity: 1 }],
    })).toThrow('lines[0].item is required');
  });

  it('throws when a line has zero or negative quantity', () => {
    expect(() => service.createSalesOrder({
      header: { entity: 1 }, lines: [{ item: 5, quantity: 0 }],
    })).toThrow('lines[0].quantity must be > 0');
  });

  it('creates record in dynamic mode', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    service.createSalesOrder(validPayload);
    expect(record.create).toHaveBeenCalledWith({ type: 'salesorder', isDynamic: true });
  });

  it('sets entity before save', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    service.createSalesOrder(validPayload);
    const entityCalls = mockRec.setValue.mock.calls.filter(c => c[0].fieldId === 'entity');
    expect(entityCalls).toHaveLength(1);
    expect(entityCalls[0][0].value).toBe(100);
  });

  it('sets subsidiary BEFORE entity when OneWorld is enabled', () => {
    runtime.isFeatureInEffect.mockReturnValue(true);
    service.createSalesOrder({
      header: { entity: 100, subsidiary: 7 },
      lines:  validPayload.lines,
    });
    const subOrder    = mockRec.setValue.mock.invocationCallOrder[
      mockRec.setValue.mock.calls.findIndex(c => c[0].fieldId === 'subsidiary')
    ];
    const entityOrder = mockRec.setValue.mock.invocationCallOrder[
      mockRec.setValue.mock.calls.findIndex(c => c[0].fieldId === 'entity')
    ];
    expect(subOrder).toBeLessThan(entityOrder);
  });

  it('does NOT set subsidiary when OneWorld is disabled', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    service.createSalesOrder({
      header: { entity: 100, subsidiary: 7 },
      lines:  validPayload.lines,
    });
    const subCalls = mockRec.setValue.mock.calls.filter(c => c[0].fieldId === 'subsidiary');
    expect(subCalls).toHaveLength(0);
  });

  it('uses sublist API in dynamic-mode sequence per line', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    service.createSalesOrder({
      header: { entity: 100 },
      lines:  [
        { item: 1, quantity: 2 },
        { item: 3, quantity: 4, rate: 10 },
      ],
    });
    expect(mockRec.selectNewLine).toHaveBeenCalledTimes(2);
    expect(mockRec.commitLine).toHaveBeenCalledTimes(2);
    // each selectNewLine before its corresponding commitLine
    const selectOrder = mockRec.selectNewLine.mock.invocationCallOrder;
    const commitOrder = mockRec.commitLine.mock.invocationCallOrder;
    expect(selectOrder[0]).toBeLessThan(commitOrder[0]);
    expect(selectOrder[1]).toBeLessThan(commitOrder[1]);
  });

  it('omits rate field when line has no rate (let NS source default)', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    service.createSalesOrder({
      header: { entity: 100 },
      lines:  [{ item: 1, quantity: 2 }],  // no rate
    });
    const rateCalls = mockRec.setCurrentSublistValue.mock.calls.filter(c => c[0].fieldId === 'rate');
    expect(rateCalls).toHaveLength(0);
  });

  it('saves with enableSourcing and returns {id, tranid}', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    const result = service.createSalesOrder(validPayload);
    expect(mockRec.save).toHaveBeenCalledWith({ enableSourcing: true, ignoreMandatoryFields: false });
    expect(result).toEqual({ id: 12345, tranid: 'SO-0001' });
  });

  it('surfaces save errors (no silent fallback)', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    mockRec.save.mockImplementationOnce(() => { throw new Error('Field "subsidiary" is required'); });
    expect(() => service.createSalesOrder(validPayload)).toThrow('Field "subsidiary" is required');
  });

  it('sets header override fields when provided', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    service.createSalesOrder({
      header: {
        entity: 100, trandate: '2026-05-29', memo: 'm',
        location: 5, classid: 7, department: 9, currency: 1, terms: 4, salesrep: 17,
      },
      lines: validPayload.lines,
    });
    const calls = mockRec.setValue.mock.calls.map(c => c[0].fieldId);
    expect(calls).toEqual(expect.arrayContaining([
      'entity', 'trandate', 'memo', 'location', 'class', 'department', 'currency', 'terms', 'salesrep',
    ]));
  });

  it('skips header override fields when value is null/undefined/empty string', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    service.createSalesOrder({
      header: { entity: 100, location: null, classid: '', department: undefined },
      lines:  validPayload.lines,
    });
    const calls = mockRec.setValue.mock.calls.map(c => c[0].fieldId);
    expect(calls).not.toContain('location');
    expect(calls).not.toContain('class');
    expect(calls).not.toContain('department');
  });

  it('uses fieldId "class" not "classid" for class field', () => {
    runtime.isFeatureInEffect.mockReturnValue(false);
    service.createSalesOrder({
      header: { entity: 100, classid: 7 },
      lines:  validPayload.lines,
    });
    const classCall = mockRec.setValue.mock.calls.find(c => c[0].fieldId === 'class');
    expect(classCall).toBeDefined();
    expect(classCall[0].value).toBe(7);
  });
});
