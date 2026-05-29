/**
 * SO — Sales Order business logic (Phase 1 MVP).
 * All N/* calls live here; unit tests mock them.
 *
 * Actions: searchCustomer, searchItem, lookupCustomer, createSalesOrder.
 *
 * @NApiVersion 2.1
 * @author Wichit Wongta
 */
define(['N/query', 'N/search', 'N/record', 'N/runtime', 'N/log'], function (query, search, record, runtime, log) {

  function makeTimer(label) {
    const start = Date.now();
    return { log: function () { log.debug({ title: label + ' ms', details: Date.now() - start }); } };
  }

  /** Defang single quotes so user input can't break out of SuiteQL literal. */
  function escapeQ(q) {
    return String(q || '').replace(/'/g, "''");
  }

  function searchCustomer(q) {
    const timer = makeTimer('searchCustomer');
    const term  = escapeQ(q).trim();
    if (term.length < 2) { timer.log(); return []; }
    const sql =
      "SELECT id, entityid, companyname FROM customer " +
      "WHERE isinactive = 'F' " +
      "AND (LOWER(entityid) LIKE '%" + term.toLowerCase() + "%' " +
      "  OR LOWER(companyname) LIKE '%" + term.toLowerCase() + "%') " +
      "ORDER BY entityid FETCH FIRST 20 ROWS ONLY";
    const rows = query.runSuiteQL({ query: sql }).asMappedResults();
    timer.log();
    return rows;
  }

  function searchItem(q) {
    const timer = makeTimer('searchItem');
    const term  = escapeQ(q).trim();
    if (term.length < 2) { timer.log(); return []; }
    const sql =
      "SELECT id, itemid, displayname, itemtype FROM item " +
      "WHERE isinactive = 'F' " +
      "AND (LOWER(itemid) LIKE '%" + term.toLowerCase() + "%' " +
      "  OR LOWER(displayname) LIKE '%" + term.toLowerCase() + "%') " +
      "ORDER BY itemid FETCH FIRST 20 ROWS ONLY";
    const rows = query.runSuiteQL({ query: sql }).asMappedResults();
    timer.log();
    return rows;
  }

  /**
   * Reads fields needed for the customer-driven cascade so the UI can warn
   * the user (and the service can validate) before save.
   * Uses search.lookupFields (1 unit) — faster than runSuiteQL (10 units).
   */
  function lookupCustomer(id) {
    const timer = makeTimer('lookupCustomer');
    const r = search.lookupFields({
      type: search.Type.CUSTOMER,
      id: parseInt(id, 10),
      columns: ['currency', 'terms', 'taxitem', 'subsidiary', 'defaultshippingaddress'],
    });
    timer.log();
    return r;
  }

  /**
   * Creates a Sales Order in dynamic mode.
   * Cascade order matters: subsidiary (OneWorld) → entity → header overrides → lines → save.
   * Returns { id, tranid }.
   */
  function createSalesOrder(payload) {
    const timer = makeTimer('createSalesOrder');
    const header = payload && payload.header;
    const lines  = payload && payload.lines;

    if (!header || !header.entity) throw new Error('header.entity is required');
    if (!Array.isArray(lines) || lines.length === 0) throw new Error('at least one line is required');
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (!ln.item) throw new Error('lines[' + i + '].item is required');
      if (!ln.quantity || Number(ln.quantity) <= 0) throw new Error('lines[' + i + '].quantity must be > 0');
    }

    const rec = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });

    const isOW = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
    if (isOW && header.subsidiary) {
      rec.setValue({ fieldId: 'subsidiary', value: parseInt(header.subsidiary, 10) });
    }

    rec.setValue({ fieldId: 'entity', value: parseInt(header.entity, 10) });

    if (header.trandate) {
      rec.setValue({ fieldId: 'trandate', value: new Date(header.trandate) });
    }
    if (header.memo) {
      rec.setValue({ fieldId: 'memo', value: String(header.memo) });
    }

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      rec.selectNewLine({ sublistId: 'item' });
      rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item',     value: parseInt(ln.item, 10) });
      rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Number(ln.quantity) });
      if (ln.rate !== null && ln.rate !== undefined && ln.rate !== '') {
        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: Number(ln.rate) });
      }
      if (ln.description) {
        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: String(ln.description) });
      }
      rec.commitLine({ sublistId: 'item' });
    }

    const id = rec.save({ enableSourcing: true, ignoreMandatoryFields: false });
    const tranid = rec.getValue({ fieldId: 'tranid' });

    timer.log();
    return { id: id, tranid: tranid };
  }

  return {
    makeTimer:         makeTimer,
    escapeQ:           escapeQ,
    searchCustomer:    searchCustomer,
    searchItem:        searchItem,
    lookupCustomer:    lookupCustomer,
    createSalesOrder:  createSalesOrder,
  };
});
