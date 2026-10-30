import tempfile
import unittest
from pathlib import Path
from document_retrieval import build_index, chunks, search


class DocumentRetrievalTests(unittest.TestCase):
    def test_local_index_and_semantic_ranking(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a.txt").write_text("heart information", encoding="utf-8")
            (root / "b.txt").write_text("lung information", encoding="utf-8")
            index = build_index(root, "fixture", lambda texts: [[1, 0], [0, 1]])
            self.assertEqual(search(index, [0, 1])[0]["source"], "b.txt")
            with self.assertRaises(ValueError): search(index, [1])

    def test_chunk_bounds(self):
        self.assertEqual(chunks("abcdefghij", 5, 0), ["abcde", "fghij"])
        with self.assertRaises(ValueError): chunks("abc", 5, 5)


if __name__ == "__main__": unittest.main()
