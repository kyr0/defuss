#!/bin/sh

# Script to download, prepare and train a custom language identification model

# Prerequisites:
brew install coreutils pigz fasttext

# Download the dataset (11 GB), see https://github.com/laurieburchell/open-lid-dataset
wget https://data.statmt.org/lid/lid201-data.tsv.gz

# Extract (streaming) the dataset into a tab-separated file (leaving only the languages you desire)
pigz -dc lid201-data.tsv.gz | awk -F"\t" 'BEGIN{ 
   keep="arb_Arab dan_Latn nld_Latn eng_Latn fin_Latn fra_Latn deu_Latn hun_Latn ita_Latn nob_Latn por_Latn ron_Latn rus_Cyrl spa_Latn swe_Latn tur_Latn"
   split(keep,k," "); for(i in k) ok[k[i]]=1 }
   ok[$2]{print "__label__"$2" "$1}' \
 > lid16.txt

# Split the dataset into training and validation sets (100k for validation, rest for training)
shuf lid16.txt | awk 'NR<=100000 {print >"valid.txt"; next} {print >"train.txt"}'


# --- Official params ---

# Train the model (91.4MB lid16-model.vec, 1.06GB lid16-model.bin)
# fasttext supervised -input train.txt -output lid16-model -minCount 1000 -bucket 1000000 -minn 2 -maxn 5 -lr 0.8 -dim 256 -epoch 2 -thread 68 -wordNgrams 1

# Quantize the model (7.1 MB)
# fasttext quantize -input train.txt -output lid16-model -minCount 1000 -bucket 1000000 -minn 2 -maxn 5 -lr 0.8 -dim 256 -epoch 2 -thread 68 -wordNgrams 1 -qnorm -cutoff 50000 -retrain

# --- Custom nano params ---

# Train the model (91.4MB lid16-model-lean.vec, 1.06GB lid16-model-lean.bin)
fasttext supervised -input train.txt -output lid16-model-lean -minCount 1000 -bucket 50000 -minn 2 -maxn 5 -lr 0.8 -dim 128 -epoch 12 -thread 68 -wordNgrams 1

  # shrink it
fasttext quantize \
  -input train.txt -output lid16-model-lean \
  -qnorm -retrain \
  -cutoff 12000   \    # keep top 12k n-grams (~100 kB codes)
  -dsub 2              # default, just being explicit


# Sanity check
# for arb_Arab dan_Latn nld_Latn eng_Latn fin_Latn fra_Latn deu_Latn hun_Latn ita_Latn nob_Latn por_Latn ron_Latn rus_Cyrl spa_Latn swe_Latn tur_Latn

echo "Guten Morgen!" | fasttext predict-prob lid16.ftz - # deu_Latn Deutsch
echo "Good morning!" | fasttext predict-prob lid16.ftz - # eng_Latn English
echo "God morgon!" | fasttext predict-prob lid16.ftz - # swe_Latn Svenska
echo "Buongiorno!" | fasttext predict-prob lid16.ftz - # ita_Latn Italiano
echo "Bom dia!" | fasttext predict-prob lid16.ftz - # por_Latn Português
echo "Bonjour!" | fasttext predict-prob lid16.ftz - # fra_Latn Français
echo "Добро утро!" | fasttext predict-prob lid16.ftz - # rus_Cyrl Русский
echo "صباح الخير!" | fasttext predict-prob lid16.ftz - # arb_Arab العربية
echo "Goedemorgen!" | fasttext predict-prob lid16.ftz - # nld_Latn Nederlands
echo "Hyvää huomenta!" | fasttext predict-prob lid16.ftz - # fin_Latn Suomi
echo "Jó reggelt!" | fasttext predict-prob lid16.ftz - # hun_Latn Magyar
echo "God morgen!" | fasttext predict-prob lid16.ftz - # nob_Latn Norsk
echo "Bună dimineața!" | fasttext predict-prob lid16.ftz - # ron_Latn Română
echo "Buenos días!" | fasttext predict-prob lid16.ftz - # spa_Latn Español
echo "Günaydın!" | fasttext predict-prob lid16.ftz - # tur_Latn Türkçe