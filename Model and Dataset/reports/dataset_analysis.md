# Medical Q&A dataset analysis

Generated from `Final data set for llm based health assitance (1).csv`. This is descriptive profiling only. It does not train a model or validate clinical correctness.

## Dataset summary

| Metric | Value |
| --- | ---: |
| Total rows | 16,412 |
| Valid question-answer pairs | 16,407 |
| Rows excluded for missing values | 5 |
| Unique normalized questions | 14,345 |
| Unique normalized pairs | 16,359 |

## Quality flags

| Check | Rows flagged |
| --- | ---: |
| Missing questions | 0 |
| Missing answers | 5 |
| Exact duplicates after whitespace normalization | 48 |
| Repeated normalized questions | 2,062 |
| Questions under 4 words | 215 |
| Answers under 20 words | 656 |
| Answers over 1,000 words | 225 |

## Text length in words

| Field | Min | Median | Mean | P95 | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Question | 3 | 7 | 7.1 | 11.0 | 26 |
| Answer | 1 | 132 | 189.7 | 489.0 | 4133 |

## Question types

| Type | Rows |
| --- | ---: |
| Definition | 7,790 |
| Other | 4,123 |
| Symptoms | 2,749 |
| Causes | 736 |
| Risk | 378 |
| Prognosis | 358 |
| Prevention | 221 |
| Treatment | 45 |
| Diagnosis | 7 |

## Frequent question terms

| Term | Count |
| --- | ---: |
| syndrome | 3,626 |
| symptoms | 2,748 |
| treatments | 2,437 |
| inherited | 1,459 |
| related | 1,169 |
| many | 1,117 |
| affected | 1,117 |
| genetic | 1,097 |
| changes | 1,088 |
| type | 899 |
| deficiency | 861 |
| causes | 755 |

## Recommendations

- Remove rows with missing answers before retrieval, evaluation, or future training.
- Deduplicate normalized question-answer pairs and review repeated questions with conflicting answers.
- Retain source provenance and licensing metadata; the current CSV has only question and answer fields.
- Use deterministic, question-level splits to prevent duplicate questions leaking across evaluation sets.
- Treat this profiling report as data-quality evidence, not as clinical validation of any answer.
