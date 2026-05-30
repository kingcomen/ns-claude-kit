/**
 * SO Sales Order — thin Suitelet entry point.
 * GET  → reads sl_so_main.html, injects DS bundle URLs + user context, serves it.
 * POST → dispatches by body.action: load_form_data, search_customer, search_item,
 *        search_salesrep, lookup_customer, create_so.
 *
 * @NScriptType Suitelet
 * @NApiVersion 2.1
 * @author Wichit Wongta
 */
define(['N/file', 'N/log', 'N/runtime', './lib_so_service'], function (file, log, runtime, service) {

  const HTML_PATH  = '/SuiteScripts/Teibto/SO/sl_so_main.html';
  const TBT_DS_CSS = '/SuiteScripts/Teibto/ds/v1.42.1/tbt-theme.css';
  const TBT_DS_JS  = '/SuiteScripts/Teibto/ds/v1.42.1/tbt-ds.min.js';

  function loadUrl(path) {
    return file.load({ id: path }).url;
  }

  function dispatchPost(body) {
    const action = body && body.action;
    switch (action) {
      case 'load_form_data':   return service.loadFormData();
      case 'search_customer':  return service.searchCustomer(body.q);
      case 'search_item':      return service.searchItem(body.q);
      case 'search_salesrep':  return service.searchSalesrep(body.q);
      case 'lookup_customer':  return service.lookupCustomer(body.id);
      case 'create_so':        return service.createSalesOrder({ header: body.header, lines: body.lines });
      default: throw new Error('Unknown action: ' + action);
    }
  }

  function onRequest(context) {
    const timer = service.makeTimer('onRequest');
    try {
      if (context.request.method === 'GET') {
        const ctx     = service.getRoleContext();
        const userCtx = JSON.stringify({ employeeId: ctx.employeeId, name: ctx.name, isManager: ctx.isManager });
        const html    = file.load({ id: HTML_PATH }).getContents();
        const rendered = html
          .replace('__TBT_DS_CSS__', loadUrl(TBT_DS_CSS))
          .replace('__TBT_DS_JS__',  loadUrl(TBT_DS_JS))
          .replace('"__USER_CTX__"', userCtx);
        context.response.write(rendered);
      } else {
        const body   = JSON.parse(context.request.body || '{}');
        const result = dispatchPost(body);
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
