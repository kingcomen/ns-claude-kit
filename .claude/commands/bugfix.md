# /bugfix — production bug loop

1. Open a new GitHub issue describing the bug + repro.
2. Branch `fix/<issue#>`. Write a failing Jest test that reproduces it first.
3. Re-enter the INNER LOOP. Only run /deploy-sb + /e2e if UI is affected.
4. Never hotfix straight on SB.
