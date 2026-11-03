# Connector capability evidence

Use this for questions such as “does the Revit connector support this?”, “what
survives send?”, or “why did this parameter arrive this way?”.

Record the host application and connector version, direction (`send`,
`receive`, or both), object/property/workflow and expected outcome. Check local
public docs, then the owning connector from `fieldkit.json`. Trace only the
relevant registration, filtering, conversion, serialization or receive path
and inspect tests or fixtures. Include shared connector code only when the host
repository delegates to it.

Return one confidence:

- **Confirmed:** documented and supported by current source/tests or an
  observed run for the stated versions.
- **Partially confirmed:** part of the path is evidenced; name the gap.
- **Inferred:** source suggests behaviour but runtime/version evidence is absent.
- **Unsupported:** evidence shows the path is intentionally unavailable.
- **Unknown:** public evidence is insufficient or contradictory.

Separate send from receive, direct support from generic fallback behaviour,
and current code from older documentation. A class name, UI label or issue
comment alone is not proof. Do not promise behaviour in an untested host or
connector version.
