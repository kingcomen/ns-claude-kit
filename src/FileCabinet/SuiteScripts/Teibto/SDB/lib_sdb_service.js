/**
 * SDB — Sales Dashboard business logic.
 * All N/* calls live here; unit tests mock them.
 *
 * @NApiVersion 2.1
 * @author Wichit Wongta
 */
define(['N/query', 'N/format', 'N/log'], function (query, format, log) {

  function makeTimer(label) {
    const start = Date.now();
    return { log: function () { log.debug({ title: label + ' ms', details: Date.now() - start }); } };
  }

  /** YYYY-MM-DD → MM/DD/YYYY for SuiteQL date literals (never use format.format for SQL) */
  function toSuiteQLDate(isoDate) {
    const d  = format.parse({ value: isoDate, type: format.Type.DATE });
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return mm + '/' + dd + '/' + d.getFullYear();
  }

  function repFilter(repId) {
    return repId ? ' AND t.salesrep = ' + parseInt(repId, 10) : '';
  }

  function fetchRevenue(params) {
    const timer = makeTimer('fetchRevenue');
    const from  = toSuiteQLDate(params.dateFrom);
    const to    = toSuiteQLDate(params.dateTo);
    const sql =
      'SELECT TO_CHAR(t.trandate,\'YYYY-MM\') AS month, SUM(t.amount) AS total ' +
      'FROM transaction t ' +
      'WHERE t.type = \'CustInvc\' ' +
      'AND t.trandate >= \'' + from + '\' AND t.trandate <= \'' + to + '\'' +
      repFilter(params.repId) + ' ' +
      'GROUP BY TO_CHAR(t.trandate,\'YYYY-MM\') ' +
      'ORDER BY month';
    const result = query.runSuiteQL({ query: sql });
    timer.log();
    return result.asMappedResults();
  }

  function fetchTopCustomers(params) {
    const timer = makeTimer('fetchTopCustomers');
    const from  = toSuiteQLDate(params.dateFrom);
    const to    = toSuiteQLDate(params.dateTo);
    const n     = parseInt(params.limit, 10) || 10;
    const sql =
      'SELECT e.altname AS customer, SUM(t.amount) AS total ' +
      'FROM transaction t ' +
      'JOIN entity e ON t.entity = e.id ' +
      'WHERE t.type = \'CustInvc\' ' +
      'AND t.trandate >= \'' + from + '\' AND t.trandate <= \'' + to + '\'' +
      repFilter(params.repId) + ' ' +
      'GROUP BY e.altname ' +
      'ORDER BY total DESC ' +
      'FETCH FIRST ' + n + ' ROWS ONLY';
    const result = query.runSuiteQL({ query: sql });
    timer.log();
    return result.asMappedResults();
  }

  function fetchPipeline(params) {
    const timer = makeTimer('fetchPipeline');
    const from  = toSuiteQLDate(params.dateFrom);
    const to    = toSuiteQLDate(params.dateTo);
    const sql =
      'SELECT t.salesstage AS stage, COUNT(*) AS count, SUM(t.projectedamount) AS total ' +
      'FROM transaction t ' +
      'WHERE t.type = \'Opprtnty\' ' +
      'AND t.trandate >= \'' + from + '\' AND t.trandate <= \'' + to + '\'' +
      repFilter(params.repId) + ' ' +
      'GROUP BY t.salesstage ' +
      'ORDER BY total DESC';
    const result = query.runSuiteQL({ query: sql });
    timer.log();
    return result.asMappedResults();
  }

  function fetchTopItems(params) {
    const timer = makeTimer('fetchTopItems');
    const from  = toSuiteQLDate(params.dateFrom);
    const to    = toSuiteQLDate(params.dateTo);
    const n     = parseInt(params.limit, 10) || 10;
    const sql =
      'SELECT i.displayname AS item, SUM(tl.quantity) AS qty, SUM(tl.amount) AS total ' +
      'FROM transactionline tl ' +
      'JOIN transaction t ON tl.transaction = t.id ' +
      'JOIN item i ON tl.item = i.id ' +
      'WHERE t.type = \'CustInvc\' ' +
      'AND t.trandate >= \'' + from + '\' AND t.trandate <= \'' + to + '\'' +
      repFilter(params.repId) + ' ' +
      'AND tl.item IS NOT NULL ' +
      'GROUP BY i.displayname ' +
      'ORDER BY total DESC ' +
      'FETCH FIRST ' + n + ' ROWS ONLY';
    const result = query.runSuiteQL({ query: sql });
    timer.log();
    return result.asMappedResults();
  }

  return { makeTimer: makeTimer, toSuiteQLDate: toSuiteQLDate, fetchRevenue: fetchRevenue, fetchTopCustomers: fetchTopCustomers, fetchPipeline: fetchPipeline, fetchTopItems: fetchTopItems };
});
