"""Build and search a local semantic index of explicitly selected documents.

Requires sentence-transformers and, for PDF/image ingestion, PyMuPDF, Pillow and
pytesseract plus the Tesseract executable. Contents and embeddings remain local.
"""
import argparse
import json
import math
from pathlib import Path

MAX_BYTES = 10 * 1024 * 1024
SUPPORTED = {".txt", ".md", ".pdf", ".png", ".jpg", ".jpeg"}


def chunks(text, size=1000, overlap=150):
    if size < 1 or not 0 <= overlap < size:
        raise ValueError("Invalid chunk settings")
    text = " ".join(text.split())
    return [text[start:start + size] for start in range(0, len(text), size - overlap) if text[start:start + size].strip()]


def read_document(path, ocr=False):
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(f"File exceeds 10 MiB: {path.name}")
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8")
    if suffix == ".pdf":
        import fitz
        with fitz.open(path) as doc:
            if len(doc) > 100:
                raise ValueError(f"PDF exceeds 100 pages: {path.name}")
            pages = []
            for page in doc:
                text = page.get_text()
                if not text.strip() and ocr:
                    import pytesseract
                    from PIL import Image
                    from io import BytesIO
                    text = pytesseract.image_to_string(Image.open(BytesIO(page.get_pixmap().tobytes("png"))))
                pages.append(text)
            return "\n".join(pages)
    if suffix in {".png", ".jpg", ".jpeg"} and ocr:
        import pytesseract
        from PIL import Image
        with Image.open(path) as image:
            return pytesseract.image_to_string(image)
    return ""


def build_index(root, model_name, embed, ocr=False):
    root = root.resolve(strict=True)
    if not root.is_dir(): raise ValueError("Input must be a directory")
    records = []
    for path in sorted(root.rglob("*")):
        if path.is_symlink() or not path.is_file() or path.suffix.lower() not in SUPPORTED:
            continue
        if not path.resolve().is_relative_to(root): raise ValueError("Document escapes input directory")
        for index, content in enumerate(chunks(read_document(path, ocr))):
            records.append({"source": path.relative_to(root).as_posix(), "chunk": index, "text": content})
    if not records: raise ValueError("No text extracted; use --ocr for scanned files")
    vectors = embed([record["text"] for record in records])
    if len(vectors) != len(records): raise ValueError("Embedding count mismatch")
    for record, vector in zip(records, vectors):
        record["vector"] = [float(value) for value in vector]
    return {"version": 1, "model": model_name, "records": records}


def search(index, query_vector, limit=5):
    if not 1 <= limit <= 20: raise ValueError("Limit must be 1 to 20")
    def cosine(vector):
        if len(vector) != len(query_vector): raise ValueError("Embedding dimensions do not match")
        dot = sum(a * b for a, b in zip(vector, query_vector))
        denom = math.sqrt(sum(a * a for a in vector) * sum(b * b for b in query_vector))
        return dot / denom if denom else 0.0
    ranked = [{"source": row["source"], "chunk": row["chunk"], "text": row["text"], "score": cosine(row["vector"])} for row in index["records"]]
    return sorted(ranked, key=lambda row: row["score"], reverse=True)[:limit]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    ingest = sub.add_parser("ingest"); ingest.add_argument("directory", type=Path); ingest.add_argument("index", type=Path); ingest.add_argument("--model", default="sentence-transformers/all-MiniLM-L6-v2"); ingest.add_argument("--ocr", action="store_true")
    query = sub.add_parser("search"); query.add_argument("index", type=Path); query.add_argument("query"); query.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    from sentence_transformers import SentenceTransformer
    if args.command == "ingest":
        if args.index.exists(): raise FileExistsError("Index already exists; choose a new output path")
        model = SentenceTransformer(args.model)
        index = build_index(args.directory, args.model, lambda texts: model.encode(texts), args.ocr)
        with args.index.open("x", encoding="utf-8") as output: json.dump(index, output, ensure_ascii=False)
        print(f"Indexed {len(index['records'])} chunks in {args.index}")
    else:
        index = json.loads(args.index.read_text(encoding="utf-8"))
        model = SentenceTransformer(index["model"])
        print(json.dumps(search(index, model.encode([args.query])[0], args.limit), ensure_ascii=False, indent=2))


if __name__ == "__main__": main()
