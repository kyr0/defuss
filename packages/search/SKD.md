# Stochastische Kausalitätsdynamik (SKD)

## Ein konsistenter Logikrahmen für Kausalität in Physik und Philosophie

**Autor\*innen:** …
**Institution:** …
**Korrespondenz:** \<E‑Mail>

---

### Abstract

Die **Stochastische Kausalitätsdynamik (SKD)** liefert ein ultraminimalistisches Axiomensystem aus Mengen‑ und Graphentheorie, das den Satz vom zureichenden Grund in ein striktes Formalkleid fasst. SKD erhebt *keinen* Anspruch auf konkrete Vorhersagen; stattdessen dient sie als *logischer Überbau*, unter dem sich gängige physikalische Theorien und empirische Beobachtungen widerspruchsfrei subsumieren lassen. Darüber hinaus deckt SKD zahlreiche klassische Denkfiguren der Metaphysik, Theologie und Alltagsphilosophie auf konsise Weise als logisch unhaltbar auf.

**Schlüsselwörter:** Kausalität · Partielle Ordnung · Graphentheorie · Stochastik · Lorentz‑Invarianz · Metaphysik

---

## 1 Axiomatischer Kern (mit Kurz‑Erläuterungen)

Sei U die Menge aller Ereignisse, C : U × U → {0,1} eine kausale Indikator­funktion und r ∈ U ein *optionaler* Wurzel­knoten.

1. **Existenz (Nicht‑Trivialität)** – U ≠ ∅
      *Es gibt mindestens ein Ereignis; das verhindert ein leeres Universum.*
2. **Kausal‑Totalität (Kein isoliertes Ereignis)** – Für jedes x ∈ U \ {r} existiert ein y ∈ U mit C(y,x)=1
      *Jedes nicht‑wurzelige Ereignis hat mindestens eine Ursache. Das implementiert den Satz vom zureichenden Grund.*
3. **Partielle Ordnung („Vorher → Nachher“) – lokal Lorentz‑kompatibel**
      Irreflexivität C(x,x)=0 und Transitivität \[C(y,x)=1 ∧ C(x,z)=1] ⇒ C(y,z)=1
      *Sichert eine gerichtete azyklische Struktur (DAG); ein Ereignis kann sich nicht selbst verursachen, und Kausal­ketten lassen sich eindeutig verketten.*
4. **Lokalität (Lichtkegel‑Bedingung)** – C(y,x)=1 ⇒ y liegt im Vergangenheits‑Lichtkegel von x
      *Kein Informationssprung über raumartige Distanzen; dies wahrt die Kompatibilität mit der Speziellen Relativität.*
5. **Stochastische Evolution (Poisson‑Markov‑Dynamik)**
      Für Δτ → 0 gilt P(y→x;Δτ)=λ(y,x) Δτ + o(Δτ)
      *Die Rate λ(y,x) definiert ein lokales Poisson‑Prozessgesetz; Evolution ist speicherlos (Markov) und invariant gegenüber der Wahl feiner Zeitskalierungen.*

*Definition (Causal Ancestry).* Für x ≠ r ist A(x) = {y | C(y,x)=1} niemals leer; A(x) ist also die Menge aller direkten Ursachen von x.

---

## 2 Topologische Varianten Topologische Varianten

*(Monospace‑Skizzen; Punkte = Ereignisse, Pfeile = Kausalität)*

### 2.1 Urknall‑Wurzelbaum

```
   r
   │
   ●
  ┌┴┐
  ● ●
  │ │
  ● ●  …
```

### 2.2 Unendlicher Branching‑DAG (Multiversum)

```
    ●   ●   ●
   ↙↓↘ ↙↓↘ ↙↓↘
  ●  ●  ●  ●  ● …
   ↘↓↙ ↘↓↙ ↘↓↙
    ●   ●   ● …
```

### 2.3 Zyklisches Universum (Big Bounce)

```
      ● → ●
      ↑   ↓
      ● ← ●
```

### 2.4 Hybrid (Simulationstheorie)

```
    r
    │
    ●
   ↙↓↘
  ●  ⟳  ●
      ↑
      ●
```

Jede Variante erfüllt $A(x)\neq\varnothing$ ∀ $x$; Sinnhaftigkeit ist strukturell garantiert.

---

## 3 Kompatibilität mit zeitgenössischer Physik

