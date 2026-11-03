# Speckle data routes

Choose the lightest route that can produce defensible evidence.

## Source precedence

1. Inspect the actual authorised model data.
2. Use the checked-out Bundle specification for portable structure and meaning.
3. Use public documentation for supported product behaviour and terminology.
4. Use SDK source and tests for exact methods and transport behaviour.
5. Use connector source for host-specific conversion and round-trip behaviour.
6. Make an inference only when the prior sources cannot answer it, and label it.

## Dataset first

With FieldKit Admin + Data MCP:

1. Resolve project, model and version identifiers.
2. Call `check_dataset_availability`.
3. Call `list_model_property_paths` before assuming paths or types.
4. Inspect a small sample before a complete query.

### Bundle dataset

Use the local `projects/speckle-bundle-spec` checkout as the authority for the
current schema. Properties normally require joining `bundle.object_properties`
to `bundle.paths`; relationships use the graph tables. Inspect schemas rather
than copying an old query unchanged.

### Legacy EAV/packfile

Use `eav.properties` for property-led questions. Its common columns are
`object_id`, `path`, `type`, `value_text` and `value_num`. Inspect the main
packfile with `DESCRIBE` before using its less stable object tables.

### No queryable dataset

Do not pretend the model is empty. Select an SDK route when object transport is
available, or explain the required publishing/import path. Use the Python SDK
for Python analysis and the .NET SDK when the surrounding application or
connector is .NET-native.

## When SQL is insufficient

- **Relationships:** inspect Bundle graph tables.
- **Geometry or derived spatial measurement:** retrieve objects/geometry with
  an SDK or use a suitable host/geometry library. Preserve object identifiers
  so the result can be traced back.
- **Host-specific semantics:** inspect the originating public connector and
  docs. Confirm the source application from the model version when possible.
- **Run on every version:** prove the calculation first, then wrap it using the
  smallest public Automate starter.

The dataset SQL route does not expose geometry. A property named `Width` is not
evidence that it is clear, minimum, finished-face or unobstructed width.
