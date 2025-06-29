import os
import json
import argparse

LANGUAGES = [
    "ara", "dan", "deu", "eng", "fra", "ita", "nld", "por", "rus", "spa", "swe", "tur"
]

def process_file(lang, dataset_dir, doc_count):
    qrels_path = os.path.join(dataset_dir, f"{lang}_qrels.json")
    queries_path = os.path.join(dataset_dir, f"{lang}_queries.json")
    documents_path = os.path.join(dataset_dir, f"{lang}_documents.json")

    # Check if all files exist
    if not (os.path.exists(qrels_path) and os.path.exists(queries_path) and os.path.exists(documents_path)):
        print(f"[WARN] Skipping {lang}: missing one or more required files.")
        return

    # Load queries
    with open(queries_path, "r", encoding="utf-8") as fq:
        queries_data = json.load(fq)
    # queries_data: {qid: query_string}

    # Load documents
    with open(documents_path, "r", encoding="utf-8") as fd:
        documents_data = json.load(fd)
    # documents_data: {did: {"title": ..., "text": ...}}

    flat_list = []
    count = 0
    with open(qrels_path, "r", encoding="utf-8") as f:
        qrels_data = json.load(f)
        for qid, doc_dict in qrels_data.items():
            for did in doc_dict.keys():
                if count >= doc_count:
                    break
                # Get query string
                query = queries_data.get(qid, None)
                # Get document body text
                doc_entry = documents_data.get(did, None)
                body_text = doc_entry["text"] if doc_entry else None
                if query is not None and body_text is not None:
                    flat_list.append(query)
                    flat_list.append(body_text)
                    count += 1
            if count >= doc_count:
                break
    # Write output
    with open(os.path.join(dataset_dir, f"{lang}_flat.json"), "w", encoding="utf-8") as fout:
        json.dump(flat_list, fout, ensure_ascii=False)

def main():
    parser = argparse.ArgumentParser(description="Flatten qrels files for each language.")
    parser.add_argument("--dataset_dir", type=str, default="dataset", help="Path to dataset directory.")
    parser.add_argument("--doc_count", type=int, default=8300, help="Number of entries to select.")
    args = parser.parse_args()
    for lang in LANGUAGES:
        print(f"Processing {lang}...")
        process_file(lang, args.dataset_dir, args.doc_count)
        print(f"Done {lang}.")

if __name__ == "__main__":
    main()
