import importlib.util
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).parents[1] / "tools" / "fieldkit.py"
SPEC = importlib.util.spec_from_file_location("fieldkit_tool", MODULE_PATH)
assert SPEC and SPEC.loader
fieldkit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fieldkit)

ANALYSIS_SCRIPT = Path(__file__).parents[1] / ".agents" / "skills" / "build-with-speckle" / "scripts" / "new_analysis.py"
ANALYSIS_SPEC = importlib.util.spec_from_file_location("new_analysis", ANALYSIS_SCRIPT)
assert ANALYSIS_SPEC and ANALYSIS_SPEC.loader
new_analysis = importlib.util.module_from_spec(ANALYSIS_SPEC)
ANALYSIS_SPEC.loader.exec_module(new_analysis)


def fake_projects():
    return {
        name: {"directory": name, "url": f"https://example.test/{name}.git", "purpose": name}
        for name in fieldkit.ANALYSIS_FOUNDATIONS
    }


class FieldKitDoctorTests(unittest.TestCase):
    def run_doctor(self, root: Path, projects_dir: Path):
        output = io.StringIO()
        with patch.object(fieldkit, "_tool_status", return_value=(True, "test")), redirect_stdout(output):
            ready = fieldkit.doctor(fake_projects(), root=root, projects_dir=projects_dir)
        return ready, output.getvalue()

    def test_doctor_reports_missing_foundations_without_printing_token(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            projects = root / "projects"
            projects.mkdir()
            secret = "do-not-print-this-token"
            (root / "mise.local.toml").write_text(f'[env]\nSPECKLE_TOKEN = "{secret}"\n', encoding="utf-8")
            ready, output = self.run_doctor(root, projects)
            self.assertFalse(ready)
            self.assertIn("not checked out", output)
            self.assertIn("configured (value hidden)", output)
            self.assertNotIn(secret, output)

    def test_doctor_distinguishes_checkout_dependencies_and_build(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            projects = root / "projects"
            for name in fieldkit.ANALYSIS_FOUNDATIONS:
                (projects / name / ".git").mkdir(parents=True)
            (projects / "fieldkit-admin-mcp" / ".git").mkdir(parents=True)
            ready, output = self.run_doctor(root, projects)
            self.assertTrue(ready)
            self.assertIn("FieldKit MCP checkout [optional]: present", output)
            self.assertIn("FieldKit MCP dependencies [optional]: not installed", output)
            self.assertIn("FieldKit MCP build [optional]: not built", output)

    def test_checkout_never_updates_existing_git_checkout(self):
        with tempfile.TemporaryDirectory() as temp:
            projects = Path(temp)
            (projects / "docs" / ".git").mkdir(parents=True)
            with patch("subprocess.run") as run:
                self.assertTrue(fieldkit.checkout("docs", fake_projects()["docs"], projects))
                run.assert_not_called()

    def test_setup_checks_out_only_foundations_then_runs_doctor(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            projects = root / "projects"
            with patch.object(fieldkit, "checkout", return_value=True) as checkout, patch.object(
                fieldkit, "doctor", return_value=True
            ) as doctor:
                self.assertTrue(fieldkit.setup(fake_projects(), root=root, projects_dir=projects))
                self.assertEqual(
                    [call.args[0] for call in checkout.call_args_list],
                    list(fieldkit.ANALYSIS_FOUNDATIONS),
                )
                doctor.assert_called_once_with(fake_projects(), root=root, projects_dir=projects)

    def test_checkout_refuses_existing_non_git_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            projects = Path(temp)
            (projects / "docs").mkdir()
            with patch("subprocess.run") as run:
                self.assertFalse(fieldkit.checkout("docs", fake_projects()["docs"], projects))
                run.assert_not_called()


class InvestigationFixtureTests(unittest.TestCase):
    def test_route_fixture_has_required_cases_and_safe_boundaries(self):
        fixture = Path(__file__).parents[1] / ".agents" / "skills" / "ask-speckle" / "tests" / "route-cases.json"
        cases = json.loads(fixture.read_text(encoding="utf-8"))
        routes = {case["expected_route"] for case in cases}
        self.assertIn("properties-first-then-geometry-if-needed", routes)
        self.assertIn("scoped-practice-or-authority-required", routes)
        self.assertGreaterEqual(len(cases), 7)

    def test_action_pillars_are_independent_and_cover_distinct_requests(self):
        fixture = Path(__file__).parents[1] / "skills" / "pillar-cases.json"
        cases = json.loads(fixture.read_text(encoding="utf-8"))
        actions = {case["action"] for case in cases}
        self.assertEqual(actions, {"ASK", "BUILD", "DELEGATE"})
        for action in actions:
            self.assertGreaterEqual(
                sum(case["action"] == action for case in cases),
                2,
                f"{action} needs independent examples",
            )


class AnalysisScaffoldTests(unittest.TestCase):
    def test_scaffold_protects_local_data_and_creates_review_structure(self):
        with tempfile.TemporaryDirectory() as temp:
            target = new_analysis.create_analysis("corridor-widths", Path(temp))
            self.assertEqual((target / ".gitignore").read_text(encoding="utf-8"), "data/\noutputs/\n.ipynb_checkpoints/\n")
            for relative in ("README.md", "queries", "scripts", "notebooks", "tests", "data", "outputs"):
                self.assertTrue((target / relative).exists())

    def test_scaffold_refuses_overwrite_and_unsafe_names(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            new_analysis.create_analysis("door-ratings", root)
            with self.assertRaises(FileExistsError):
                new_analysis.create_analysis("door-ratings", root)
            with self.assertRaises(ValueError):
                new_analysis.create_analysis("../outside", root)


class WorkshopSetupScriptTests(unittest.TestCase):
    def test_shell_setup_has_safe_existing_path_and_origin_guards(self):
        script = (Path(__file__).parents[1] / "tools" / "setup.sh").read_text(encoding="utf-8")
        self.assertIn('[ -L "$target" ]', script)
        self.assertIn('[ ! -d "$target/.git" ]', script)
        self.assertIn('remote get-url origin', script)
        self.assertNotIn('git pull', script)
        self.assertNotIn('curl ', script)

    def test_powershell_setup_has_safe_existing_path_and_origin_guards(self):
        script = (Path(__file__).parents[1] / "tools" / "setup.ps1").read_text(encoding="utf-8")
        self.assertIn('$Item.LinkType', script)
        self.assertIn('remote get-url origin', script)
        self.assertNotIn('git pull', script)
        self.assertNotIn('Invoke-WebRequest', script)


if __name__ == "__main__":
    unittest.main()
