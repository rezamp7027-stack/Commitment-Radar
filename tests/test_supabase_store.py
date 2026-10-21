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


    def test_http_error_body_cannot_echo_service_role_key(self):
        from io import BytesIO
        from urllib.error import HTTPError

        secret = "service-role-super-secret"

        def opener(request, timeout):
            raise HTTPError(
                request.full_url,
                400,
                "Bad Request",
                hdrs=None,
                fp=BytesIO(f"database rejected key {secret}".encode("utf-8")),
            )

        with self.assertRaises(RuntimeError) as error:
            sync_unverified_rounds(
                [self.row("a")],
                supabase_url="https://project.supabase.co",
                service_role_key=secret,
                opener=opener,
            )
        self.assertNotIn(secret, str(error.exception))
        self.assertIn("[REDACTED]", str(error.exception))

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


class SupabaseReadAndLedgerTests(unittest.TestCase):
    def response(self, value):
        return FakeResponse(json.dumps(value).encode("utf-8"))

    def test_fetch_verified_rounds_filters_source_and_requires_timestamps(self):
        seen = []

        def opener(request, timeout):
            seen.append(request)
            return self.response([{
                "source": "feed/a",
                "round_id": "r1",
                "occurred_at": "2026-01-01T00:00:00Z",
                "multiplier": 1.8,
                "schema_version": "v1",
            }])

        from crash_feed_inspector.supabase_store import fetch_verified_rounds
        rows = fetch_verified_rounds(
            "feed/a",
            supabase_url="https://project.supabase.co",
            service_role_key="secret",
            opener=opener,
        )
        self.assertEqual(rows[0]["multiplier"], 1.8)
        self.assertIn("verified", seen[0].full_url)
        self.assertIn("feed%2Fa", seen[0].full_url)

    def test_fetch_verified_rounds_fails_when_timestamp_missing(self):
        def opener(request, timeout):
            return self.response([{
                "source": "feed",
                "round_id": "r1",
                "occurred_at": None,
                "multiplier": 2.0,
                "schema_version": "v1",
            }])

        from crash_feed_inspector.supabase_store import fetch_verified_rounds
        with self.assertRaisesRegex(ValueError, "no timestamp"):
            fetch_verified_rounds(
                "feed",
                supabase_url="https://project.supabase.co",
                service_role_key="secret",
                opener=opener,
            )

    def test_prediction_ledger_never_emits_candidate_signal(self):
        captured = []

        def opener(request, timeout):
            captured.append(json.loads(request.data.decode("utf-8")))
            return self.response([{"id": 1}, {"id": 2}])

        from crash_feed_inspector.supabase_store import store_research_predictions
        report = {
            "threshold_results": {
                "2.0": {
                    "full_history": {"historical_rate": 0.4, "wilson_95_ci": [0.2, 0.6], "rounds": 50},
                    "recent_windows": {},
                    "largest_recent_vs_full_rate_gap": 0.01,
                    "status": "historical_rate_only_no_next_round_claim",
                },
                "5.0": {
                    "full_history": {"historical_rate": 0.1, "wilson_95_ci": [0.03, 0.2], "rounds": 50},
                    "recent_windows": {},
                    "largest_recent_vs_full_rate_gap": 0.3,
                    "status": "no_signal_unstable_history",
                },
            }
        }
        result = store_research_predictions(
            "feed",
            report,
            supabase_url="https://project.supabase.co",
            service_role_key="secret",
            opener=opener,
        )
        self.assertEqual(result["records_inserted"], 2)
        self.assertEqual([row["decision"] for row in captured[0]], ["research_only", "no_signal"])
        self.assertTrue(all(row["decision"] != "candidate_signal" for row in captured[0]))

    def test_evaluation_uses_first_later_verified_round(self):
        calls = []

        def opener(request, timeout):
            calls.append(request)
            if request.get_method() == "GET" and "crash_rounds" in request.full_url:
                return self.response([{
                    "source": "feed",
                    "round_id": "r2",
                    "occurred_at": "2026-01-02T00:00:00Z",
                    "multiplier": 2.5,
                    "schema_version": "v1",
                }])
            if request.get_method() == "GET" and "crash_predictions" in request.full_url:
                return self.response([{
                    "id": 7,
                    "source": "feed",
                    "created_at": "2026-01-01T00:00:00Z",
                    "target_threshold": 2.0,
                    "decision": "research_only",
                }])
            if request.get_method() == "PATCH":
                self.assertEqual(json.loads(request.data.decode("utf-8"))["evaluated_round_id"], "r2")
                return self.response([{"id": 7}])
            raise AssertionError(f"Unexpected request: {request.get_method()} {request.full_url}")

        from crash_feed_inspector.supabase_store import evaluate_pending_predictions
        result = evaluate_pending_predictions(
            "feed",
            supabase_url="https://project.supabase.co",
            service_role_key="secret",
            opener=opener,
        )
        self.assertEqual(result["evaluated"], 1)
        self.assertEqual(result["hits"], 1)
        self.assertEqual(result["misses"], 0)
        self.assertEqual(len(calls), 3)


if __name__ == "__main__":
    unittest.main()
