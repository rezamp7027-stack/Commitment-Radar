import json
import unittest

from crash_feed_inspector.signalr import parse_oncrash_candidate


class SignalRAdapterTests(unittest.TestCase):
    def test_parses_legacy_oncrash_candidate_as_unverified(self):
        raw = json.dumps({
            "type": 1,
            "target": "OnCrash",
            "arguments": [{"l": 12345, "f": "2.75", "ts": 1760000000000}],
        })
        result = parse_oncrash_candidate(raw)
        self.assertEqual(result["round_id"], "12345")
        self.assertEqual(result["multiplier"], 2.75)
        self.assertEqual(result["timestamp_utc"], "2025-10-09T08:53:20Z")
        self.assertFalse(result["verified"])
        self.assertEqual(result["verification_status"], "pending_manual_confirmation")

    def test_ignores_other_targets_and_signalr_message_types(self):
        self.assertIsNone(parse_oncrash_candidate(json.dumps({"type": 1, "target": "Account", "arguments": []})))
        self.assertIsNone(parse_oncrash_candidate(json.dumps({"type": 6})))

    def test_rejects_invalid_multiplier(self):
        raw = json.dumps({"type": 1, "target": "OnCrash", "arguments": [{"l": 1, "f": "nan", "ts": 1760000000000}]})
        with self.assertRaises(ValueError):
            parse_oncrash_candidate(raw)


if __name__ == "__main__":
    unittest.main()