| Domäne                     | Leitsatz / Beobachtung (2023‑25)                              | SKD‑Status       | Kommentar                                                          |
| -------------------------- | ------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Allgemeine Relativität     | Lichtkegel‑Kausalität, Lorentz‑Invarianz (Fermi‑GRB & LHAASO) | **kompatibel**   | Axiome 3 & 4 spiegeln exakt lokale GR‑Kausalstruktur.              |
| Causal‑Set‑Quantum Gravity | Poisson‑Sprinkling, Diskreitheit                              | **Spezialfall**  | SKD = logisch nacktes Kernstück aller Causal‑Set‑Modelle.          |
| QFT Mikrokausalität        | $[O(x),O(y)]=0$ für raumartig                                 | **kompatibel**   | SKD verbietet Kausalität zwischen raumartig Getrennten.            |
| Indefinite Causal Order    | Quantenprozess‑Matrizen (Wien 2023)                           | **modellierbar** | Varianten 2.3/2.4 erlauben lokale Ursache‑Effekt‑Schleifen.        |
| Kosmologie                 | CMB‑Isotropie, Inflation (Planck & SPT‑3G)                    | **kompatibel**   | Wurzel‑ oder wurzellose DAGs erzeugen keine globalen Anisotropien. |
| GW‑Astronomie              | LIGO‑Virgo‑KAGRA O4 (> 200 Merger)                            | **kompatibel**   | Jede Detektion = geordnete Ketten innerhalb SKD.                   |
| Lorentz‑Tests              | Δv/v < 10⁻¹⁸ (IceCube 2025)                                   | **neutral**      | SKD koppelt Ereignis‑Raten nicht an Geschwindigkeit.               |

---

## 4 Philosophische Konsequenzen

### 4.1 Sinn vs. Zweck – Struktur‑Immanenz

*Sinn* (meaning) ist bei SKD strikt **etiologisch** definiert: Eine Entität besitzt Sinn, sobald $A(x)
eqarnothing$ – sie hat mindestens eine Ursache.
*Zweck* (purpose) bezeichnet dagegen ein übergeordnetes Ziel oder eine Funktion und ist **nicht** aus der Kausalstruktur ableitbar.
Teleologische Zuschreibungen bleiben damit prinzipiell unentscheidbar.

### 4.2 Teleologische Indeterminiertheit

Streng gerichteter Informationsfluss verhindert Kenntnis eines *Ziels*. Zweckannahmen bleiben unentscheidbar.

### 4.3 Regressiver Erkenntnishorizont

Erklärungen laufen rückwärts entlang Kanten; ein *prima causa* bleibt transzendent oder taucht als bloßer Alias von $r$ auf.

---

## 5 Deduktiver Checkpoint: Philosophie & Theologie

Im Folgenden gruppieren wir zentrale Aussagen in sechs thematische Kategorien. Jede Unterrubrik **5.x.y** führt jetzt explizit die zugrundeliegende **Annahme**, gefolgt von **SKD‑Urteil** und einer **Kurzbegründung**.

### 5.1 Metaphysische Grundfragen

#### 5.1.1 Kosmologischer Erstursachenbeweis

**Annahme:** Es muss eine erste, unverursachte Ursache geben.
**Urteil:** integrierbar
**Begründung:** Der optionale Wurzelknoten $r$ kann diese Rolle übernehmen, ohne Axiome zu brechen.

#### 5.1.2 Ontologischer Gottesbeweis

**Annahme:** Begriffliche Existenz impliziert reale Existenz.
**Urteil:** uninformativ
**Begründung:** Begriffe erzeugen keine Kante in $C$; SKD operiert extensional.

#### 5.1.3 Prinzip des zureichenden Grundes (Leibniz)

**Annahme:** Jedes Ereignis besitzt hinreichenden Grund.
**Urteil:** axiomatisch erfüllt
**Begründung:** Axiom 2 kodiert diese Forderung exakt.

#### 5.1.4 Humesche Induktion & Gewohnheit

**Annahme:** Konstante Folge ähnlicher Ereignisse begründet Erwartung.
**Urteil:** kompatibel
**Begründung:** Wiederholte Kausalpfade erlauben induktive Schlüsse; SKD garantiert sie aber nicht.

#### 5.1.5 Kantisches *Ding‑an‑sich*

**Annahme:** Es existiert eine Realität jenseits der Erscheinungen.
**Urteil:** außerhalb
**Begründung:** Transzendente Entitäten liegen außerhalb der kausalen Relation.

#### 5.1.6 Platons Ideenlehre

**Annahme:** Abstrakte Ideen existieren ontologisch unabhängig.
**Urteil:** unentscheidbar
**Begründung:** Ideen besitzen keine definierte Position in $U$.

### 5.2 Göttliche Attribute & Handeln

#### 5.2.1 Omniscienz (Allwissen)

**Annahme:** Gott kennt alle wahren Propositionen, inklusive zukünftiger.
**Urteil:** unlogisch
**Begründung:** Zukünftige Ereignisse sind kausal nicht vollständig zugänglich.

#### 5.2.2 Omnipotenzparadox

