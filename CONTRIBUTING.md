# Contributing

## Branches and commits

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `test/…`, `ci/…`.
- Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org/), for example `fix(onboarding): keep drafts after choosing a diet`. The body says why, not what.
- `main` moves only by squash-merged pull request after the gates below pass locally. No force pushes.

## Pull requests

The template asks for three things; fill in all three.

1. **Summary**: the smallest view that makes the change clear (a diff sketch, call tree or file tree), not a narrative.
2. **Evidence**: what failed before and passes after. A bug fix includes a regression test that was seen failing without the fix. Quote the decisive line of the output, not whole logs.
3. **Merge danger**: one-way or two-way door, and the blast radius.

There is no CI by choice; the gates run on the developer's machine, and the Evidence section of the pull request is the record of that run.

## Before you push

```sh
npm test
cd frontend && npm run lint && npm run typecheck && npm test
cd backend && .venv/bin/python -m pytest tests -q    # Windows: .venv\Scripts\python
```

Run `npm run e2e` from `frontend/` when the change touches a screen, and `node contract/local-next.mjs` when it touches routing, auth or the public API shape.

## Rules that do not bend

- No secrets, connection strings or personal data in the repository, in fixtures or in PR text. Dev values live in `frontend/.dev.vars` and `backend/.env`, both ignored.
- Never run tests or scripts against production except the documented post-deploy checks.
- Do not weaken a gate to make it pass. Add a `test.fixme` with an issue id instead.
- Product copy states what the software does today. Planned behavior is labelled as planned.
