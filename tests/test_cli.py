"""Tests for the bounded capture-to-Supabase CLI workflow."""
from __future__ import annotations
import contextlib
import io
import unittest
from unittest.mock import patch
from crash_feed_inspector import cli

class CaptureSyncCliTests(unittest.TestCase):
    def row(self, round_id="r-1"):
        return {
            "round_id": round_id,
            "timestamp_utc": "2026-10-21T12:00:00Z",
            "multiplier": 2.25,
            "source": "1xbet_websocket",
            "verified": False,
            "schema_version": "legacy-oncrash-candidate-v1",
        }

    def test_live_capture_sync_calls_private_store_after_capture(self):
        expected = {"mode": "live", "candidate_rows": 1, "inserted_rows": 1}
        output = io.StringIO()
        with (
            patch.object(cli, "capture") as capture_mock,
            patch.object(cli, "load_rounds_csv", return_value=[self.row()]) as load_mock,
            patch.object(cli, "sync_unverified_rounds", return_value=expected) as sync_mock,
            contextlib.redirect_stdout(output),
        ):
            result = cli.main(["capture-sync", "--batch-size", "37"])
        self.assertEqual(result, 0)
        capture_mock.assert_called_once_with()
        load_mock.assert_called_once()
        sync_mock.assert_called_once_with([self.row()], batch_size=37)
        self.assertIn('"candidate_rows": 1', output.getvalue())
        self.assertIn("remain unverified", output.getvalue())

    def test_dry_run_never_calls_live_sync(self):
        output = io.StringIO()
        with (
            patch.object(cli, "capture"),
            patch.object(cli, "load_rounds_csv", return_value=[self.row()]),
            patch.object(cli, "preview_sync", return_value={"mode": "dry_run", "candidate_rows": 1}) as preview_mock,
            patch.object(cli, "sync_unverified_rounds") as sync_mock,
            contextlib.redirect_stdout(output),
        ):
            result = cli.main(["capture-sync", "--dry-run"])
        self.assertEqual(result, 0)
        preview_mock.assert_called_once_with([self.row()])
        sync_mock.assert_not_called()
        self.assertIn('"dry_run"', output.getvalue())

    def test_no_candidates_skips_database_write(self):
        output = io.StringIO()
        with (
            patch.object(cli, "capture"),
            patch.object(cli, "load_rounds_csv", side_effect=ValueError("CSV contains no data rows.")),
            patch.object(cli, "sync_unverified_rounds") as sync_mock,
            contextlib.redirect_stdout(output),
        ):
            result = cli.main(["capture-sync"])
        self.assertEqual(result, 0)
        sync_mock.assert_not_called()
        self.assertIn('"candidate_rows": 0', output.getvalue())
        self.assertIn('"mode": "skipped"', output.getvalue())

    def test_invalid_batch_size_is_rejected_before_capture(self):
        with patch.object(cli, "capture") as capture_mock:
            with self.assertRaises(SystemExit):
                cli.main(["capture-sync", "--batch-size", "501"])
        capture_mock.assert_not_called()

if __name__ == "__main__":
    unittest.main()