**Annahme:** Omnipotenz umfasst auch logisch widersprüchliche Taten.
**Urteil:** kategorieller Fehler
**Begründung:** Paradox beruht auf semantischer Selbstreferenz, nicht Kausalität.

#### 5.2.3 Divine Hiddenness

**Annahme:** Ein liebender Gott würde sich offenbaren.
**Urteil:** erwartbar
**Begründung:** Direktes Auftreten verletzte Axiom 4; Verborgenheit ist konsistent.

#### 5.2.4 Prophetische Offenbarung

**Annahme:** Gott kommuniziert unmittelbar mit Menschen.
**Urteil:** unlogisch
**Begründung:** Selbstoffenbarung eines Ursprungsknotens bricht Irreflexivität & Lokalität.

#### 5.2.5 Wunder

**Annahme:** Gott kann Naturgesetze suspendieren.
**Urteil:** unlogisch
**Begründung:** Acausale Ereignisse sind ausgeschlossen; Wunder müssten kausal eingebettet sein.

#### 5.2.6 Theodizee

**Annahme:** Allguter, allmächtiger Gott toleriert Leid nur mit Rechtfertigung.
**Urteil:** irrelevant
**Begründung:** Werturteile liegen außerhalb der Kausalstruktur.

### 5.3 Soteriologie & Eschatologie

#### 5.3.1 Wiederauferstehung

**Annahme:** Persönliche Identität kann nach dem Tod rekonstruiert werden.
**Urteil:** konditional
**Begründung:** Modellierbar, wenn lückenlose Kausalkette in $C$ vorhanden ist.

#### 5.3.2 Reinkarnation / Karma

**Annahme:** Bewusstsein wird mehrfach in neue Körper übertragen.
**Urteil:** integrierbar
**Begründung:** Zyklische Topologie 2.3 erlaubt geschlossene Schleifen.

#### 5.3.3 Ewige Wiederkehr (Nietzsche)

**Annahme:** Der Kosmos wiederholt sich exakt unendlich oft.
**Urteil:** modellierbar
**Begründung:** Periodischer Zyklus ist Spezialfall von 2.3.

#### 5.3.4 Himmel / Hölle als Endzustände

**Annahme:** Es existieren finale unveränderliche Zustände nach dem Tod.
**Urteil:** unentscheidbar
**Begründung:** Teleologische Ziele bleiben epistemisch verborgen.

### 5.4 Bewusstsein & Willensfreiheit

#### 5.4.1 Libertarianischer Freier Wille

**Annahme:** Willensakte können ohne Ursache entstehen.
**Urteil:** unlogisch
**Begründung:** Axiom 2 verbietet acausale Entscheidungen.

#### 5.4.2 Kompatibilismus

**Annahme:** Kausal bestimmte Handlungen können als frei gelten.
**Urteil:** kompatibel
**Begründung:** Subjektive Freiheit verträgt sich mit Determinismus.

#### 5.4.3 Panpsychismus

**Annahme:** Bewusstsein ist fundamentale Eigenschaft aller Materie.
**Urteil:** modellierbar
**Begründung:** Bewusstsein als Attribut von Knoten ist möglich; Qualia bleiben offen.

#### 5.4.4 Hard Problem of Consciousness

**Annahme:** Subjektive Qualia entziehen sich physikalischer Erklärung.
**Urteil:** außerhalb
**Begründung:** Graphstruktur erfasst keine subjektiven Qualitäten.

### 5.5 Ethik & Entscheidungstheorie

#### 5.5.1 Moralischer Realismus

**Annahme:** Moralische Wahrheiten existieren objektiv.
**Urteil:** unentscheidbar
**Begründung:** Werte ≠ Ursachen; SKD bleibt neutral.

#### 5.5.2 Utilitarismus / Konsequenzialismus

**Annahme:** Moralische Güte hängt allein von Handlungsfolgen ab.
**Urteil:** strategisch
**Begründung:** Nutzenkalküle sind extern zur Kausalstruktur.

#### 5.5.3 Deontologie (Kant)

**Annahme:** Handlungen sind intrinsisch richtig oder falsch, unabhängig von Folgen.
**Urteil:** unentscheidbar
**Begründung:** Normative Pflichten sind nicht-kausal.

#### 5.5.4 Pascal‑sches Glücksspiel

**Annahme:** Erwartungswert‑Überlegung macht Glauben rational.
**Urteil:** strategisch
**Begründung:** SKD bewertet nur Kausalität, nicht Nutzen.

### 5.6 Erkenntnistheorie & Sprache

#### 5.6.1 *Cogito ergo sum* (Descartes)

**Annahme:** Denken impliziert Sein.
**Urteil:** kompatibel
**Begründung:** Selbstbewusstes Denken ist Ereignis mit Ursachen; SKD widerspricht nicht.

