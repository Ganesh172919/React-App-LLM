"""Summarize independently reviewed answer evaluations from a CSV file.

Each row: case_id,variant,accuracy,hallucination_free,clinical_relevance.
Scores are reviewer-assigned 0 or 1; blank scores are excluded, never treated as 0.
"""
import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

METRICS = ("accuracy", "hallucination_free", "clinical_relevance")


def summarize(rows, baseline=None, require_complete=False):
    groups = defaultdict(list)
    by_case = defaultdict(dict)
    seen = set()
    for row in rows:
        case, variant = row.get("case_id", "").strip(), row.get("variant", "").strip()
        if not case or not variant or (case, variant) in seen:
            raise ValueError("Every case/variant pair must be present and unique.")
        seen.add((case, variant))
        scores = {}
        for metric in METRICS:
            value = row.get(metric, "").strip()
            if value not in ("", "0", "1"):
                raise ValueError(f"{metric} must be 0, 1, or blank.")
            scores[metric] = None if value == "" else int(value)
        groups[variant].append(scores)
        by_case[variant][case] = scores
    if not groups:
        raise ValueError("No evaluation rows found.")
    result = {}
    for variant, entries in sorted(groups.items()):
        metrics = {}
        for metric in METRICS:
            values = [row[metric] for row in entries if row[metric] is not None]
            metrics[metric] = {"scored": len(values), "rate": round(sum(values) / len(values), 4) if values else None}
        result[variant] = {"cases": len(entries), "metrics": metrics}
    case_sets = [set(cases) for cases in by_case.values()]
    complete = all(cases == case_sets[0] for cases in case_sets) and all(
        value is not None for cases in by_case.values() for scores in cases.values() for value in scores.values()
    )
    if require_complete and not complete:
        raise ValueError("Strict ablation requires identical case IDs and all three scores for every variant.")
    baseline = baseline or ("baseline" if "baseline" in groups else "base" if "base" in groups else None)
    if baseline is not None and baseline not in groups:
        raise ValueError(f"Baseline variant not found: {baseline}")
    comparisons = {}
    if baseline:
        base = by_case[baseline]
        for variant, cases in sorted(by_case.items()):
            if variant == baseline:
                continue
            metrics = {}
            for metric in METRICS:
                common = sorted(set(base) & set(cases))
                pairs = [(base[case][metric], cases[case][metric]) for case in common
                         if base[case][metric] is not None and cases[case][metric] is not None]
                wins = sum(candidate > original for original, candidate in pairs)
                losses = sum(candidate < original for original, candidate in pairs)
                metrics[metric] = {
                    "pairedCases": len(pairs),
                    "excludedUnpairedOrUnscored": len(set(base) | set(cases)) - len(pairs),
                    "variantWins": wins,
                    "baselineWins": losses,
                    "ties": len(pairs) - wins - losses,
                    "rateDelta": round(sum(candidate - original for original, candidate in pairs) / len(pairs), 4) if pairs else None,
                }
            comparisons[variant] = metrics
    return {
        "variants": result,
        "baseline": baseline,
        "ablationReady": complete,
        "pairedComparisons": comparisons,
        "note": "Paired deltas use only the same scored cases. Reviewer scores are descriptive, not clinical validation or statistical significance.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("--baseline", help="Reference variant (auto-detects 'baseline' or 'base')")
    parser.add_argument("--require-complete", action="store_true", help="Fail unless every variant has the same fully scored cases")
    args = parser.parse_args()
    with args.input_csv.open(encoding="utf-8-sig", newline="") as stream:
        print(json.dumps(summarize(csv.DictReader(stream), args.baseline, args.require_complete), indent=2))


if __name__ == "__main__":
    main()
