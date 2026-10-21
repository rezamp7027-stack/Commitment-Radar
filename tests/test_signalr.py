import json
import unittest

from crash_feed_inspector.signalr import parse_oncrash_candidate


def frame(*, round_id=12345, multiplier="2.75", timestamp=1760000000000, message_type=1, target="OnCrash", arguments=None):
    if arguments is None:
        arguments = [{"l": round_id, "f": multiplier, "ts": timestamp}]
    return json.dumps({"type": message_type, "target": target, "arguments": arguments})


class SignalRAdapterTests(unittest.TestCase):
    def test_parses_candidate_as_unverified_and_normalizes_timestamp(self):
        result = parse_oncrash_candidate(frame())
        self.assertEqual(result["round_id"], "12345")
        self.assertEqual(result["multiplier"], 2.75)
        self.assertEqual(result["timestamp_utc"], "2025-10-09T08:53:20Z")
        self.assertFalse(result["verified"])
        self.assertEqual(result["verification_status"], "pending_manual_confirmation")
        self.assertEqual(result["schema_version"], "legacy-oncrash-candidate-v1")

    def test_accepts_string_integer_timestamp_and_multiplier_suffix(self):
        result = parse_oncrash_candidate(frame(round_id=" round-2 ", multiplier="1.30x", timestamp="1760000000000"))
        self.assertEqual(result["round_id"], "round-2")
        self.assertEqual(result["multiplier"], 1.3)
        self.assertEqual(result["timestamp_utc"], "2025-10-09T08:53:20Z")

    def test_ignores_other_targets_non_invocation_and_boolean_type(self):
        self.assertIsNone(parse_oncrash_candidate(frame(target="Account")))
        self.assertIsNone(parse_oncrash_candidate(frame(message_type=6)))
        self.assertIsNone(parse_oncrash_candidate(json.dumps({"type": True, "target": "OnCrash", "arguments": [{}]})))

    def test_ignores_non_json_frames_and_json_arrays(self):
        self.assertIsNone(parse_oncrash_candidate("not json"))
        self.assertIsNone(parse_oncrash_candidate(json.dumps([{"type": 1, "target": "OnCrash"}])))

    def test_rejects_missing_arguments_for_oncrash(self):
        with self.assertRaises(ValueError):
            parse_oncrash_candidate(frame(arguments=[]))
        with self.assertRaises(ValueError):
            parse_oncrash_candidate(frame(arguments="wrong-shape"))

    def test_rejects_invalid_round_identifiers(self):
        for round_id in (None, True, {}, [], ""):
            with self.subTest(round_id=round_id):
                with self.assertRaises(ValueError):
                    parse_oncrash_candidate(frame(round_id=round_id))

    def test_rejects_invalid_multipliers(self):
        for multiplier in (None, True, "abc", "nan", "inf", "0.99", "-2"):
            with self.subTest(multiplier=multiplier):
                with self.assertRaises(ValueError):
                    parse_oncrash_candidate(frame(multiplier=multiplier))

    def test_rejects_invalid_or_seconds_timestamps(self):
        for timestamp in (None, True, "not-a-time", 1760000000, 0, 1760000000000.5):
            with self.subTest(timestamp=timestamp):
                with self.assertRaises(ValueError):
                    parse_oncrash_candidate(frame(timestamp=timestamp))

    def test_rejects_out_of_range_timestamp(self):
        with self.assertRaises(ValueError):
            parse_oncrash_candidate(frame(timestamp=4102444800000))


if __name__ == "__main__":
    unittest.main()
