/**
 * SDB Sales Dashboard — thin Suitelet entry point.
 * GET  → reads sl_sdb_main.html from File Cabinet, injects user context, serves it.
 * POST → validates params, enforces role-based rep scope, calls service, returns JSON.
 *
 * Role enforcement: non-managers are locked to their own employeeId as repId.
 * Update MANAGER_ROLE_IDS to match the account's internal role IDs.
 *
 * @NScriptType Suitelet
 * @NApiVersion 2.1
 * @author Wichit Wongta
 */
define(['N/file', 'N/log', 'N/runtime', './lib_sdb_service'], function (file, log, runtime, service) {

  // Internal role IDs that may see all reps' data. Adjust per account.
  const MANAGER_ROLE_IDS = [3, 15]; // 3 = Administrator, 15 = Sales Manager (default NS IDs)

  const HTML_PATH    = '/SuiteScripts/Teibto/SDB/sl_sdb_main.html';
  const TBT_DS_CSS   = '/SuiteScripts/Teibto/ds/v1.42.0/tbt-theme.css';
  const TBT_DS_JS    = '/SuiteScripts/Teibto/ds/v1.42.0/tbt-ds.min.js';

  function loadUrl(path) {
    return file.load({ id: path }).url;
  }

  function onRequest(context) {
    const timer = service.makeTimer('onRequest');
    try {
      const user      = runtime.getCurrentUser();
      const isManager = MANAGER_ROLE_IDS.indexOf(user.role) !== -1;

      if (context.request.method === 'GET') {
        const html    = file.load({ id: HTML_PATH }).getContents();
        const userCtx = JSON.stringify({ employeeId: user.id, isManager: isManager });
        const rendered = html
          .replace('__TBT_DS_CSS__', loadUrl(TBT_DS_CSS))
          .replace('__TBT_DS_JS__',  loadUrl(TBT_DS_JS))
          .replace('"__USER_CTX__"', userCtx);
        context.response.write(rendered);
      } else {
        const body = JSON.parse(context.request.body);
        if (!body.dateFrom || !body.dateTo) throw new Error('Missing required fields: dateFrom, dateTo');

        const repId  = isManager ? (body.repId || null) : user.id;
        const params = { dateFrom: body.dateFrom, dateTo: body.dateTo, repId: repId };

        const result = {
          revenue:      service.fetchRevenue(params),
          topCustomers: service.fetchTopCustomers(Object.assign({}, params, { limit: 10 })),
          pipeline:     service.fetchPipeline(params),
          topItems:     service.fetchTopItems(Object.assign({}, params, { limit: 10 })),
        };

        context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
        context.response.write(JSON.stringify(result));
      }
    } catch (e) {
      log.error({ title: 'onRequest', details: e.message + '\n' + (e.stack || '') });
      throw e;
    } finally {
      timer.log();
    }
  }

  return { onRequest: onRequest };
});
