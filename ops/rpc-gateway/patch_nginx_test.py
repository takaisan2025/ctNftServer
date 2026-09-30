import unittest

from patch_nginx import render


class PatchNginxTests(unittest.TestCase):
    def test_only_active_direct_rpc_proxy_is_replaced(self):
        source = (
            "# proxy_pass http://172.17.219.139:7401/;\n"
            "    proxy_pass  http://172.17.219.139:7401/;\n"
            "    proxy_pass http://127.0.0.1:4000/;\n"
        )
        result = render(source, 1)
        self.assertIn("    proxy_pass http://$ct_rpc_target/;", result)
        self.assertIn("# proxy_pass http://172.17.219.139:7401/;", result)
        self.assertIn("proxy_pass http://127.0.0.1:4000/;", result)

    def test_mismatched_configuration_aborts(self):
        with self.assertRaises(ValueError):
            render("location / { return 200; }", 2)

    def test_already_patched_configuration_is_idempotent(self):
        source = "    proxy_pass http://$ct_rpc_target/;\n"
        self.assertEqual(render(source, 1), source)


if __name__ == "__main__":
    unittest.main()
