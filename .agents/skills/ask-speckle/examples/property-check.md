# Example: property-led corridor check

Request: check corridor widths against a participant-supplied 1.8 m threshold.

1. Clarify whether 1.8 m applies universally or whether utilisation changes
   the threshold. The former is a supplied test; the latter needs scoped rules.
2. Resolve the project, model and exact version.
3. Check dataset availability and format.
4. Discover paths for corridor classification, width, units, name, level and
   expected utilisation. Inspect samples.
5. Confirm what the width property represents. If it is authoritative clear
   width, normalise units and run a read-only query.
6. Return pass, fail, missing and ambiguous rows using the evidence contract.

Do not silently treat missing corridors, absent utilisation or unverified width
semantics as passing results.
