---
name: verify-work
description: Verify a change proportionately and report evidence and gaps.
---

# Verify work

1. Confirm the active Git root and inspect the diff.
2. Run the child repository's documented formatter, checks and tests relevant
   to the changed path.
3. Exercise the result from the participant's point of view when practical.
4. Check for accidental secrets, private URLs, generated debris and unrelated
   changes.
5. Report: checks passed, checks failed, checks not run, assumptions and a
   clear manual test the participant can repeat.

Never describe work as complete solely because code was generated or a command
exited successfully.

