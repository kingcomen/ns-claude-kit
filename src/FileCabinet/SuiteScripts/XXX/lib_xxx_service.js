/**
 * XXX — business logic module (fat, fully testable).
 * All N/* calls live here so unit tests can mock them cleanly.
 * HTML rendering is handled by sl_xxx_main.html — no serverWidget here.
 *
 * Replace XXX with your 3-letter topic prefix throughout this file.
 *
 * @NApiVersion 2.1
 * @author Wichit Wongta
 */
define(['N/search', 'N/log'], function (search, log) {

  // PerfTimer — include in every script per profiling standard.
  function makeTimer(label) {
    const start = Date.now();
    return {
      log: function () { log.debug({ title: label + ' ms', details: Date.now() - start }); },
    };
  }

  function validatePost(body) {
    if (!body || !body.id) throw new Error('Missing required field: id');
    return body;
  }

  function handlePost(request) {
    const body = JSON.parse(request.body);
    validatePost(body);
    // TODO: implement business logic — no silent fallbacks
    return { success: true, id: body.id };
  }

  return { makeTimer, validatePost, handlePost };
});
