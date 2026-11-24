import unittest

from app.executor.sql_runner import SQLRunner


class ValidateQueryTest(unittest.TestCase):
    def setUp(self):
        self.runner = SQLRunner()

    def test_allows_normal_selects(self):
        for sql in [
            "SELECT * FROM items",
            "WITH a AS (SELECT id FROM items) SELECT count(*) FROM a",
            "SELECT replace(name, 'a', 'b') FROM items",
            "-- comment\nSELECT 1",
            'SELECT "call", "commit" FROM items',
        ]:
            with self.subTest(sql=sql):
                self.assertEqual(self.runner.validate_query(sql, "postgres"), sql)

    def test_strips_trailing_semicolons_and_fences(self):
        self.assertEqual(self.runner.validate_query("```sql\nSELECT 1;;\n```"), "SELECT 1")

    def test_refuses_a_second_statement(self):
        for sql in [
            "SELECT 1; SELECT 2",
            "SELECT 1; COMMIT; SELECT 2",
            "SELECT 1; DO $$ BEGIN END $$",
            "SELECT 1 /* ; */; SELECT 2",
            "SELECT 'a;b'",
        ]:
            for db_type in ["postgres", "cockroach", "mysql", "mssql", "sqlite"]:
                with self.subTest(sql=sql, db_type=db_type):
                    with self.assertRaisesRegex(ValueError, "one SQL statement"):
                        self.runner.validate_query(sql, db_type)

    def test_refuses_writes(self):
        for sql in [
            "DELETE FROM items",
            "UPDATE items SET id = 1",
            "SELECT * INTO copied FROM items",
            "SELECT 1 INTO OUTFILE '/tmp/x'",
            "WITH a AS (DELETE FROM items RETURNING *) SELECT * FROM a",
            "CALL do_something()",
        ]:
            with self.subTest(sql=sql):
                with self.assertRaises(ValueError):
                    self.runner.validate_query(sql, "postgres")

    def test_refuses_batches_without_semicolons_on_sql_server(self):
        for sql in [
            "SELECT 1 EXECUTE('x')",
            "SELECT 1 COMMIT",
            "SELECT 1 MERGE items USING other ON 1=1 WHEN MATCHED THEN SELECT 1",
            "SELECT 1 SHUTDOWN",
        ]:
            with self.subTest(sql=sql):
                with self.assertRaises(ValueError):
                    self.runner.validate_query(sql, "mssql")

    def test_refuses_empty_queries(self):
        for sql in ["", "   ", ";", " ;; "]:
            with self.subTest(sql=sql):
                with self.assertRaises(ValueError):
                    self.runner.validate_query(sql)


if __name__ == "__main__":
    unittest.main()
