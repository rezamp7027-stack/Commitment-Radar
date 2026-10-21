import json
import unittest

from crash_feed_inspector.security import sanitize_message


class SecurityTests(unittest.TestCase):
    def test_json_sensitive_fields_are_redacted(self):
        result = json.loads(sanitize_message(json.dumps({
            "type": "event", "access_token": "private", "nested": {"cookie": "abc", "count": 3}
        })))
        self.assertEqual(result["access_token"], "[REDACTED]")
        self.assertEqual(result["nested"]["cookie"], "[REDACTED]")
        self.assertEqual(result["nested"]["count"], 3)

    def test_jwt_and_signed_url_fields_are_redacted(self):
        result = json.loads(sanitize_message(json.dumps({
            "jwt": "header.payload.signature",
            "signed_url": "https://example.invalid/file?signature=private",
        })))
        self.assertEqual(result["jwt"], "[REDACTED]")
        self.assertEqual(result["signed_url"], "[REDACTED]")


    def test_record_separated_signalr_json_frames_are_redacted_individually(self):
        first = json.dumps({"type": 1, "target": "OnCrash", "arguments": [{"l": "r1", "f": "2.0"}]})
        private = json.dumps({"type": 1, "target": "Auth", "access_token": "private-frame-token"})
        result = sanitize_message(first + "\\x1e" + private + "\\x1e")
        self.assertNotIn("private-frame-token", result)
        frames = [part for part in result.split("\\x1e") if part]
        self.assertEqual(len(frames), 2)
        self.assertEqual(json.loads(frames[1])["access_token"], "[REDACTED]")

    def test_text_token_is_redacted(self):
        result = sanitize_message("token=private-value&count=2")
        self.assertNotIn("private-value", result)
        self.assertIn("[REDACTED]", result)


if __name__ == "__main__":
    unittest.main()
