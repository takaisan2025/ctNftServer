import unittest
from unittest.mock import patch

import ct_health


class RecentBlockTests(unittest.TestCase):
    @patch("ct_health.time.time", return_value=1_000)
    @patch("ct_health.rpc")
    def test_recent_block_passes(self, get_rpc, _clock):
        get_rpc.return_value = {"result": {"timestamp": hex(940)}}
        ct_health.check_recent_block("http://example.invalid")

    @patch("ct_health.time.time", return_value=1_000)
    @patch("ct_health.rpc")
    def test_stale_block_fails(self, get_rpc, _clock):
        get_rpc.return_value = {"result": {"timestamp": hex(850)}}
        with self.assertRaisesRegex(RuntimeError, "150 seconds old"):
            ct_health.check_recent_block("http://example.invalid")


if __name__ == "__main__":
    unittest.main()
