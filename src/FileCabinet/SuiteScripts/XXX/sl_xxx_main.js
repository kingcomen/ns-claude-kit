/**
 * XXX Suitelet — thin entry point.
 * GET  → reads sl_xxx_main.html from File Cabinet and serves it (tbt-ds UI)
 * POST → delegates to lib_xxx_service.handlePost (JSON API)
 *
 * Replace XXX with your 3-letter topic prefix and update HTML_PATH.
 *
 * @NScriptType Suitelet
 * @NApiVersion 2.1
 * @author Wichit Wongta
 */
define(['N/file', 'N/log', './lib_xxx_service'], function (file, log, service) {

  var HTML_PATH = '/SuiteScripts/Teibto/XXX/sl_xxx_main.html';

  function onRequest(context) {
    var timer = service.makeTimer('onRequest');
    try {
      if (context.request.method === 'GET') {
        context.response.write(file.load({ id: HTML_PATH }).getContents());
      } else {
        var result = service.handlePost(context.request);
        context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
        context.response.write(JSON.stringify(result));
      }
    } catch (e) {
      log.error({ title: 'onRequest', details: e.message + '\n' + e.stack });
      throw e; // surface — no silent fallback
    } finally {
      timer.log();
    }
  }

  return { onRequest };
});
