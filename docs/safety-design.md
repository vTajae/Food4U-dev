# Safety layer design

**Status: design. Nothing below is implemented.** Today `POST /api/suggestion` is not configured in production and, when it is configured, returns food items without checking them against the profile. The product copy says so, and it will keep saying so until this layer exists.

## Principle

Candidate generation and safety validation are separate. A language model may propose a meal; it never decides whether the meal is safe. A deterministic rules engine, with the diet protocols as data and a unit test per rule, is the only component allowed to say "fits", "caution" or "avoid for now", and every verdict carries machine-readable reasons the UI shows.

## Pipeline

```
profile + question
  └─► candidate generation (model or search)         may be wrong; never trusted on its own
        └─► ingredient tokenization + normalization   map free text onto known foods
              └─► rules engine                        exclude / require / limit, per protocol
                    └─► nutrition check               USDA FoodData Central values
                          └─► verdict + reasons       veto, or pass with exactly what was checked
```

A candidate that fails any hard rule is dropped before rendering. A candidate that passes is shown with the constraints it was checked against: the "check strip" in `frontend/DESIGN.md`.

## Protocols as data

Each protocol is a record of `exclude`, `require` and `limit` rules keyed to normalized foods, so a dietitian can review it without reading code and a test can assert each rule.

| Protocol | Shape |
|---|---|
| Crohn's Disease Exclusion Diet (CDED) | Phased. Mandatory daily foods and strict exclusions in phase 1 (weeks 1–6), gradual reintroduction in phase 2 (weeks 7–12). Needs the start date to pick the phase |
| Low-residue | Excludes whole grains, raw vegetables, nuts, seeds and tough meats; prefers refined grains and peeled, cooked produce |
| Low-FODMAP | Excludes fermentable carbohydrates by food and portion |
| Specific Carbohydrate Diet | Excludes complex carbohydrates and most dairy |
| Mediterranean, semi-vegetarian | Limits rather than hard exclusions |

Allergies and intolerances from the profile are hard excludes under every protocol.

## Facts, external facts and inferences

Every value the engine uses is tagged `user_fact` (the person said it), `external_fact` (a trusted dataset said it) or `inference` (the model assumed it). An inference never silently becomes a fact: if it would change a verdict, the UI asks before the verdict is shown.

## Context completeness

Before any research starts, a weighted checklist (condition and phenotype, flare status, strictures, weight goal, budget, household size, cooking ability) scores how much is known. Below a threshold the product asks the highest-weight missing question instead of guessing. Today's onboarding steps are the first part of this checklist.

## What this is not

It is not medical advice and does not replace a clinician or dietitian. Passing automation is not a safety certification. The product keeps saying "Food4U suggests food, not treatment".

## Build order

1. A normalized food vocabulary and the rules engine: pure functions, one test per rule.
2. Protocol data for allergies and intolerances first, then low-residue, then CDED.
3. The verdict schema, with the check strip wired to real verdicts.
4. Only then, candidate generation enabled in production.
