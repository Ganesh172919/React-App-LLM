"""Build a complete flowing PDF from current implementation docs and test evidence."""
from pathlib import Path
import html
import json
import re
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / "output/qa"
OUTPUT = ROOT / "output/pdf/medassist_ai_project_report.pdf"
REPORT_DATE = "30 October 2026"
WIDTH = A4[0] - 88
for regular, bold in [("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"), ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")]:
    if Path(regular).exists() and Path(bold).exists():
        pdfmetrics.registerFont(TTFont("Project", regular))
        pdfmetrics.registerFont(TTFont("ProjectBold", bold))
        pdfmetrics.registerFontFamily("Project", normal="Project", bold="ProjectBold", italic="Project", boldItalic="ProjectBold")
        break
else:
    raise RuntimeError("Arial or DejaVu Sans is required.")
BODY = ParagraphStyle("Body", fontName="Project", fontSize=10, leading=14.4, spaceAfter=8, textColor=colors.HexColor("#25384c"))
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8, leading=11, spaceAfter=6)
H1 = ParagraphStyle("Heading1", parent=BODY, fontName="ProjectBold", fontSize=17, leading=21, spaceBefore=15, spaceAfter=10, keepWithNext=True, textColor=colors.HexColor("#173e6b"))
H2 = ParagraphStyle("Heading2", parent=BODY, fontName="ProjectBold", fontSize=12, leading=16, spaceBefore=10, spaceAfter=7, keepWithNext=True)
TITLE = ParagraphStyle("Title", parent=H1, fontSize=24, leading=29, spaceBefore=0)
CELL = ParagraphStyle("Cell", parent=SMALL, spaceAfter=0)
CODE = ParagraphStyle("Code", parent=SMALL, fontName="Courier", fontSize=8, leading=11, leftIndent=8)

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def p(text, style=BODY):
    text = str(text).replace("\u2014", "-").replace("\u2013", "-").replace("\u2011", "-").replace(chr(96), "")
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)
    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return Paragraph(text.replace("\n", "<br/>"), style)

