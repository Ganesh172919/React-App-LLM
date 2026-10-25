# Medical Q&A dataset audit

This report checks structure and repeated-question answer variants. It does not establish clinical correctness and does not train a model.

## Multi-answer questions

| Metric | Value |
| --- | ---: |
| Question groups with multiple distinct answers | 1,396 |
| Source rows in those groups | 3,438 |
| Additional answer variants | 2,014 |
| Groups below 0.35 token similarity | 1,128 |
| Mean pairwise answer similarity | 0.192 |

## Content flags

| Check | Rows |
| --- | ---: |
| Answers with HTML-like markup | 0 |
| Answers with URLs | 159 |
| Answers with non-ASCII characters | 61 |

## Highest-variant sample

| Question | Source rows | Distinct answers | Minimum similarity |
| --- | ---: | ---: | ---: |
| What is (are) High Blood Cholesterol ? | 19 | 19 | 0.036 |
| What is (are) Medicare and Continuing Care ? | 14 | 14 | 0.061 |
| What are the treatments for Breast Cancer ? | 13 | 13 | 0.035 |
| What is (are) Stroke ? | 13 | 13 | 0.039 |
| What is (are) Skin Cancer ? | 13 | 13 | 0.048 |
| What is (are) Breast Cancer ? | 13 | 13 | 0.070 |
| What is (are) Colorectal Cancer ? | 12 | 12 | 0.071 |
| What is (are) High Blood Pressure ? | 11 | 11 | 0.035 |
| What are the treatments for Prostate Cancer ? | 11 | 11 | 0.039 |
| What is (are) Parkinson's Disease ? | 11 | 11 | 0.049 |
| What is (are) Leukemia ? | 10 | 10 | 0.000 |
| What is (are) Age-related Macular Degeneration ? | 10 | 10 | 0.013 |
| What is (are) Nutrition for Advanced Chronic Kidney Disease in Adults ? | 10 | 10 | 0.025 |
| What is (are) Prostate Cancer ? | 10 | 10 | 0.093 |
| Who is at risk for Prostate Cancer? ? | 9 | 9 | 0.033 |
| Who is at risk for Breast Cancer? ? | 9 | 9 | 0.041 |
| What is (are) Lung Cancer ? | 9 | 9 | 0.054 |
| What is (are) Dry Mouth ? | 8 | 8 | 0.013 |
| What are the treatments for Lung Cancer ? | 8 | 8 | 0.042 |
| What is (are) Alzheimer's Disease ? | 8 | 8 | 0.093 |

## Recommendations

- Review low-similarity answer variants before retrieval evaluation or future training.
- Keep one authoritative provenance record per answer variant instead of silently merging clinical claims.
- Validate markup, URLs, licensing, and clinical accuracy in a separate qualified review.
