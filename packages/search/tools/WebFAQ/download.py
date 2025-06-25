import datasets
import json
import os
from mteb.abstasks.TaskMetadata import TaskMetadata
from mteb.abstasks.AbsTaskRetrieval import AbsTaskRetrieval
from pathlib import Path

# Missing:
#Finnish (`fi`) *,  Hungarian (`hu`), Norwegian (`no`), Romanian (`ro`), 

_LANGUAGES = [
    "ara-Arab",
    "dan-Latn",
    "deu-Latn",
    "eng-Latn",
    "fas-Arab",
    "fra-Latn",
    #"hin-Deva",
    #"ind-Latn",
    "ita-Latn",
    #"jpn-Hani",
    #"kor-Hani",
    "nld-Latn",
    #"pol-Latn",
    "por-Latn",
    "rus-Cyrl",
    "spa-Latn",
    "swe-Latn",
    "tur-Latn",
    #"vie-Latn",
    #"zho-Hani",
]


class WebFAQ(AbsTaskRetrieval):
    metadata = TaskMetadata(
        name="WebFAQ",
        dataset={
            "path": "anonymous202501/webfaq-retrieval",
            "revision": "b4320165e039fec2ed05f4b1ba74e4e9376da070",
        },
        description="WebFAQ uses FAQ pages scraped from microdata and json-ld content of a diverse set of webpages.",
        reference="https://www.fim.uni-passau.de",
        type="Retrieval",
        category="s2p",
        eval_splits=["test"],
        eval_langs=_LANGUAGES,
        main_score="ndcg_at_10",
        date=None,
        form=None,
        domains=None,
        task_subtypes=None,
        license=None,
        socioeconomic_status=None,
        annotations_creators=None,
        dialect=None,
        text_creation=None,
        bibtex_citation=None,
        n_samples=None,
        avg_character_length=None,
    )

    def load_data(self, **kwargs):
        """
        Loads the different split of the dataset (queries/corpus/relevants)
        """
        if self.data_loaded:
            return

        self.language = self.metadata.eval_langs[0].split("-")[0]
        self.relevant_docs = {}
        self.queries = {}
        self.corpus = {}

        data_qrels = datasets.load_dataset(
            self.metadata_dict["dataset"]["path"],
            f"{self.language}-qrels",
            split=self.metadata.eval_splits[0],
            revision=self.metadata_dict["dataset"].get("revision", None),
        )
        data_queries = datasets.load_dataset(
            self.metadata_dict["dataset"]["path"],
            f"{self.language}-queries",
            split="queries",
            revision=self.metadata_dict["dataset"].get("revision", None),
        )
        data_corpus = datasets.load_dataset(
            self.metadata_dict["dataset"]["path"],
            f"{self.language}-corpus",
            split="corpus",
            revision=self.metadata_dict["dataset"].get("revision", None),
        )

        self.relevant_docs = {
            self.metadata.eval_splits[0]: {
                d["query-id"]: {d["corpus-id"]: int(d["score"])} for d in data_qrels
            }
        }
        set_query_ids = set(self.relevant_docs[self.metadata.eval_splits[0]].keys())
        self.queries = {
            self.metadata.eval_splits[0]: {
                d["_id"]: d["text"] for d in data_queries if d["_id"] in set_query_ids
            }
        }
        self.corpus = {
            self.metadata.eval_splits[0]: {
                d["_id"]: {"title": d["title"], "text": d["text"]} for d in data_corpus
            }
        }

        self.data_loaded = True

    def save_to_json(self, output_dir, language=None):
        """Save the loaded data to JSON files."""
        if not self.data_loaded:
            self.load_data()
        
        if language is None:
            language = self.language
            
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Save queries
        queries_file = output_path / f"{language}_queries.json"
        with open(queries_file, 'w', encoding='utf-8') as f:
            json.dump(self.queries["test"], f, indent=2, ensure_ascii=False)
        
        # Save documents (corpus)
        documents_file = output_path / f"{language}_documents.json"
        with open(documents_file, 'w', encoding='utf-8') as f:
            json.dump(self.corpus["test"], f, indent=2, ensure_ascii=False)
        
        # Save qrels (relevance judgments)
        qrels_file = output_path / f"{language}_qrels.json"
        with open(qrels_file, 'w', encoding='utf-8') as f:
            json.dump(self.relevant_docs["test"], f, indent=2, ensure_ascii=False)
        
        return {
            'queries': len(self.queries["test"]),
            'documents': len(self.corpus["test"]),
            'qrels': len(self.relevant_docs["test"])
        }


def download_all_languages():
    """Download WebFAQ data for all available languages and save as JSON."""
    script_dir = Path(__file__).parent
    output_dir = script_dir / "benchmark_data"
    
    print("🌍 WebFAQ Data Collection")
    print("=" * 40)
    print(f"Languages: {len(_LANGUAGES)}")
    print(f"Output: {output_dir}")
    print()
    
    total_stats = {'queries': 0, 'documents': 0, 'qrels': 0}
    
    for lang_code in _LANGUAGES:
        language = lang_code.split('-')[0]  # Extract language from lang-script format
        print(f"📥 Processing {language} ({lang_code})...")
        
        try:
            # Create WebFAQ instance for this language
            webfaq = WebFAQ()
            # Override the language list to process only this language
            webfaq.metadata.eval_langs = [lang_code]
            
            # Load and save data
            stats = webfaq.save_to_json(output_dir, language)
            
            print(f"  ✅ {language}: {stats['documents']} docs, {stats['queries']} queries")
            
            total_stats['queries'] += stats['queries']
            total_stats['documents'] += stats['documents']
            total_stats['qrels'] += stats['qrels']
            
        except Exception as e:
            print(f"  ❌ Error processing {language}: {e}")
            continue
    
    print()
    print("📊 Summary:")
    print(f"  Total documents: {total_stats['documents']}")
    print(f"  Total queries: {total_stats['queries']}")
    print(f"  Total qrels: {total_stats['qrels']}")
    print(f"  Output directory: {output_dir}")
    print()
    print("🎉 WebFAQ collection completed!")


if __name__ == "__main__":
    download_all_languages()