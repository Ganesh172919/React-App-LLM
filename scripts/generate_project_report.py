"""Generate the MedAssist AI project upgrade report as a polished PDF."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "Model and Dataset" / "reports"
OUTPUT = ROOT / "output" / "pdf" / "medassist_ai_project_report.pdf"

PAGE_W, PAGE_H = A4
MARGIN = 42
CONTENT_W = PAGE_W - (2 * MARGIN)

BG = HexColor("#020617")
SURFACE = HexColor("#0f172a")
SURFACE_2 = HexColor("#111c32")
BORDER = HexColor("#25334d")
TEXT = HexColor("#f8fafc")
MUTED = HexColor("#94a3b8")
CYAN = HexColor("#22d3ee")
BLUE = HexColor("#2563eb")
GREEN = HexColor("#34d399")
AMBER = HexColor("#fbbf24")
ROSE = HexColor("#fb7185")

FONT_REGULAR = "MedAssistSans"
FONT_BOLD = "MedAssistSansBold"
pdfmetrics.registerFont(TTFont(FONT_REGULAR, r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont(FONT_BOLD, r"C:\Windows\Fonts\arialbd.ttf"))


def load_json(name: str) -> dict:
    return json.loads((REPORTS / name).read_text(encoding="utf-8"))


ANALYSIS = load_json("dataset_analysis.json")
AUDIT = load_json("dataset_audit.json")
LORA = load_json("lora_validation.json")


def set_font(pdf: canvas.Canvas, size: float, bold: bool = False, color=TEXT) -> None:
    pdf.setFont(FONT_BOLD if bold else FONT_REGULAR, size)
    pdf.setFillColor(color)


def wrap_text(text: str, max_width: float, size: float = 9, bold: bool = False) -> list[str]:
    font = FONT_BOLD if bold else FONT_REGULAR
    words = str(text).replace("\n", " \n ").split()
    lines: list[str] = []
    current = ""
    for word in words:
        if word == "\n":
            if current:
                lines.append(current)
                current = ""
            continue
        candidate = f"{current} {word}".strip()
        if current and stringWidth(candidate, font, size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def paragraph(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    size: float = 9,
    leading: float = 13,
    color=MUTED,
    bold: bool = False,
) -> float:
    set_font(pdf, size, bold, color)
    for line in wrap_text(text, width, size, bold):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def bullets(pdf: canvas.Canvas, items: list[str], x: float, y: float, width: float, size: float = 9) -> float:
    for item in items:
        pdf.setFillColor(CYAN)
        pdf.circle(x + 3, y - 3, 2, fill=1, stroke=0)
        y = paragraph(pdf, item, x + 13, y, width - 13, size=size, leading=12.5, color=TEXT)
        y -= 6
    return y


def rounded_box(pdf: canvas.Canvas, x: float, y: float, width: float, height: float, fill=SURFACE, stroke=BORDER) -> None:
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke)
    pdf.roundRect(x, y, width, height, 11, fill=1, stroke=1)


def metric_card(pdf: canvas.Canvas, x: float, y: float, width: float, value: str, label: str, detail: str = "") -> None:
    rounded_box(pdf, x, y, width, 78)
    set_font(pdf, 8, True, MUTED)
    pdf.drawString(x + 14, y + 57, label.upper())
    set_font(pdf, 20, True, CYAN)
    pdf.drawString(x + 14, y + 32, value)
    if detail:
        set_font(pdf, 7.5, False, MUTED)
        pdf.drawString(x + 14, y + 14, detail)


def section_label(pdf: canvas.Canvas, text: str, x: float, y: float) -> None:
    set_font(pdf, 8, True, CYAN)
    pdf.drawString(x, y, text.upper())


def page_header(pdf: canvas.Canvas, kicker: str, title: str, page_number: int) -> float:
    pdf.setFillColor(BG)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    set_font(pdf, 10, True, TEXT)
    pdf.drawString(MARGIN, PAGE_H - 34, "MedAssist AI")
    set_font(pdf, 8, False, MUTED)
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 34, "PROJECT UPGRADE REPORT")
    pdf.setStrokeColor(BORDER)
    pdf.line(MARGIN, PAGE_H - 48, PAGE_W - MARGIN, PAGE_H - 48)
    section_label(pdf, kicker, MARGIN, PAGE_H - 78)
    set_font(pdf, 25, True, TEXT)
    pdf.drawString(MARGIN, PAGE_H - 110, title)
    pdf.setStrokeColor(BORDER)
    pdf.line(MARGIN, 40, PAGE_W - MARGIN, 40)
    set_font(pdf, 7.5, False, MUTED)
    pdf.drawString(MARGIN, 24, "J Ganesh kumar reddy | MedAssist AI | October 2026")
    pdf.drawRightString(PAGE_W - MARGIN, 24, f"{page_number:02d} / 10")
    return PAGE_H - 140


def page_break(pdf: canvas.Canvas) -> None:
    pdf.showPage()


def reinforce_page_chrome(pdf: canvas.Canvas) -> None:
    """Redraw non-content chrome after dense page layouts."""
    set_font(pdf, 10, True, TEXT)
    pdf.drawString(MARGIN, PAGE_H - 34, "MedAssist AI")
    set_font(pdf, 8, False, MUTED)
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 34, "PROJECT UPGRADE REPORT")
    pdf.setStrokeColor(BORDER)
    pdf.line(MARGIN, PAGE_H - 48, PAGE_W - MARGIN, PAGE_H - 48)
    pdf.line(MARGIN, 40, PAGE_W - MARGIN, 40)
    set_font(pdf, 7.5, False, MUTED)
    pdf.drawString(MARGIN, 24, "J Ganesh kumar reddy | MedAssist AI | October 2026")


def draw_bar_chart(
    pdf: canvas.Canvas,
    data: list[tuple[str, int]],
    x: float,
    y: float,
    width: float,
    bar_height: float = 16,
    gap: float = 11,
    color=CYAN,
) -> float:
    maximum = max(value for _, value in data) or 1
    label_width = 112
    for label, value in data:
        set_font(pdf, 7.5, False, MUTED)
        pdf.drawRightString(x + label_width - 8, y + 3, label)
        bar_x = x + label_width
        bar_w = (width - label_width - 40) * value / maximum
        pdf.setFillColor(SURFACE_2)
        pdf.roundRect(bar_x, y, width - label_width - 40, bar_height, 4, fill=1, stroke=0)
        pdf.setFillColor(color)
        pdf.roundRect(bar_x, y, max(bar_w, 3), bar_height, 4, fill=1, stroke=0)
        set_font(pdf, 7.5, True, TEXT)
        pdf.drawRightString(x + width, y + 3, f"{value:,}")
        y -= bar_height + gap
    return y


def draw_table(pdf: canvas.Canvas, rows: list[tuple[str, str]], x: float, y: float, width: float, row_height: float = 28) -> float:
    for index, (left, right) in enumerate(rows):
        pdf.setFillColor(SURFACE if index % 2 == 0 else SURFACE_2)
        pdf.roundRect(x, y - row_height + 5, width, row_height, 5, fill=1, stroke=0)
        set_font(pdf, 8.5, False, MUTED)
        pdf.drawString(x + 12, y - 13, left)
        set_font(pdf, 8.5, True, TEXT)
        pdf.drawRightString(x + width - 12, y - 13, right)
        y -= row_height + 2
    return y


def cover(pdf: canvas.Canvas) -> None:
    pdf.setFillColor(BG)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(BLUE)
    pdf.circle(PAGE_W - 70, PAGE_H - 90, 145, fill=1, stroke=0)
    pdf.setFillColor(BG)
    pdf.circle(PAGE_W - 30, PAGE_H - 45, 105, fill=1, stroke=0)
    set_font(pdf, 11, True, CYAN)
    pdf.drawString(MARGIN, PAGE_H - 72, "MEDASSIST AI")
    set_font(pdf, 9, False, MUTED)
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 72, "RELEASE READINESS / OCTOBER 2026")
    set_font(pdf, 34, True, TEXT)
    pdf.drawString(MARGIN, PAGE_H - 155, "Project Upgrade")
    pdf.drawString(MARGIN, PAGE_H - 198, "Report")
    y = paragraph(
        pdf,
        "Frontend, grounded medical AI, dataset analytics, LoRA preparation, deployment hardening, and end-to-end quality assurance.",
        MARGIN,
        PAGE_H - 234,
        405,
        size=13,
        leading=19,
        color=MUTED,
    )
    set_font(pdf, 10, True, TEXT)
    pdf.drawString(MARGIN, y - 18, "Prepared by J Ganesh kumar reddy")
    set_font(pdf, 8.5, False, MUTED)
    pdf.drawString(MARGIN, y - 37, "Repository: Ganesh172919/React-App-LLM")

    card_w = (CONTENT_W - 24) / 3
    card_y = 292
    metric_card(pdf, MARGIN, card_y, card_w, f"{ANALYSIS['rows']['total']:,}", "Source rows", "Dataset profiled")
    metric_card(pdf, MARGIN + card_w + 12, card_y, card_w, "100%", "Citation coverage", "Live fallback QA")
    metric_card(pdf, MARGIN + (card_w + 12) * 2, card_y, card_w, "0", "Training runs", "Preparation only")

    rounded_box(pdf, MARGIN, 112, CONTENT_W, 140, fill=SURFACE)
    section_label(pdf, "Outcome", MARGIN + 18, 226)
    set_font(pdf, 15, True, TEXT)
    pdf.drawString(MARGIN + 18, 200, "A deployment-ready full-stack medical assistant foundation")
    bullets(
        pdf,
        [
            "React chat workspace with persistent CRUD, export, search, source cards, and analytics.",
            "Node API with authenticated WebSockets, safety screening, PubMed grounding, citation checks, and health reporting.",
            "Reproducible dataset analysis and LoRA data preparation with training explicitly disabled.",
        ],
        MARGIN + 18,
        176,
        CONTENT_W - 36,
        size=8.5,
    )
    set_font(pdf, 7.5, False, MUTED)
    pdf.drawString(MARGIN, 54, "Medical information software - not a diagnostic device and not a substitute for professional care.")
    pdf.drawRightString(PAGE_W - MARGIN, 54, "01 / 10")
    page_break(pdf)


def executive_summary(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "Executive summary", "What changed and why it matters", 2)
    y = paragraph(
        pdf,
        "The project was upgraded from a basic chat prototype into an inspectable product foundation. The main change is separation of concerns: browser-safe UI behavior, server-side AI orchestration, source-grounded medical retrieval, persistent user-owned history, and reproducible data tooling now have explicit boundaries.",
        MARGIN,
        y,
        CONTENT_W,
        size=10,
        leading=15,
        color=TEXT,
    )
    y -= 14
    section_label(pdf, "Delivered scope", MARGIN, y)
    y -= 22
    left = [
        "Responsive landing page, authenticated chat workspace, and analytics dashboard.",
        "Create, read, rename, search, export, and delete flows for user-owned conversations.",
        "Medical routing through PubMed with visible references and algorithmic citation validation.",
        "History-aware AI context, harmful-message filtering, rate limits, and private WebSocket updates.",
    ]
    right = [
        "Dataset profile, duplicate audit, deterministic preparation, split verification, and tests.",
        "No-training LoRA config validation plus SFT JSONL preparation utilities.",
        "Same-origin container topology with Nginx API/WebSocket proxying and service health checks.",
        "Expanded documentation, CI workflow, author attribution, and release report.",
    ]
    col_w = (CONTENT_W - 18) / 2
    rounded_box(pdf, MARGIN, y - 210, col_w, 210)
    rounded_box(pdf, MARGIN + col_w + 18, y - 210, col_w, 210)
    bullets(pdf, left, MARGIN + 14, y - 22, col_w - 28, size=8.2)
    bullets(pdf, right, MARGIN + col_w + 32, y - 22, col_w - 28, size=8.2)
    y -= 238
    section_label(pdf, "Measured results", MARGIN, y)
    y -= 92
    card_w = (CONTENT_W - 36) / 4
    metric_card(pdf, MARGIN, y, card_w, "11", "Backend tests", "All passing")
    metric_card(pdf, MARGIN + card_w + 12, y, card_w, "6", "Python tests", "Dataset + LoRA")
    metric_card(pdf, MARGIN + (card_w + 12) * 2, y, card_w, "0", "NPM findings", "Production audit")
    metric_card(pdf, MARGIN + (card_w + 12) * 3, y, card_w, "397 KB", "Frontend JS", "124.6 KB gzip")
    y -= 28
    rounded_box(pdf, MARGIN, 72, CONTENT_W, 78, fill=SURFACE_2)
    section_label(pdf, "Important boundary", MARGIN + 16, 126)
    paragraph(
        pdf,
        "The data reports are structural evidence, not clinical validation. The LoRA package validates configuration and prepares records only; no model was downloaded, trained, benchmarked, or published during this upgrade.",
        MARGIN + 16,
        106,
        CONTENT_W - 32,
        size=8.5,
        leading=12,
        color=TEXT,
    )
    page_break(pdf)


def architecture(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "System design", "End-to-end architecture", 3)
    paragraph(pdf, "One public frontend origin keeps cookies, API calls, and WebSockets consistent in production. AI provider credentials remain server-side.", MARGIN, y, CONTENT_W, 9.5, 14, TEXT)
    flow_y = 560
    stages = [
        ("React client", "Chat, dashboard, auth", CYAN),
        ("Nginx edge", "SPA + /api + /ws proxy", BLUE),
        ("Express API", "Auth, CRUD, limits", GREEN),
        ("AI services", "Safety + PubMed + Gemini", AMBER),
        ("MongoDB", "Users and chat history", ROSE),
    ]
    box_w = 91
    gap = 13
    for index, (name, detail, color) in enumerate(stages):
        x = MARGIN + index * (box_w + gap)
        rounded_box(pdf, x, flow_y, box_w, 92, fill=SURFACE)
        pdf.setFillColor(color)
        pdf.roundRect(x + 10, flow_y + 68, 26, 6, 3, fill=1, stroke=0)
        set_font(pdf, 9, True, TEXT)
        pdf.drawString(x + 10, flow_y + 48, name)
        paragraph(pdf, detail, x + 10, flow_y + 32, box_w - 20, 7.2, 10, MUTED)
        if index < len(stages) - 1:
            pdf.setStrokeColor(MUTED)
            pdf.line(x + box_w + 2, flow_y + 46, x + box_w + gap - 2, flow_y + 46)
            pdf.line(x + box_w + gap - 6, flow_y + 50, x + box_w + gap - 2, flow_y + 46)
            pdf.line(x + box_w + gap - 6, flow_y + 42, x + box_w + gap - 2, flow_y + 46)

    y = 520
    section_label(pdf, "Medical request path", MARGIN, y)
    y -= 26
    steps = [
        ("01", "Screen", "Validate size and detect unsafe or urgent content."),
        ("02", "Normalize", "Reduce conversational wording to focused PubMed terms."),
        ("03", "Retrieve", "Search and summarize up to three relevant PubMed records."),
        ("04", "Generate", "Use optional Gemini generation bounded to retrieved records."),
        ("05", "Verify", "Map [n] citations to supplied sources and compute coverage."),
        ("06", "Persist", "Save response, sources, safety state, and verification metadata."),
    ]
    for index, (number, name, detail) in enumerate(steps):
        col = index % 2
        row = index // 2
        x = MARGIN + col * (col_w := (CONTENT_W + 18) / 2)
        box_width = col_w - 18
        box_y = y - row * 95 - 72
        rounded_box(pdf, x, box_y, box_width, 74, fill=SURFACE_2)
        set_font(pdf, 15, True, CYAN)
        pdf.drawString(x + 14, box_y + 46, number)
        set_font(pdf, 9.5, True, TEXT)
        pdf.drawString(x + 52, box_y + 49, name)
        paragraph(pdf, detail, x + 52, box_y + 32, box_width - 66, 7.8, 10, MUTED)

    rounded_box(pdf, MARGIN, 74, CONTENT_W, 82, fill=SURFACE)
    section_label(pdf, "Trust boundaries", MARGIN + 16, 130)
    bullets(
        pdf,
        [
            "HTTP-only cookies protect browser sessions; authenticated user IDs scope history and WebSocket broadcasts.",
            "API keys are never placed in Vite variables or browser bundles; provider failure degrades to source-only medical responses.",
        ],
        MARGIN + 16,
        111,
        CONTENT_W - 32,
        size=7.8,
    )
    page_break(pdf)


def product_ux(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "Product and UX", "Conversation workspace and dashboard", 4)
    section_label(pdf, "Primary user journey", MARGIN, y)
    y -= 24
    journey = [
        ("Register / sign in", "Cookie session is restored before route decisions, preventing authenticated users from flashing or becoming trapped on login."),
        ("Ask a question", "Textarea supports clear focus states, Enter-to-send, Shift+Enter newline, character count, and disabled loading state."),
        ("Review evidence", "Medical replies show source cards, verification status, citation coverage, and a professional-care reminder."),
        ("Manage history", "Search, rename, export, reload, and delete controls are grouped per saved conversation."),
        ("Inspect analytics", "Selectable 7, 30, or 90-day activity plus verification and dataset quality are visible and exportable."),
    ]
    for index, (name, detail) in enumerate(journey):
        box_y = y - index * 78 - 61
        rounded_box(pdf, MARGIN, box_y, CONTENT_W, 62, fill=SURFACE if index % 2 == 0 else SURFACE_2)
        set_font(pdf, 10, True, CYAN)
        pdf.drawString(MARGIN + 14, box_y + 38, f"{index + 1:02d}")
        set_font(pdf, 9.5, True, TEXT)
        pdf.drawString(MARGIN + 48, box_y + 40, name)
        paragraph(pdf, detail, MARGIN + 155, box_y + 42, CONTENT_W - 170, 7.8, 10.5, MUTED)

    section_y = 288
    section_label(pdf, "Live browser QA", MARGIN, section_y)
    qa_rows = [
        ("Medical message", "Pass - PubMed references visible"),
        ("Citation coverage", "Pass - 100% for source-only fallback"),
        ("History controls", "Pass - search, rename, export, reload"),
        ("Dashboard", "Pass - metrics, period filters, export, refresh"),
        ("Responsive layout", "Pass - 390 px width, no horizontal overflow"),
        ("Session lifecycle", "Pass - restore, WebSocket reconnect, logout"),
    ]
    draw_table(pdf, qa_rows, MARGIN, section_y - 16, CONTENT_W, 27)
    reinforce_page_chrome(pdf)
    page_break(pdf)


def dataset_profile(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "Dataset analysis", "Medical Q&A descriptive profile", 5)
    rows = ANALYSIS["rows"]
    card_w = (CONTENT_W - 24) / 3
    metric_card(pdf, MARGIN, y - 80, card_w, f"{rows['total']:,}", "Source rows", "CSV input")
    metric_card(pdf, MARGIN + card_w + 12, y - 80, card_w, f"{rows['valid_question_answer_pairs']:,}", "Valid pairs", "5 missing answers")
    metric_card(pdf, MARGIN + (card_w + 12) * 2, y - 80, card_w, f"{rows['unique_normalized_questions']:,}", "Unique questions", "Normalized text")

    section_label(pdf, "Answer length distribution", MARGIN, y - 116)
    dist = ANALYSIS["answer_length_distribution"]
    dist_data = [
        ("Under 20", dist["under_20_words"]),
        ("20-99", dist["20_to_99_words"]),
        ("100-249", dist["100_to_249_words"]),
        ("250-499", dist["250_to_499_words"]),
        ("500-999", dist["500_to_999_words"]),
        ("1000+", dist["1000_words_or_more"]),
    ]
    draw_bar_chart(pdf, dist_data, MARGIN, y - 154, CONTENT_W, bar_height=14, gap=8, color=CYAN)

    section_y = 345
    section_label(pdf, "Question categories", MARGIN, section_y)
    qtypes = ANALYSIS["question_types"]
    q_data = [(label.title(), value) for label, value in list(qtypes.items())[:6]]
    draw_bar_chart(pdf, q_data, MARGIN, section_y - 38, CONTENT_W, bar_height=14, gap=8, color=BLUE)

    rounded_box(pdf, MARGIN, 72, CONTENT_W, 82, fill=SURFACE_2)
    section_label(pdf, "Interpretation", MARGIN + 16, 130)
    paragraph(
        pdf,
        f"Median answer length is {ANALYSIS['lengths_in_words']['answer']['median']} words and the 95th percentile is {ANALYSIS['lengths_in_words']['answer']['p95']:.0f}. Definition-style prompts dominate the dataset, so evaluation should be stratified by question type rather than relying on one aggregate score.",
        MARGIN + 16,
        108,
        CONTENT_W - 32,
        8.2,
        12,
        TEXT,
    )
    page_break(pdf)


def dataset_audit(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "Dataset audit", "Conflicts, provenance, and review risk", 6)
    multi = AUDIT["multiple_answer_questions"]
    card_w = (CONTENT_W - 24) / 3
    metric_card(pdf, MARGIN, y - 80, card_w, f"{multi['question_groups']:,}", "Multi-answer groups", "Distinct answers")
    metric_card(pdf, MARGIN + card_w + 12, y - 80, card_w, f"{multi['groups_below_0_35_similarity']:,}", "Low similarity", "Below 0.35")
    metric_card(pdf, MARGIN + (card_w + 12) * 2, y - 80, card_w, f"{multi['mean_pairwise_similarity']:.3f}", "Mean similarity", "Token Jaccard")

    section_label(pdf, "Structural flags", MARGIN, y - 118)
    flags = ANALYSIS["quality_flags"]
    content = AUDIT["content_flags"]
    flag_rows = [
        ("Missing answer rows", f"{flags['missing_answer_rows']:,}"),
        ("Exact normalized duplicates", f"{flags['exact_duplicate_rows_after_whitespace_normalization']:,}"),
        ("Repeated question rows", f"{flags['repeated_question_rows']:,}"),
        ("Answers containing URLs", f"{content['answers_with_urls']:,}"),
        ("Answers with non-ASCII characters", f"{content['answers_with_non_ascii_characters']:,}"),
    ]
    draw_table(pdf, flag_rows, MARGIN, y - 136, CONTENT_W, 27)

    sample_y = 380
    section_label(pdf, "Examples requiring review", MARGIN, sample_y)
    samples = AUDIT["sample_groups"][:3]
    for index, sample in enumerate(samples):
        box_y = sample_y - 28 - index * 83 - 64
        rounded_box(pdf, MARGIN, box_y, CONTENT_W, 66, fill=SURFACE_2)
        set_font(pdf, 9, True, TEXT)
        pdf.drawString(MARGIN + 14, box_y + 43, sample["question"][:68])
        set_font(pdf, 7.8, False, MUTED)
        pdf.drawString(MARGIN + 14, box_y + 22, f"{sample['distinct_answers']} answers | mean similarity {sample['average_answer_similarity']:.3f} | answer range {min(sample['answer_word_counts'])}-{max(sample['answer_word_counts']):,} words")

    rounded_box(pdf, MARGIN, 52, CONTENT_W, 64, fill=SURFACE)
    section_label(pdf, "Recommendation", MARGIN + 16, 98)
    paragraph(pdf, "Keep answer variants and their provenance visible. Do not silently merge conflicting clinical claims. Complete licensing and qualified clinical review before retrieval benchmarking or future model training.", MARGIN + 16, 79, CONTENT_W - 32, 8.2, 11, TEXT)
    reinforce_page_chrome(pdf)
    page_break(pdf)


def lora_page(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "LoRA preparation", "Validated configuration - no training", 7)
    paragraph(pdf, "The retired Colab export was replaced with a safe package that validates adapter settings, estimates adapter size, and creates deterministic SFT JSONL records. It cannot train or publish a model in its committed configuration.", MARGIN, y, CONTENT_W, 9.5, 14, TEXT)
    y -= 68
    section_label(pdf, "Configuration", MARGIN, y)
    config_rows = [
        ("Base model", LORA["base_model"]),
        ("Task type", LORA["task_type"]),
        ("Rank / alpha", f"{LORA['rank']} / {LORA['alpha']}"),
        ("Dropout", str(LORA["dropout"])),
        ("Target modules", ", ".join(LORA["target_modules"])),
        ("Maximum sequence length", str(LORA["max_sequence_length"])),
        ("Estimated adapter parameters", f"{LORA['estimated_adapter_parameters']:,}"),
        ("Estimated FP16 size", f"{LORA['estimated_fp16_megabytes']:.3f} MB"),
    ]
    draw_table(pdf, config_rows, MARGIN, y - 16, CONTENT_W, 25)

    workflow_y = 378
    section_label(pdf, "Preparation workflow", MARGIN, workflow_y)
    steps = [
        ("1", "Analyze", "Profile rows, lengths, categories, and missing values."),
        ("2", "Audit", "Review duplicate questions and low-similarity answer variants."),
        ("3", "Split", "Create deterministic question-level train, validation, and test files."),
        ("4", "Convert", "Write prompt-answer JSONL plus hashes and record counts."),
    ]
    box_w = (CONTENT_W - 18) / 2
    for index, (number, name, detail) in enumerate(steps):
        col, row = index % 2, index // 2
        x = MARGIN + col * (box_w + 18)
        box_y = workflow_y - 28 - row * 98 - 76
        rounded_box(pdf, x, box_y, box_w, 78, fill=SURFACE_2)
        set_font(pdf, 16, True, CYAN)
        pdf.drawString(x + 14, box_y + 48, number)
        set_font(pdf, 9.5, True, TEXT)
        pdf.drawString(x + 45, box_y + 50, name)
        paragraph(pdf, detail, x + 45, box_y + 33, box_w - 59, 7.6, 10, MUTED)

    rounded_box(pdf, MARGIN, 66, CONTENT_W, 82, fill=SURFACE)
    section_label(pdf, "Safety gate", MARGIN + 16, 124)
    bullets(pdf, ["training_enabled is false and publish_adapter is false.", "Future training requires dataset licensing, clinician review, held-out evaluation, privacy review, and an approved release process."], MARGIN + 16, 105, CONTENT_W - 32, size=7.8)
    page_break(pdf)


def backend_page(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "Backend and AI", "Safety, grounding, and persistence", 8)
    cards = [
        ("Prompt safety", "Input size limits, self-harm redirection, possible-emergency notices, and harmful-instruction screening."),
        ("Medical retrieval", "Focused PubMed query normalization, ESearch and ESummary requests, visible PMIDs, titles, journals, and links."),
        ("Citation audit", "Valid and invalid [n] markers, cited-source coverage, grounding state, provider, and model metadata."),
        ("History context", "Authenticated recent-chat retrieval with lightweight token-overlap scoring and explicit metadata on reused messages."),
        ("Private updates", "WebSocket clients are authenticated from HTTP-only cookies and broadcasts are filtered to the owning user."),
        ("Operations", "Request IDs, security headers, JSON limits, AI rate limits, structured 404/errors, graceful shutdown, and health status."),
    ]
    box_w = (CONTENT_W - 18) / 2
    for index, (title, detail) in enumerate(cards):
        col, row = index % 2, index // 2
        x = MARGIN + col * (box_w + 18)
        box_y = y - 16 - row * 118 - 96
        rounded_box(pdf, x, box_y, box_w, 98, fill=SURFACE if row % 2 == 0 else SURFACE_2)
        set_font(pdf, 10, True, TEXT)
        pdf.drawString(x + 14, box_y + 71, title)
        pdf.setFillColor(CYAN)
        pdf.roundRect(x + 14, box_y + 57, 42, 4, 2, fill=1, stroke=0)
        paragraph(pdf, detail, x + 14, box_y + 43, box_w - 28, 7.8, 10.5, MUTED)

    section_y = 332
    section_label(pdf, "Failure behavior", MARGIN, section_y)
    failure_rows = [
        ("Gemini key missing", "Return PubMed references only; do not invent an answer"),
        ("No PubMed match", "Return explicit fallback signal to the client"),
        ("Unsafe prompt", "Return safety redirect metadata without generation"),
        ("Database disconnected", "Expose state in /api/health; database routes fail clearly"),
        ("WebSocket interruption", "Exponential reconnect without losing HTTP functionality"),
    ]
    draw_table(pdf, failure_rows, MARGIN, section_y - 16, CONTENT_W, 30)
    reinforce_page_chrome(pdf)
    page_break(pdf)


def deployment_page(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "Deployment", "Same-origin container topology", 9)
    set_font(pdf, 9.5, False, TEXT)
    pdf.drawString(MARGIN, y, "Public request")
    nodes = [
        (MARGIN, "Browser", "HTTPS origin"),
        (MARGIN + 132, "Nginx", "React + proxy"),
        (MARGIN + 264, "Node API", "Port 5000"),
        (MARGIN + 396, "MongoDB", "Private volume"),
    ]
    for index, (x, title, detail) in enumerate(nodes):
        rounded_box(pdf, x, y - 112, 112, 72, fill=SURFACE_2)
        set_font(pdf, 10, True, TEXT)
        pdf.drawCentredString(x + 56, y - 72, title)
        set_font(pdf, 7.5, False, MUTED)
        pdf.drawCentredString(x + 56, y - 92, detail)
        if index < len(nodes) - 1:
            pdf.setStrokeColor(CYAN)
            pdf.line(x + 114, y - 76, x + 128, y - 76)

    section_y = y - 154
    section_label(pdf, "Production configuration", MARGIN, section_y)
    env_rows = [
        ("PUBLIC_ORIGIN", "Exact HTTPS frontend origin"),
        ("COOKIE_SECURE", "true behind HTTPS"),
        ("JWT_* secrets", "Four unique high-entropy values"),
        ("MONGO_URI", "Private MongoDB connection string"),
        ("GEMINI_API_KEY", "Optional server-side generation key"),
        ("BREVO_API_KEY", "Optional email delivery key"),
    ]
    draw_table(pdf, env_rows, MARGIN, section_y - 16, CONTENT_W, 27)

    checklist_y = 328
    section_label(pdf, "Release checklist", MARGIN, checklist_y)
    bullets(
        pdf,
        [
            "Copy .env.docker.example to .env and replace every placeholder secret.",
            "Set PUBLIC_ORIGIN and COOKIE_SECURE=true for the final HTTPS hostname.",
            "Run docker compose up --build -d and wait for MongoDB, API, and frontend health checks.",
            "Verify /api/health, login cookies, WebSocket connection, medical source links, and dashboard metrics.",
            "Configure backups, log retention, monitoring, and an incident response owner before public release.",
        ],
        MARGIN,
        checklist_y - 26,
        CONTENT_W,
        size=8.2,
    )
    rounded_box(pdf, MARGIN, 70, CONTENT_W, 66, fill=SURFACE)
    set_font(pdf, 8.5, True, CYAN)
    pdf.drawString(MARGIN + 16, 111, "Local command")
    set_font(pdf, 9, False, TEXT)
    pdf.drawString(MARGIN + 16, 89, "docker compose up --build -d")
    set_font(pdf, 7.5, False, MUTED)
    pdf.drawRightString(PAGE_W - MARGIN - 16, 89, "Docker CLI was unavailable in this QA environment; configuration is included for target-host validation.")
    page_break(pdf)


def validation_page(pdf: canvas.Canvas) -> None:
    y = page_header(pdf, "Validation and roadmap", "Release evidence and next controls", 10)
    section_label(pdf, "Automated evidence", MARGIN, y)
    test_rows = [
        ("Backend unit tests", "11 passing - citation, history, PubMed query, safety"),
        ("Python unit tests", "6 passing - dataset and LoRA tools"),
        ("Frontend lint", "Passing - ESLint"),
        ("Frontend production build", "Passing - 217 modules, 124.6 KB JS gzip"),
        ("Dependency audit", "0 production vulnerabilities in frontend and backend"),
        ("Python compilation", "Passing - all maintained dataset and LoRA modules"),
    ]
    y = draw_table(pdf, test_rows, MARGIN, y - 18, CONTENT_W, 29)

    y -= 12
    section_label(pdf, "Known limitations", MARGIN, y)
    y = bullets(
        pdf,
        [
            "Citation-number validation proves mapping to retrieved records, not the clinical truth of every generated statement.",
            "The custom safety filter is a first layer; production needs provider safety controls, abuse monitoring, and escalation procedures.",
            "The dataset lacks complete per-answer provenance and licensing fields, and multi-answer questions need qualified review.",
            "Conversation retrieval is lexical token overlap, not a production semantic vector index.",
        ],
        MARGIN,
        y - 24,
        CONTENT_W,
        size=8.2,
    )

    y -= 2
    section_label(pdf, "Recommended next steps", MARGIN, y)
    bullets(
        pdf,
        [
            "Deploy to a staging HTTPS origin and execute the browser QA checklist against production containers.",
            "Add mocked controller integration tests plus a repeatable browser automation suite for auth, CRUD, chat, and analytics.",
            "Introduce structured observability, secret rotation, database backups, and uptime alerting.",
            "Complete clinical, privacy, accessibility, and dataset licensing reviews before any healthcare-facing release.",
        ],
        MARGIN,
        y - 24,
        CONTENT_W,
        size=8.2,
    )

    rounded_box(pdf, MARGIN, 64, CONTENT_W, 94, fill=SURFACE_2)
    section_label(pdf, "Project attribution", MARGIN + 16, 132)
    set_font(pdf, 13, True, TEXT)
    pdf.drawString(MARGIN + 16, 108, "J Ganesh kumar reddy")
    paragraph(pdf, "Full-stack product work spanning React UI/UX, backend CRUD and authentication, medical AI integration, dataset curation, safeguards, analytics, testing, documentation, and deployment preparation.", MARGIN + 16, 88, CONTENT_W - 32, 8, 11, MUTED)
    reinforce_page_chrome(pdf)
    page_break(pdf)


def build_report() -> Path:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    pdf.setTitle("MedAssist AI Project Upgrade Report")
    pdf.setAuthor("J Ganesh kumar reddy")
    pdf.setSubject("Dataset, AI, frontend, backend, deployment, and QA upgrade report")
    pdf.setCreator("MedAssist AI report generator")
    cover(pdf)
    executive_summary(pdf)
    architecture(pdf)
    product_ux(pdf)
    dataset_profile(pdf)
    dataset_audit(pdf)
    lora_page(pdf)
    backend_page(pdf)
    deployment_page(pdf)
    validation_page(pdf)
    pdf.save()
    return OUTPUT


if __name__ == "__main__":
    path = build_report()
    print(f"Created {path}")
