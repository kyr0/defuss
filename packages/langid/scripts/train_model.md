# fasttext-based language identification model training

We're using OpenLID dataset for training, which is typically a set of 201+ languages. However, with `defuss-search` only supporting a subset, we focus on those. This means we can remove the training data for languages that are not supported by the search engine.

https://github.com/laurieburchell/open-lid-dataset

We're also reducing the dimensionality of the model to make it smaller and more efficient, while still maintaining reasonable accuracy. We also show it less samples.

## Model size reduction

| tweak                        | typical effect                                                    |
| ---------------------------- | ----------------------------------------------------------------- |
| **`dim 100`** instead of 256 | −61 % size, <−1 pp macro-F1                                       |
| **`bucket 200 000`**         | still enough hash room; shrinks the fixed part of the matrix      |
| **`cutoff` 8 k … 15 k**      | linear trade-off size ↔ recall. 12 k rows ≈ 100 kB codes section. |
| **`-dsub 2`**                | smallest centroid tables (same as Facebook’s lid.176.ftz)         |

Finally, we take measures to increase accuracy despite the reduced size. The model is trained with more epochs, uses 2-grams; we let it learn longer.

## Hyper-parameter changes

| hyper-param       | original (2 × 256 dim) | why small-model recipe changes                                                                                                                                                                                                                   |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **epochs**        | 2                      | With only 100 dim and 8–12 k retained n-grams, each weight sees far less capacity → give it more passes so it converges. Going 10 → 12 makes <0.1 pp difference, but 2 falls \~1 pp macro-F1.                                                    |
| **wordNgrams**    | 1                      | Adding **2-gram order** lets the classifier see short word pairs (“je suis”, “good morning”), which compensates for the lower embedding dim. It costs zero model size (ngrams are hashed), yet typically adds +0.5 pp F1 on tweet-length inputs. |
| **learning-rate** | 0.8                    | Higher LR is fine when you re-train only 2 epochs: you’re basically making one noisy pass. With 10 epochs it overshoots; 0.4–0.6 keeps a stable plateau. 0.5 was the autotuner’s sweet spot for the 16-lang corpus.                              |