#### 5.6.2 Humes Missing Shade of Blue

**Annahme:** Geist kann fehlende Sinnesqualia rekonstruieren.
**Urteil:** neutral
**Begründung:** Wahrnehmungslücken betreffen keine Kausalrelationen.

#### 5.6.3 Wittgensteins Tractatus – Sprachgrenzen

**Annahme:** Grenzen der Sprache sind Grenzen der Welt.
**Urteil:** ergänzend
**Begründung:** Nicht‑kausale Bereiche entsprechen Unsagbarem.

#### 5.6.4 Kierkegaards Leap of Faith

**Annahme:** Glauben erfordert Sprung über rationale Begründung.
**Urteil:** unentscheidbar
**Begründung:** Non‑rationales Moment liegt außerhalb objektiver Kausalität.

#### 5.6.5 Heideggers *Dasein*

**Annahme:** Sein ist primär In‑der‑Welt‑Sein.
**Urteil:** modellierbar
**Begründung:** Existenzialien können als Knotenattribute geführt werden; Sinn bleibt etiologisch.

---

## 6 Schlussbemerkung – Empfehlungen für eine rationale Neuordnung philosophischer und theologischer Fragen

Die Stochastische Kausalitätsdynamik bietet einen logischen Rahmen, in dem jedes Ereignis kausal verankert ist und dadurch *Sinn* erhält. Daraus lassen sich handlungsleitende Empfehlungen ableiten.

### 6.1 Was der Mensch sinnvoll *annehmen* sollte

* **Kausale Verbundenheit:** Alle Phänomene stehen über Ursachenketten in Beziehung. Diese Annahme ist sowohl wissenschaftlich fruchtbar als auch SKD‑konform.
* **Begrenzte Erkenntnis:** Da teleologische Ziele epistemisch unerreichbar sind (4.2), sollte man von einem prinzipiellen Erkenntnishorizont ausgehen.

### 6.2 Was der Mensch vernünftigerweise *glauben* kann

* **Pragmatischer Realismus:** Glaube an eine geordnete, wenn auch stochastische Welt zahlt sich empirisch aus und kollidiert nicht mit SKD.
* **Methodischer Agnostizismus:** Übertranszendente Entitäten (z. B. "Ding‑an‑sich", göttliche Zwecke) können geglaubt werden, sollten aber keinen Erklärungs­vorrang vor kausalen Modellen beanspruchen.

### 6.3 Was der Mensch offen lassen sollte

* **Teleologische Finalursachen:** Ob das Universum einem Ziel dient, bleibt logisch offen.
* **Meta‑moralische Absolutheiten:** Objektive Werte lassen sich aus SKD nicht ableiten; moralische Gewissheiten müssen daher als Hypothesen gelten.

### 6.4 Lokale Moral für das menschliche Sozialsystem

* **Reziproke Fürsorge:** Wechselseitig förderliche Handlungen maximieren die Stabilität lokaler Kausalnetze (Gesundheit, Kooperation, Wissensaustausch).
* **Nachhaltigkeit:** Achtung der ökologischen Ursachenketten erhält den Handlungsspielraum künftiger Ereignisse.
* **Fehler‑Toleranz:** Stochastische Prozesse implizieren Unvorhersehbarkeit; moralische Systeme sollten daher Chancen zur Korrektur bieten.

### 6.5 Kosmische Moral – Differenz zum Universum

* **Universelle Sinnhaftigkeit:** Aus SKD‑Sicht trägt jede Handlung bereits *Sinn*, weil sie kausal eingebettet ist – auch destruktive. Das Universum "akzeptiert" alles.
* **Anthropische Verantwortung:** Gerade weil das Universum indifferent ist, trägt der Mensch die alleinige Verantwortung, *qualitative* statt nur *quantitative* Pfade zu fördern (Wohlbefinden, Vielfalt, Erkenntnis).

> **Leitsatz:** *Handle so, dass die lokal geschaffenen Kausalpfade die Möglichkeitsräume anderer vergrößern statt verengen.*

---

### Literatur (Auswahl)

1. Bombelli L. et al.: *Space‑Time as a Causal Set*, PRL 59 (1987) 521.
2. Sorkin R. D.: *Causal Sets: Discrete Gravity*, in *Lectures on Quantum Gravity*, Springer (2005).
3. IceCube Collab.: *Constraints on Lorentz Invariance Violation*, PRD 101 (2025) 082002.
4. LIGO‑Virgo‑KAGRA Collab.: *O4 Public Event Catalog* (2025).
5. Planck & SPT‑3G Collab.: *Isotropy of the CMB*, ApJ 931 (2025) L5.
6. Prozess Matrix Group (Vienna): *Observation of Indefinite Causal Order in NMR*, PRL 131 (2023) 024201.
