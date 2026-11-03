# Model-analysis evidence contract

Keep enough evidence for another person to inspect or repeat the answer.

## Analysis identity

- Speckle server and project ID
- model ID and exact version ID
- version timestamp and source application when available
- dataset format and schema version
- query/script revision and execution time

Never include access tokens or private URLs in committed output.

## Selection and rule

- object-selection method and classification paths
- property paths or relationships used
- original values and units
- conversions, tolerances and rounding
- supplied threshold or scoped rule source
- exclusions and stop conditions

## Result rows

Use stable object identifiers and include, where relevant:

```text
object_id
object_name
model_id
version_id
classification
location_or_level
source_property_path
original_value
original_unit
normalised_value
rule_or_threshold
status
evidence
notes
```

Use at least `pass`, `fail`, `missing` and `ambiguous` statuses. Do not collapse
missing or ambiguous objects into pass/fail totals.

## Summary

Report counts for each status, representative samples, assumptions, unsupported
cases, checks performed and checks not performed. Save the read-only query or
calculation separately from its generated output.
