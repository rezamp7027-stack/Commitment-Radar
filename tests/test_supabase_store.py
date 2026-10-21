import json
import unittest
from unittest.mock import patch

from crash_feed_inspector.supabase_store import preview_sync, sync_unverified_rounds


class FakeResponse:
    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return self.body


class SupabaseStoreTests(unittest.TestCase):
    def row(self, round_id, verified=False):
        return {
            "round_id": round_id,
            "timestamp_utc": "2026-01-01T00:00:00Z",
            "multiplier": 2.25,
            "source": "test-feed",
            "verified": verified,
            "schema_version": "fixture-v1",
        }

    def test_preview_never_sends_verified_rows(self):
        report = preview_sync([self.row("a"), self.row("b", verified=True)])
        self.assertEqual(report["candidate_rows"], 1)
        self.assertEqual(report["verified_rows_skipped"], 1)
        self.assertEqual(report["mode"], "dry_run")

    def test_missing_credentials_fails_closed(self):
        with patch.dict("os.environ", {"SUPABASE_URL": "", "SUPABASE_SERVICE_ROLE_KEY": ""}, clear=False):
            with self.assertRaisesRegex(ValueError, "SUPABASE_URL is missing"):
                sync_unverified_rounds([self.row("a")])

    def test_invalid_url_rejected(self):
        with self.assertRaisesRegex(ValueError, "SUPABASE_URL must be an HTTPS"):
            sync_unverified_rounds([self.row("a")], supabase_url="https://user:pass@example.com", service_role_key="secret")

    def test_insert_uses_private_key_and_ignores_duplicates(self):
        seen = []

        def opener(request, timeout):
            seen.append((request, timeout))
            body = json.loads(request.data.decode("utf-8"))
            self.assertEqual(body[0]["verified"], False)
            self.assertEqual(body[0]["verification_status"], "pending_manual_confirmation")
            self.assertNotIn("verification_method", body[0])
            return FakeResponse(b'[{"id":1}]')

        report = sync_unverified_rounds(
            [self.row("a"), self.row("b", verified=True)],
            supabase_url="https://project.supabase.co",
            service_role_key="private-secret",
            opener=opener,
        )
        self.assertEqual(report["inserted_rows"], 1)
        self.assertEqual(report["verified_rows_skipped"], 1)
        request, timeout = seen[0]
        self.assertEqual(request.get_header("Apikey"), "private-secret")
        self.assertIn("ignore-duplicates", request.get_header("Prefer"))
        self.assertEqual(timeout, 20)
        self.assertNotIn("private-secret", repr(report))

    def test_batches_and_counts_ignored_duplicates(self):
        calls = []

        def opener(request, timeout):
            calls.append(json.loads(request.data.decode("utf-8")))
            # Simulate one already-existing row in the first batch.
            return FakeResponse(b'[{"id":1}]' if len(calls) == 1 else b'[]')

        rows = [self.row(str(i)) for i in range(3)]
        report = sync_unverified_rounds(
            rows,
            batch_size=2,
            supabase_url="https://project.supabase.co",
            service_role_key="private-secret",
            opener=opener,
        )
        self.assertEqual([len(batch) for batch in calls], [2, 1])
        self.assertEqual(report["batch_count"], 2)
        self.assertEqual(report["inserted_rows"], 1)
        self.assertEqual(report["duplicates_ignored"], 2)

    def test_verified_rows_only_causes_no_network_call(self):
        def forbidden(*args, **kwargs):
            raise AssertionError("network must not be called")

        report = sync_unverified_rounds(
            [self.row("verified", verified=True)],
            supabase_url="https://project.supabase.co",
            service_role_key="private-secret",
            opener=forbidden,
        )
        self.assertEqual(report["inserted_rows"], 0)
        self.assertEqual(report["candidate_rows"], 0)

    def test_bad_batch_size_rejected(self):
        with self.assertRaisesRegex(ValueError, "batch_size"):
            sync_unverified_rounds([], batch_size=501, supabase_url="https://project.supabase.co", service_role_key="x")


if __name__ == "__main__":
    unittest.main()
