# Child projects

Public Speckle repositories checked out by FieldKit appear beside this file.
Each is an independent Git repository with its own history, remote, licence
and contribution rules. Their contents are ignored by the FieldKit parent.

From the FieldKit root:

```sh
python3 tools/fieldkit.py list
python3 tools/fieldkit.py checkout bundle-spec
```

Before a Git operation, use `git rev-parse --show-toplevel` and `git status`
to confirm which repository you are affecting.

