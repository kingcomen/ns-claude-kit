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
  it('uses search.lookupFields with cascade columns', () => {
    search.lookupFields.mockReturnValueOnce({ currency: [{ value: 1 }], terms: [], taxitem: [] });
    service.lookupCustomer(42);
    expect(search.lookupFields).toHaveBeenCalledWith({
      type: 'customer',
      id: 42,
      columns: ['currency', 'terms', 'taxitem', 'subsidiary', 'defaultshippingaddress'],
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
});