def grid(headers, rows, widths=None):
    result = Table([[p(v, CELL) for v in headers]] + [[p(v, CELL) for v in row] for row in rows], colWidths=widths or [WIDTH / len(headers)] * len(headers), repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e9f0f7")), ("LINEBELOW", (0,0), (-1,-1), .4, colors.HexColor("#cbd5df")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6)]))
    return result

def markdown(file, title):
    lines = file.read_text(encoding="utf-8").splitlines()
    result = []
    index = 0
    while index < len(lines):
        line = lines[index].rstrip()
        if not line.strip():
            index += 1
        elif line.startswith(chr(96)*3):
            index += 1
            while index < len(lines) and not lines[index].startswith(chr(96)*3):
                index += 1
            index += 1
        elif line.strip() in ("---", "***") or line.startswith("> [!"):
            index += 1
        elif line.startswith("#"):
            result.append(p(title if line.startswith("# ") else line.lstrip("#").strip(), H1 if line.startswith("# ") else H2))
            index += 1
        elif line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].startswith("|"):
                cells = [v.strip() for v in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[: -]+", v) for v in cells):
                    rows.append(cells)
                index += 1
            if rows:
                if result and isinstance(result[-1], Paragraph):
                    result[-1].keepWithNext = False
                widths = [WIDTH*.19, WIDTH*.52, WIDTH*.29] if len(rows[0]) == 3 else [WIDTH*.3, WIDTH*.7] if len(rows[0]) == 2 else None
                result += [grid(rows[0], rows[1:], widths), Spacer(1, 8)]
        elif line.startswith("    "):
            result.append(p(line.strip(), CODE)); index += 1
        elif line.startswith(("- ", "> ")) or re.match(r"^\d+\.", line):
            result.append(p(line.lstrip("> ").strip())); index += 1
        else:
            values = [line]; index += 1
            while index < len(lines) and lines[index].strip() and not lines[index].startswith(("#", "|", "- ", ">", "    ", chr(96)*3)) and not re.match(r"^\d+\.", lines[index]):
                values.append(lines[index].strip()); index += 1
            result.append(p(" ".join(values)))
    return result

def image(file, height=315):
    from PIL import Image as PILImage
    file = QA / file
    with PILImage.open(file) as source:
        w, h = source.size
    scale = min(WIDTH / w, height / h)
    return Image(str(file), width=w*scale, height=h*scale, hAlign="CENTER")

def decorate(canvas, doc):
    canvas.setStrokeColor(colors.HexColor("#b7c8db")); canvas.line(44, A4[1]-35, A4[0]-44, A4[1]-35)
    canvas.setFillColor(colors.HexColor("#234d7c")); canvas.setFont("ProjectBold", 8)
    canvas.drawString(44, A4[1]-25, "MEDASSIST AI | IMPLEMENTATION AND VERIFICATION REPORT")
    canvas.setFillColor(colors.HexColor("#526477")); canvas.setFont("Project", 8)
    canvas.drawString(44, 25, "J Ganesh kumar reddy | Student project | " + REPORT_DATE)
    canvas.drawRightString(A4[0]-44, 25, "Page " + str(doc.page))

def build_report():
    automated = load(QA / "automated-results.json")
    browser = load(QA / "browser-results.json")
    serving = load(QA / "build-serving-results.json")
    frontend = load(QA / "frontend-results.json")
    manifest = load(ROOT / "Model and Dataset/prepared/manifest.json")
    backend = re.search(r"# tests (\d+)", (QA/"backend.log").read_text(encoding="utf-8")).group(1)
    python_counts = [re.search(r"Ran (\d+) tests", (QA/(name+"-tests.log")).read_text(encoding="utf-8")).group(1) for name in ("dataset", "lora")]
    audits = [(name + " production npm audit", str(load(QA/(name+"-audit.json"))["metadata"]["vulnerabilities"]["total"]) + " reported vulnerabilities") for name in ("backend","frontend")]
    story = [
        p("MedAssist AI", TITLE),
        p("Implementation, local verification, UI review, and release limits", H2),
        p("Developed by J Ganesh kumar reddy. Continuation and verification dated " + REPORT_DATE + ". This educational project uses a responsive workspace and explicit evidence labels."),
        p("Executive summary", H1),
        p("The application includes rotating and revocable sessions, server-owned medical routing, PubMed retrieval, explicit evidence fallbacks, retry-safe saves, encrypted personal provider keys, and opt-in bounded past-chat context. This continuation corrected misleading privacy copy, removed generic follow-ups after safety redirects, and changed calculators and medication-pair flags to educational estimates and cautions. Local tests exercise these paths but do not establish clinical validity."),
        p("The 30 October headless browser pass ran against frontend/dist on port 4173 with synthetic providers and a local email inbox. HTTP, authentication, MongoDB and WebSockets were real in the isolated test stack. The browser verified registration and email confirmation using a disposable account. Automated disposable-account tests cover password changes and permanent deletion; browser checks cover their forms and guards. These checks do not establish clinical correctness, model accuracy or completion of public deployment."),
        grid(["Verification area","Recorded result"], [
            ("Backend service/API/database/WebSocket tests", backend+" passed"),
            ("Frontend component/client tests", str(frontend["numPassedTests"])+" passed"),
            ("Dataset / LoRA tests",python_counts[0]+" passed / "+python_counts[1]+" passed"),
            ("Headless browser workflow checklist",str(sum(v["passed"] for v in browser["results"]))+" of "+str(len(browser["results"]))+" passed"),
            ("Built-output HTTP checks",str(sum(v["passed"] for v in serving["results"]))+" passed"),
            ("Frontend lint and production build","Passed" if automated["passed"] else "See command logs"),
            *audits,
            ("Docker, real Gemini and email","Not exercised locally; host/credentials required"),
        ], [WIDTH*.6, WIDTH*.4]),
        Spacer(1,10),
        p("No external messages were sent. Local test messages exercised the chat with synthetic services. No LoRA model weights were downloaded, no GPU training ran and no adapter was published. The source CSV remains unchanged. Docker, public TLS, real mailbox delivery, credentialed generation and backup restore are still release checks. The included nginx container does not terminate TLS."),
    ]
    story += markdown(ROOT/"docs/CURRENT_IMPLEMENTATION.md","1. Architecture, API and data contracts")
    story += [
        p("2. UI/UX and visual evidence",H1),
        Spacer(1,8),
        p("The responsive interface uses standard forms, teal controls and calm, high-contrast cards. Landing, sign-in/recovery, chat, dashboard and account pages share one visual system. The chat keeps its composer visible while messages scroll independently. The evidence badge describes citation-number matching without claiming clinical verification. The account page makes provider selection, personal key storage, and past-chat opt-in visible."),
        image("chat-desktop.png",230),
        p("Figure 1. Desktop chat capture from the 30 October headless browser pass. Answer text is synthetic test content.",SMALL),
        p("Completed answers remain visible while saving. A save failure offers Retry saving and local export. A pending exchange is cached per user and can be restored after changing pages. Loading history locks sending, fresh conversations clear old save feedback, filtered history retains the active title and Copy answer confirms clipboard success. Untrusted chat links and remote images are inert; canonical PubMed source links remain available."),
        p("Mobile and recovery behavior",H2),
        Table([[image("chat-mobile.png",250),image("register-mobile.png",250)]],colWidths=[WIDTH/2,WIDTH/2]),
        p("Figure 2. Current 390px chat and 320px registration captures from the 30 October production-bundle browser suite.",SMALL),
        p("Mobile History overlays the workspace with a visible close control and Escape support, then returns focus to the History toggle. Covered chat controls are inert while the drawer is open. The composer is labelled, bounded to 4,000 characters, supports Shift+Enter and respects IME composition. At 320px the shortcut hint is hidden so Send stays on the counter row. Registration confirms the password before submission and omits links to the current page. Verification resend accepts a prefilled email; reset forms explain incomplete links; privacy text describes provider transfers and active-data deletion. The delete dialog has distinct keep/delete actions. These are practical functional and visual checks, not a comprehensive accessibility certification."),
        p("The browser suite checks document scrollWidth against clientWidth at desktop, 390px chat and 320px chat/registration widths. It also confirms all suggested topics fit inside the 320px empty chat message pane. The empty chat starts at the top of its message pane and keeps the composer visible. Suggested topics use short labels; new conversation titles omit pasted Markdown URLs and images."),
        p("The dashboard groups number cards above daily activity, answer outcomes and dataset descriptions. Empty accounts receive a Start a conversation link, and the source rate is undefined until medical answers exist. Long activity ranges scroll within the chart/table container. A JSON export was parsed with a 90-day trend and lifetime counts matching the isolated saved records. The health calculators now display estimates and explicit limits. Medication-pair name matches invite pharmacist review rather than giving treatment instructions."),
    ]
    story += markdown(ROOT/"docs/IMPLEMENTATION_STATUS.md","3. Improvement-plan coverage and verification")
    story += [
        p("4. Browser test evidence",H1),
        p("The 30 October workflow checklist below records headless browser interaction with the production bundle, isolated MongoDB and authenticated WebSockets. Fixtures supply generation/literature/email responses. The browser suite injects one save outage, then commits the recovered answer. It also checks emergency and harmful-message redirects, medication cautions, calculator limits, inert Markdown, cleaned titles, exports, dashboard views, mobile layout, registration and verification."),
        grid(["Workflow","Result"],[(v["name"],"PASS" if v["passed"] else "FAIL: "+v.get("error","")) for v in browser["results"]],[WIDTH*.83,WIDTH*.17]),
        Spacer(1,10),
        p("The 30 October browser run recorded no uncaught application exceptions. This is a bounded observation, not a guarantee covering every browser/device. Current results are in output/qa/browser-results.json. Earlier built-in browser evidence and captures remain in output/qa/2026-10-26 as historical references."),
        p("Backend checks cover registration/recovery, token persistence/rotation/replay, ownership, authoritative saves, concurrent deduplication, history pages, safety routes, malformed bodies, provider shapes, live delivery and analytics counts. Frontend assertions cover renewal concurrency, forbidden errors, failed refresh, save-only recovery, navigation guards, IME and stale range requests. Software tests use synthetic inputs; real clinical behavior requires an appropriate independent evaluation."),
        p("5. Dataset integrity and preparation",H1),
        p("The descriptive source reports contain 16,412 rows, 16,407 valid pairs, five missing answers, 48 exact duplicate pairs and 1,396 earlier multi-answer question groups. Low token similarity is a review signal, not proof of clinical contradiction. Canonical grouping now also normalizes Unicode, punctuation, case and whitespace, producing a stricter set of 1,437 quarantined question groups."),
        grid(["Prepared split","Records","Integrity"],[(name,str(manifest["splits"][name]),"CSV/JSONL hashes and counts recorded") for name in ("train","validation","test")],[WIDTH*.23,WIDTH*.17,WIDTH*.6]),
        Spacer(1,8),
        p("Source SHA-256: "+manifest["source_sha256"],SMALL),
        p("Quarantine excludes multi-answer groups rather than treating the longest answer as a clinical quality decision. Provenance sidecars retain stable record IDs, source hash, split and pending review status. Missing source URLs, rights evidence and clinical approval remain unverified. Empty release splits, missing values, duplicates, cross-split exact/canonical overlap, row-count mismatch and changed hashes are rejected. JSONL integrity is independently checked in the LoRA dry run."),
        p("The prepared snapshot has zero exact or canonical overlap across the three splits. Both clinical and licensing approvals remain false. Canonical matching is conservative structural hygiene, not semantic equivalence or clinical independence."),
    ]
    story += [
        p("6. LoRA files and experiment boundary", H1),
        p("The offline package prepares supervised question-answer records, quarantines ambiguous multi-answer groups, checks hashed partitions and provides review-gated LoRA and QLoRA scripts. The web application does not load an adapter."),
        grid(["File","Role"], [
            ("build_lora_package.py","Deterministic splits, quarantine, provenance and SHA-256 manifests."),
            ("train_lora.py","Dry run by default. Training requires explicit opt-in and documented clinical and license approvals."),
            ("infer_adapter.py","Local inference against an adapter produced outside the web runtime."),
            ("evaluate_benchmark.py","Independent reviewer scores and paired case-level ablation comparisons."),
        ], [WIDTH*.32, WIDTH*.68]),
        Spacer(1,8),
        p("The GPT-2 example uses rank 8 and analytically estimates 147,456 trainable adapter parameters, or 0.281 MB of FP16 adapter weights. This is not total GPU use. No model was trained here, and no 60 percent peak-memory reduction or clinical accuracy result was measured."),
    ]
    story += markdown(ROOT/"docs/SECURITY_AND_MESSAGE_POLICY.md","7. Security and message policy")
    story += markdown(ROOT/"docs/EVALUATION_AND_INTEGRATION.md","8. Evaluation and integration limits")
    story += markdown(ROOT/"docs/DEPLOYMENT_RUNBOOK.md","9. Deployment, operations and rollback")
    story += markdown(ROOT/"docs/ISSUES_AND_RISKS.md","10. Prioritized issues and release risks")
    story += [
        p("11. Reproduction, evidence index and release review",H1),
        p("Run node scripts/verify_project.cjs to capture backend, frontend lint/tests/build, Python suites, dry-run inspection and production dependency audits. Set PYTHON_BIN if a particular Python executable is required. Build frontend/dist, start node scripts/run_build_qa.cjs --fixtures, then run node scripts/browser_smoke.cjs against http://127.0.0.1:4173. Run node scripts/check_build_serving.cjs for the HTTP acceptance checks."),
        grid(["Evidence artifact","Purpose"],[
            ("automated-results.json / backend.log","Command exit status, runtime and backend TAP outcomes."),
            ("frontend-results.json","Named component/API-client assertions."),
            ("browser-results.json","30 October headless browser workflow results."),
            ("build-serving-results.json","Seven HTTP checks against the production-bundle gateway."),
            ("backend-audit.json / frontend-audit.json","Time-specific production dependency audits."),
            ("2026-10-26 mobile PNGs","Historical built-in CDP captures; current browser suite rechecks responsive widths."),
            ("Prepared manifests and validation report","Source/split hashes, counts, quarantine and overlap checks."),
            ("Current implementation / status / runbook","Delivered contracts and external release boundaries."),
        ],[WIDTH*.45,WIDTH*.55]),
        Spacer(1,10),
        p("Software verification ran on Node "+automated["node"]+". Containers use the Node 24 line and must be pulled/built on the real release host. No unexecuted remote CI run is claimed as passed. Dependency audits are time-specific reports, not guarantees against unknown vulnerabilities."),
        p("Implementation evidence and review points",H2),
        p("Authentication and sessions: backend/controllers/authController.js and services/sessionService.js. Answer routing and authoritative generation: backend/services/answerService.js. Browser recovery and presentation: frontend/src/components/chat/ChatWorkspace.jsx and lib/tabStorage.js. Container paths: docker-compose.yml, frontend/nginx.conf and the Dockerfiles. Reproducibility: scripts/verify_project.cjs, scripts/check_build_serving.cjs and Model and Dataset/lora/train_lora.py. These repository sources and recorded logs define the delivered behavior.",SMALL),
        p("Built-output HTTP acceptance details",H2),
        grid(["Check against local production-bundle gateway", "Result"], [(item["name"], "PASS" if item["passed"] else "FAIL") for item in serving["results"]], [WIDTH*.83, WIDTH*.17]),
        Spacer(1,8),
        p("Remaining release conditions",H2),
        p("Run Compose on a Docker-capable host; configure real email/Gemini credentials; validate TLS, exact origins, cookies and WebSockets; and rehearse authenticated data migration and restore. Resolve source rights/provenance and domain review before training or medical use. Add shared quota/event infrastructure before scaling to multiple API processes. A passing software suite cannot replace operational, clinical or legal evidence."),
    ]
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    doc=SimpleDocTemplate(str(OUTPUT),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=50,bottomMargin=49,title="MedAssist AI - Full implementation and verification report",author="J Ganesh kumar reddy",pageCompression=1)
    doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
    print("Created "+str(OUTPUT))
    return OUTPUT

if __name__=="__main__":
    build_report()
