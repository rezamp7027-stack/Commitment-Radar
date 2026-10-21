# Metrics and Quality Gates

These definitions are a measurement contract, not current performance claims. Both Supabase tables are empty, so predictive metrics cannot yet be measured.

| Metric | Definition | Guardrail | Current status |
|---|---|---|---|
| Connection success rate | Successful authorized connection attempts / all attempts | Requires attempt-level operational logging | Not measured |
| Messages captured | Frames received in a bounded capture | More frames do not prove correct parsing | CLI reports counts |
| Candidate event rate | Schema-matched candidate events / decodable messages | Measures parser coverage, not accuracy | Needs confirmed schema |
| Parse error rate | Malformed configured final-result events / matched final-result attempts | Separate malformed data from ignored non-final events | Partially measured |
| Reconciliation accuracy | Candidates matching trusted history / candidates independently checked | Document sample selection and mismatches | Not measured |
| Duplicate/conflict rate | Duplicate candidate IDs and conflicting multipliers per source | Do not overwrite existing rounds | Duplicate CSV IDs rejected; DB unique key deployed |
| Timestamp coverage | Rows with timezone-aware timestamps / all rows | Missing times weaken chronology | CSV quality report; database research fails closed |
| Verified-data coverage | Explicitly verified rows / all candidate rows | Verification must have independent evidence | Zero rows in Supabase |
| Historical hit rate | Observed multipliers at or above a predeclared threshold / verified rounds | Descriptive only; not a next-round probability guarantee | Not measured on live data |
| Wilson 95% interval | Binomial uncertainty interval around historical hit rate | Report sample size and avoid overinterpretation | Implemented |
| Brier score | Mean squared error of probabilistic estimates on outcomes | Compare on identical chronological splits | Baseline utilities implemented; live sample absent |
| Ledger evaluation coverage | Research-only estimates evaluated against a later verified round / due estimates | Never match a prediction to a result before creation time | Ledger empty |
| Candidate-model improvement | Candidate score minus baseline score on identical holdout observations | Requires adequate sample and uncertainty assessment | No candidate model benchmark yet |

## Measurement rules
1. Do not set numeric targets before a verified baseline exists.
2. Keep operational health, parser coverage, outcome authenticity, and predictive quality separate.
3. Always report denominators and sample sizes.
4. Do not silently drop malformed rows.
5. Compare models on identical chronological splits and preserve a final holdout.
6. Treat no demonstrated improvement as a valid research outcome.

## Immediate next step
After an authorized capture, record message count, event-type distribution, candidate count, parse errors, duplicate/conflict count, timestamp coverage, and manual reconciliation results. Do not claim predictive performance until enough verified history exists.
