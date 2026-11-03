# Example: geometry escalation

Request: calculate the minimum unobstructed clear width along every corridor.

The dataset contains corridor objects but no authoritative clear-width value.
The SQL route cannot query geometry. Stop the property analysis and propose a
geometry route:

1. Retrieve the identified corridor and obstruction objects with the relevant
   SDK while preserving Speckle object IDs.
2. State the measurement plane, reference faces, height range, tolerances and
   treatment of doors, columns, furniture and temporary objects.
3. Obtain those definitions from an applicable practice pack or project owner.
4. Test the calculation on small synthetic geometry with a known answer.
5. Join calculated results back to the evidence table.

Do not describe the result as regulatory compliance unless the governing rule
and scope have been explicitly supplied.
