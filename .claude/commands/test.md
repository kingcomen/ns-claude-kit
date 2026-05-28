# /test — write/extend Jest unit tests

1. Cover the changed logic with `tests/unit/**/*.test.js` using the SuiteCloud Jest preset.
2. Mock N/* modules; assert error paths (no silent fallbacks).
3. Run `npm run test:cov`; keep coverage above threshold in jest.config.js.
