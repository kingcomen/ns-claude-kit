/**
 * SO — Sales Order business logic (Phase 2).
 * All N/* calls live here; unit tests mock them.
 *
 * Actions: loadFormData, searchCustomer, searchItem, searchSalesrep,
 *          lookupCustomer, createSalesOrder.
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

  function rows(sql) {
    return query.runSuiteQL({ query: sql }).asMappedResults();
  }

  /**
   * Bulk-fetch all header dropdown sources in one round-trip.
   * Each query is 10 governance units — total 6 × 10 = 60 units (well under 1000).
   * The lists are small (< 200 rows each typically) and rarely change, so the
   * client can cache for the session.
   */
  function loadFormData() {
    const timer = makeTimer('loadFormData');
    const isOW = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
    const data = {
      isOneWorld:   isOW,
      subsidiaries: isOW
        ? rows("SELECT id, name FROM subsidiary WHERE isinactive = 'F' ORDER BY name")
        : [],
      locations:    rows("SELECT id, name FROM location       WHERE isinactive = 'F' ORDER BY name"),
      classes:      rows("SELECT id, name FROM classification WHERE isinactive = 'F' ORDER BY name"),
      departments:  rows("SELECT id, name FROM department     WHERE isinactive = 'F' ORDER BY name"),
      currencies:   rows("SELECT id, name, symbol FROM currency WHERE isinactive = 'F' ORDER BY name"),
      terms:        rows("SELECT id, name FROM term           WHERE isinactive = 'F' ORDER BY name"),
    };
    timer.log();
    return data;
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
    const result = rows(sql);
    timer.log();
    return result;
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
    const result = rows(sql);
    timer.log();
    return result;
  }

  function searchSalesrep(q) {
    const timer = makeTimer('searchSalesrep');
    const term  = escapeQ(q).trim();
    if (term.length < 2) { timer.log(); return []; }
    const sql =
      "SELECT id, entityid FROM employee " +
      "WHERE isinactive = 'F' AND issalesrep = 'T' " +
      "AND LOWER(entityid) LIKE '%" + term.toLowerCase() + "%' " +
      "ORDER BY entityid FETCH FIRST 20 ROWS ONLY";
    const result = rows(sql);
    timer.log();
    return result;
  }

  /**
   * Reads fields needed for the customer-driven cascade so the UI can
   * auto-fill header defaults before the user clicks Save.
   * Uses search.lookupFields (1 unit) — faster than runSuiteQL (10 units).
   */
  function lookupCustomer(id) {
    const timer = makeTimer('lookupCustomer');
    const r = search.lookupFields({
      type: search.Type.CUSTOMER,
      id: parseInt(id, 10),
      columns: ['currency', 'terms', 'taxitem', 'subsidiary', 'salesrep', 'defaultshippingaddress'],
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

    // Header overrides — only set when caller provided a value (NS sources from
    // customer defaults otherwise, so passing null/undefined would wipe them).
    function setIf(fieldId, value, transform) {
      if (value === null || value === undefined || value === '') return;
      rec.setValue({ fieldId: fieldId, value: transform ? transform(value) : value });
    }
    setIf('trandate',    header.trandate,    function (v) { return new Date(v); });
    setIf('location',    header.location,    function (v) { return parseInt(v, 10); });
    setIf('class',       header.classid,     function (v) { return parseInt(v, 10); });
    setIf('department',  header.department,  function (v) { return parseInt(v, 10); });
    setIf('currency',    header.currency,    function (v) { return parseInt(v, 10); });
    setIf('terms',       header.terms,       function (v) { return parseInt(v, 10); });
    setIf('salesrep',    header.salesrep,    function (v) { return parseInt(v, 10); });
    setIf('memo',        header.memo,        function (v) { return String(v); });

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
    loadFormData:      loadFormData,
    searchCustomer:    searchCustomer,
    searchItem:        searchItem,
    searchSalesrep:    searchSalesrep,
    lookupCustomer:    lookupCustomer,
    createSalesOrder:  createSalesOrder,
  };
});
