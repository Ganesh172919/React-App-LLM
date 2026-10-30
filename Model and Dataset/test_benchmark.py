import unittest
from evaluate_benchmark import summarize


class BenchmarkTests(unittest.TestCase):
    def test_scores_are_grouped_and_unscored_values_are_excluded(self):
        result = summarize([
            {"case_id": "1", "variant": "base", "accuracy": "1", "hallucination_free": "0", "clinical_relevance": ""},
            {"case_id": "2", "variant": "base", "accuracy": "0", "hallucination_free": "1", "clinical_relevance": "1"},
        ])
        self.assertEqual(result["variants"]["base"]["metrics"]["accuracy"]["rate"], 0.5)
        self.assertEqual(result["variants"]["base"]["metrics"]["clinical_relevance"]["scored"], 1)

    def test_duplicate_and_invalid_scores_fail(self):
        row = {"case_id": "1", "variant": "base", "accuracy": "1", "hallucination_free": "1", "clinical_relevance": "1"}
        with self.assertRaises(ValueError): summarize([row, row])
        with self.assertRaises(ValueError): summarize([{**row, "accuracy": "2"}])

    def test_paired_ablation_uses_only_shared_scored_cases(self):
        def row(case, variant, accuracy, hallucination="1", relevance="1"):
            return {"case_id": case, "variant": variant, "accuracy": accuracy,
                    "hallucination_free": hallucination, "clinical_relevance": relevance}
        result = summarize([
            row("a", "base", "0"), row("b", "base", "1"),
            row("c", "base", "1"), row("a", "lora", "1"),
            row("b", "lora", "0"), row("d", "lora", "1"),
        ])
        accuracy = result["pairedComparisons"]["lora"]["accuracy"]
        self.assertEqual(accuracy["pairedCases"], 2)
        self.assertEqual(accuracy["excludedUnpairedOrUnscored"], 2)
        self.assertEqual(accuracy["variantWins"], 1)
        self.assertEqual(accuracy["baselineWins"], 1)
        self.assertEqual(accuracy["rateDelta"], 0)
        self.assertFalse(result["ablationReady"])
        with self.assertRaises(ValueError): summarize([
            row("a", "base", "0"), row("b", "lora", "1")
        ], require_complete=True)

    def test_complete_ablation_and_missing_baseline(self):
        rows = [
            {"case_id": case, "variant": variant, "accuracy": score,
             "hallucination_free": score, "clinical_relevance": score}
            for case, scores in {"a": ("0", "1"), "b": ("1", "1")}.items()
            for variant, score in zip(("baseline", "qlora"), scores)
        ]
        result = summarize(rows, require_complete=True)
        self.assertTrue(result["ablationReady"])
        self.assertEqual(result["pairedComparisons"]["qlora"]["accuracy"]["rateDelta"], 0.5)
        with self.assertRaises(ValueError): summarize(rows, baseline="missing")


if __name__ == "__main__": unittest.main()
