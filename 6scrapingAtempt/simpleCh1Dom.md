# Simplified dom
```html
<!-- SECTION 2 -->
<a name="S2"></a>
<h3>SECTION 2</h3>
<h4>THE TWO-FOLD CHARACTER OF THE LABOUR EMBODIED IN COMMODITIES</h4>

<p> ... </p>
<p> ... </p>
<p> ... </p>
<!-- πολλά <p> εδώ με το περιεχόμενο του Section 2 -->

<a name="S3"></a>
<h3>SECTION 3</h3>
<h4>THE FORM OF VALUE OR EXCHANGE VALUE</h4>

<p> ... </p>
<p> ... </p>

<!-- Εδώ ξεκινά η υποενότητα A -->
<a name="S3a"></a>
<h5>A. Elementary or Accidental Form Of Value</h5>

<p> ... </p>
<p> ... </p>

<!-- Κάτω από αυτή την A υπάρχουν μικρότερες ενότητες -->
<a name="S3a1"></a>
<h6>1. The Two Poles of the Expression of Value</h6>

<p> ... </p>
<p> ... </p>
<!-- και ούτω καθεξής -->

```

# more full simplified dom
```html 
<!DOCTYPE html>
<html>
  <head>
    <title>Capital Vol. I – Chapter One</title>
  </head>

  <body>
    <!-- ===== TITLE + INDEX ===== -->
    <p>Title: Karl Marx. Capital Volume One</p>

    <h4>Part I: Commodities and Money</h4>
    <h3>Chapter One: Commodities</h3>

    <p class="index">Contents</p>

    <p class="index">
      Section 1 - <a href="#S1">The Two Factors of a Commodity</a><br>
      Section 2 - <a href="#S2">The Two-fold Character of Labour</a><br>
      Section 3 - <a href="#S3">The Form of Value</a><br>
      Section 4 - <a href="#S4">The Fetishism of Commodities</a>
    </p>

    <p class="index">
      A. <a href="#S3a">Elementary or Accidental Form of Value</a><br>
      B. <a href="#S3b">Total or Expanded Form of Value</a><br>
      C. <a href="#S3c">The General Form of Value</a><br>
      D. <a href="#S3d">The Money-Form</a>
    </p>

    <!-- ===== MAIN CONTENT ===== -->

    <a name="S1"></a>
    <h3>SECTION 1</h3>
    <h4>The Two Factors of a Commodity</h4>

    <p>Normal paragraph</p>
    <p>Paragraph with footnote <sup>[1]</sup></p>
    <p class="quote">Quoted paragraph</p>

    <p class="equation">x commodity A = y commodity B<br>x commodity A is worth y commodity B</p>
    <p class="equation">20 yards of linen = 1 coat<br>20 yards of linen are worth 1 coat</p>

    <table>
      <tr><td>1</td><td>coat</td></tr>
      <tr><td>10</td><td>lbs of tea</td></tr>
      <tr><td>40</td><td>lbs of coffee</td></tr>
      <tr><td>1</td><td>quarter of corn</td></tr>
      <tr><td>2</td><td>ounces of gold</td></tr>
      <tr><td>½</td><td>a ton of iron</td></tr>
      <tr><td>x</td><td>Commodity A, etc.</td></tr>
    </table>

    <!-- nested sections -->
    <a name="S2"></a>
    <h3>SECTION 2</h3>
    <h4>The Two-fold Character of Labour</h4>
    <p>...</p>

    <a name="S3"></a>
    <h3>SECTION 3</h3>
    <h4>The Form of Value</h4>
    <p>...</p>

    <a name="S3a"></a>
    <h5>A. Elementary or Accidental Form of Value</h5>
    <p>...</p>

    <a name="S3a1"></a>
    <h6>1. The Two Poles of the Expression of Value</h6>
    <p>...</p>

    <!-- ===== FOOTNOTES ===== -->
    <h4>Footnotes</h4>
    <p class="note">[1] Karl Marx, Zur Kritik der Politischen Oekonomie. Berlin, 1859.</p>
    <p class="note">[2] Another note...</p>

    <!-- ===== CREDITS ===== -->
    <p class="credits">
      Transcribed by Bert Schultz (1993)<br>
      Html Markup by Brian Baggins & Andy Blunden (1999)<br>
      Proofed and Corrected by Andy Blunden (2005)
    </p>

    <!-- ===== NAVIGATION FOOTER ===== -->
    <p class="footer">
      <a href="commodity.htm">Previous</a> |
      <a href="ch02.htm">Next</a> |
      <a href="index.htm">Index</a>
    </p>
  </body>
</html>

```

# notes
| Area                                            | What it is                     | How to handle                                         |
| ----------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| **Index (`.index`)**                            | Table of contents links at top | Optional: collect link → target (`href="#Sx"`)        |
| **Anchors `<a name="Sx">`**                     | Section IDs                    | Use to structure hierarchy (`S3a1` child of `S3a`)    |
| **Headings `<h3–h6>`**                          | Titles                         | Capture text right after anchor                       |
| **`<p>`**                                       | Normal text                    | Extract text, strip `<sup>` if needed                 |
| **`<p class="quote">`**                         | Quotation                      | Mark as `"quote"`                                     |
| **`<p class="equation">`**                      | Equation/table-like lines      | Merge consecutive ones; replace `<br>` with `\n`      |
| **`<table>`**                                   | Real table                     | Extract rows `[["1","coat"], ...]`                    |
| **`<h4>Footnotes</h4>` → `<p class="note">`**   | Footnotes                      | Stop main text scraping; optionally collect footnotes |
| **`<p class="credits">`, `<p class="footer">`** | Metadata / nav                 | Ignore                                                |
