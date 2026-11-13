// Class 10 Mathematics, SEBA, Assamese medium (NCERT-based). Question ids start with m10c<chapter>- so they never clash with other courses.
// Question text is in Assamese. `context` on a chapter is hidden from students and only sent to the AI (notes and answer keys, in English).
// Chapter no 0 is the Revision section at the start of the book (R-1 to R-5); the app shows it with an R badge.
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
// Chapter list and Chapter 1 sections follow the textbook contents page (14 chapters; 1.2 Fundamental Theorem of Arithmetic, 1.3 Revisiting irrational numbers).
// NOTE: Chapter 1 question wording was written from the standard NCERT exercises; check it against textbook pages 13-27.
const Q = (id, no, text, extra = {}) => ({ id, no, text, ...extra });
const sec = (title, video, qs) => ({ title, questions: qs.map(q => ({ video, ...q })) });
const locked = (no, title) => ({ no, title, locked: true });

module.exports = {
  id: 'c10-maths',
  subject: 'Mathematics',
  class: 10,
  medium: 'Assamese',
  sourceLang: 'Assamese',   // answers are Assamese: the translate menu offers English / Hinglish / Bengali
  chapters: [
    {
      no: 0, title: 'পুনৰালোচনা (Revision)', kind: 'Revision',
      context: `Chapter notes (Revision section at the start of the SEBA Class 10 Maths book: squares and square roots, cubes and cube roots, indices and powers, factorisation, congruence of triangles).
Squares: a perfect square ends in 0, 1, 4, 5, 6 or 9 only (never 2, 3, 7, 8) and can end only in an even number of zeros. Between n^2 and (n+1)^2 there are 2n natural numbers. Square root by prime factorisation: pair equal prime factors and take one from each pair. To make a number a perfect square multiply by the smallest number that completes the unpaired primes, or divide by the product of the unpaired primes. The square root of a decimal: remove the decimal point, take the root, then place the point (digits after it halve). sqrt(2025) = 45 gives sqrt(20.25) = 4.5.
Cubes: a number is a perfect cube when every prime in its factorisation appears a multiple of 3 times. To make a perfect cube multiply by the smallest number that brings each prime power up to a multiple of 3, or divide by the primes whose power is above the multiple of 3. The unit digit of a cube follows the unit digit of the number (3 gives 7, 7 gives 3, 2 gives 8, 8 gives 2, 4 gives 4, 9 gives 9).
Indices: a^m x a^n = a^(m+n); a^m / a^n = a^(m-n); (a^m)^n = a^(mn); a^m x b^m = (ab)^m; a^m / b^m = (a/b)^m; a^0 = 1; a^(-1) = 1/a; (a/b)^(-1) = b/a; (-1)^n = 1 for even n and -1 for odd n. Standard form: K x 10^m with 1 <= K < 10 and m an integer.
Factorisation: take out the common factor; group terms; use identities a^2 + 2ab + b^2 = (a+b)^2, a^2 - 2ab + b^2 = (a-b)^2, a^2 - b^2 = (a+b)(a-b), x^2 + (a+b)x + ab = (x+a)(x+b) (find two numbers whose product is the constant term and whose sum is the coefficient of x). For ax^2 + bx + c split the middle term using two numbers whose product is ac and sum is b.
Congruence of triangles: valid rules are SSS, SAS (two sides and the included angle), ASA (two angles and the included side), AAS (two angles and a non-included side) and RHS (right angle, hypotenuse and one side). AAA and SSA (ASS) do not prove congruence. Congruent triangles have equal corresponding sides and angles (CPCT), the same shape and the same size; the symbol for congruent is the sign with an equals bar. To pick the rule, check whether the given equal angles enclose the given equal side (ASA) or not (AAS).
Answer key (verified). R-1: Q1 units digit of the square: 272 gives 4, 79 gives 1, 400 gives 0, 2637 gives 9. Q2 reason not a perfect square: 1057 ends in 7, 7928 ends in 8, 222 ends in 2 (squares never end in 2, 3, 7, 8), 640 ends in a single zero (a square has an even number of end zeros). Q3 squares: 361, 1369, 2809, 6084. Q4 square roots: 42, 96, 88, 99. Q5 multiply by: 1525 = 5^2 x 61 so 61; 1008 = 2^4 x 3^2 x 7 so 7; 2028 = 2^2 x 3 x 13^2 so 3; 768 = 2^8 x 3 so 3. Q6 divide by: 468 = 2^2 x 3^2 x 13 so 13; 1584 = 2^4 x 3^2 x 11 so 11; 2645 = 5 x 23^2 so 5; 1620 = 2^2 x 3^4 x 5 so 5. Q7 roots: 3.5, 4.9, 12.1, 10.1. Q8 (a) (ii) 169 = 13^2 (b) (i) 19^2 = 361 (c) (ii) 36 (d) (ii) 572 (e) (ii) 4.5.
R-2: Q1 not perfect cubes: 3757 and 3332 (3375 = 15^3 and 4096 = 16^3 are cubes). Q2 cubes: 6859, 9261, 12167, 19683. Q3 unit digit of the cube: 14 gives 4, 18 gives 2, 13 gives 7, 27 gives 3. Q4 multiply by: 5324 = 2^2 x 11^3 so 2; 3087 = 3^2 x 7^3 so 3; 3125 = 5^5 so 5; 648 = 2^3 x 3^4 so 9. Q5 divide by: 10368 = 2^7 x 3^4 so 6; 2187 = 3^7 so 3; 5000 = 2^3 x 5^4 so 5; 8192 = 2^13 so 2. Q6 cube roots: 11, 12, 13, 14. Q7 (a) (ii) 7 (b) (iii) 343 (c) (iii) 10 (d) (iii) m^3 (e) (iv) 9.
R-3: Q1 1331; 2000; 32; 1/16. Q2 729 = 3^6; 3125 = 5^5; 3600 = 2^4 x 3^2 x 5^2; 108 x 192 = 2^8 x 3^4 (= 20736). Q3 225; 2^16 = 65536; 1; (8/5)^3 = 512/125. Q4 2^8 = 256 is greater than 8^2 = 64; 2.7 x 10^12 is greater than 1.5 x 10^8. Q5 2^(-3) x (-7)^(-3) = 1/(2 x (-7))^3 = 1/(-14)^3 = -1/2744; (-3)^(-4) x (5/3)^(-4) = 1/((-3)^4) x (3/5)^4 = 1/5^4 = 1/625. Q6 3.43 x 10^6; 7.004 x 10^10; 1.5 x 10^(-7); 1.436 x 10^(-5). Q7 1000100000; 0.00000302. Q8 m = 1. Q9 (a) (iii) (b) (iii) (c) (ii) (d) (iv) (e) (ii).
R-4: Q1 HCF: 14pq; 4x; 10; x^2 y^2. Q2 4a^2(1 + 2a); 7xy(x - 3y); abc(a + b + c); a^2(a - b^2). Q3 (x + y)(x + 6); (x + 1)(y + 1); 6x(2x - 1)(2y + 1); (z - 7)(1 - xy). Q4 (2x + 3)^2; (5m + 3)^2; (x - 5)^2; (11b - 4c)^2; (3p + 4q)(3p - 4q); (l+m)^2 - (l-m)^2 = 4lm; (x - 15)(x + 2); (y - 9)(y + 4); (4y - 3)(y + 7); 3x^2 (x^2 - 5y)(x^2 + 3y).
R-5: Q1 (c); Q2 (c) SAS; Q3 (b) SAS; Q4 (b) ASA; Q5 (c); Q6 (a); Q7 (c) ASA (AB lies between angle A and angle B, DE between D and E); Q8 (b) SSS; Q9 (b) congruence; Q10 (d).`,
      sections: [
        sec("অনুশীলনী R-1 (Exercise R-1) · বৰ্গ আৰু বৰ্গমূল", "square and square root class 9 revision", [
          Q("m10c0-r1-1", 1, "তলৰ সংখ্যাকেইটাৰ বৰ্গ সংখ্যাৰ এককৰ স্থান কি হ'ব?", { parts: ["(i) 272", "(ii) 79", "(iii) 400", "(iv) 2637"] }),
          Q("m10c0-r1-2", 2, "তলৰ সংখ্যাকেইটা পূৰ্ণবৰ্গ নোহোৱাৰ কাৰণ কি?", { parts: ["(i) 1057", "(ii) 7928", "(iii) 222", "(iv) 640"] }),
          Q("m10c0-r1-3", 3, "তলৰ সংখ্যাকেইটাৰ বৰ্গ কিমান হ'ব?", { parts: ["(i) 19", "(ii) 37", "(iii) 53", "(iv) 78"] }),
          Q("m10c0-r1-4", 4, "মৌলিক উৎপাদক বিশ্লেষণ পদ্ধতিৰে বৰ্গমূল নিৰ্ণয় কৰা :", { parts: ["(i) 1764", "(ii) 9216", "(iii) 7744", "(iv) 9801"] }),
          Q("m10c0-r1-5", 5, "তলৰ প্ৰতিটো সংখ্যাৰ বাবে আটাইতকৈ সৰু কি সংখ্যাৰে পূৰণ কৰিলে সংখ্যাটো এটা পূৰ্ণবৰ্গ হ'ব?", { parts: ["(i) 1525", "(ii) 1008", "(iii) 2028", "(iv) 768"] }),
          Q("m10c0-r1-6", 6, "তলৰ প্ৰতিটো সংখ্যাৰ বাবে আটাইতকৈ সৰু কি সংখ্যাৰে হৰণ কৰিলে সংখ্যাটো এটা পূৰ্ণবৰ্গ সংখ্যা হ'ব?", { parts: ["(i) 468", "(ii) 1584", "(iii) 2645", "(iv) 1620"] }),
          Q("m10c0-r1-7", 7, "তলৰ দশমিক সংখ্যাবোৰৰ বৰ্গমূল নিৰ্ণয় কৰা।", { parts: ["(i) 12.25", "(ii) 24.01", "(iii) 146.41", "(iv) 102.01"] }),
          Q("m10c0-r1-8", 8, "", { parts: ["(a) তলৰ কোনটো সংখ্যা অযুগ্ম সংখ্যাৰ বৰ্গ?  (i) 256  (ii) 169  (iii) 546  (iv) 754", "(b) তলৰ কোনটোৰ একক স্থানত 1 থাকিব?  (i) 19²  (ii) 34²  (iii) 18²  (iv) 20²", "(c) 18² আৰু 19² ৰ মাজত কেইটা স্বাভাৱিক সংখ্যা আছে?  (i) 38  (ii) 36  (iii) 42  (iv) 40", "(d) তলৰ কোনটো বৰ্গ সংখ্যা নহয়?  (i) 441  (ii) 572  (iii) 576  (iv) 729", "(e) √2025 = 45 হ'লে √20.25 হ'ব  (i) 45  (ii) 4.5  (iii) 0.45  (iv) 0.045"] })
        ]),
        sec("অনুশীলনী R-2 (Exercise R-2) · ঘন আৰু ঘনমূল", "cube and cube root class 9 revision", [
          Q("m10c0-r2-1", 1, "তলৰ কোনবোৰ সংখ্যা পূৰ্ণঘন নহয়?", { parts: ["(i) 3757", "(ii) 3375", "(iii) 3332", "(iv) 4096"] }),
          Q("m10c0-r2-2", 2, "তলৰ সংখ্যাকেইটাৰ ঘনফল নিৰ্ণয় কৰা।", { parts: ["(i) 19", "(ii) 21", "(iii) 23", "(iv) 27"] }),
          Q("m10c0-r2-3", 3, "তলৰ প্ৰতিটো সংখ্যাৰ ঘনৰ একক স্থানৰ অংক কি হ'ব?", { parts: ["(i) 14", "(ii) 18", "(iii) 13", "(iv) 27"] }),
          Q("m10c0-r2-4", 4, "তলৰ সংখ্যাবোৰ পূৰ্ণঘন হ'বলৈ আটাইতকৈ সৰু কি সংখ্যাৰে পূৰণ কৰিব লাগিব?", { parts: ["(i) 5324", "(ii) 3087", "(iii) 3125", "(iv) 648"] }),
          Q("m10c0-r2-5", 5, "এটা পূৰ্ণঘন পাবলৈ আটাইতকৈ সৰু কি সংখ্যাৰে তলৰ সংখ্যাকেইটাক হৰণ কৰিব লাগিব?", { parts: ["(i) 10,368", "(ii) 2187", "(iii) 5000", "(iv) 8192"] }),
          Q("m10c0-r2-6", 6, "নিম্নলিখিত সংখ্যাকেইটাৰ ঘনমূল উলিওৱা।", { parts: ["(i) 1331", "(ii) 1728", "(iii) 2197", "(iv) 2744"] }),
          Q("m10c0-r2-7", 7, "প্ৰতিটো প্ৰশ্নৰ কাৰণে চাৰিটাকৈ উত্তৰ দিয়া আছে। শুদ্ধ উত্তৰটো লিখা।", { parts: ["(a) 23 ৰ ঘনৰ একক স্থানৰ অংকটো হ'ল—  (i) 6  (ii) 7  (iii) 8  (iv) 9", "(b) তলৰ কোনটো পূৰ্ণ ঘন?  (i) 652  (ii) 933  (iii) 343  (iv) 1002", "(c) ∛1000 ৰ মান  (i) 30  (ii) 100  (iii) 10  (iv) 1000", "(d) যদি m, n ৰ ঘনমূল হয় তেন্তে n ৰ মান হ'ব  (i) √m  (ii) ∛m  (iii) m³  (iv) m²", "(e) ∛8 + ∛27 + ∛64 ৰ মান হ'ব  (i) 6  (ii) 7  (iii) 8  (iv) 9"] })
        ]),
        sec("অনুশীলনী R-3 (Exercise R-3) · সূচক আৰু ঘাত", "laws of exponents standard form class 9 revision", [
          Q("m10c0-r3-1", 1, "মান নিৰ্ণয় কৰা", { parts: ["(i) 11³", "(ii) 2 × 10³", "(iii) (1/2)⁻⁵", "(iv) (-4)⁻²"] }),
          Q("m10c0-r3-2", 2, "তলৰ প্ৰতিটো সংখ্যাক সিহঁতৰ মৌলিক উৎপাদকৰ ঘাতৰ পূৰণৰূপে প্ৰকাশ কৰা", { parts: ["(i) 729", "(ii) 3125", "(iii) 3600", "(iv) 108 × 192"] }),
          Q("m10c0-r3-3", 3, "সৰল কৰা :", { parts: ["(i) (-3)² × (-5)²", "(ii) (2³ × 2)⁴", "(iii) 2⁰ × 3⁰ × 4⁰", "(iv) (5/8)⁻⁷ × (8/5)⁻⁴"] }),
          Q("m10c0-r3-4", 4, "তলৰ সংখ্যাবোৰৰ তুলনা কৰা", { parts: ["(i) 2⁸, 8²", "(ii) 2.7 × 10¹², 1.5 × 10⁸"] }),
          Q("m10c0-r3-5", 5, "তলৰ ফলাফলবোৰ ধনাত্মক সূচকেৰে প্ৰকাশ কৰা।", { parts: ["(i) 2⁻³ × (-7)⁻³", "(ii) (-3)⁻⁴ × (5/3)⁻⁴"] }),
          Q("m10c0-r3-6", 6, "তলৰ সংখ্যাবোৰ প্ৰামাণিক ৰূপত প্ৰকাশ কৰা।", { parts: ["(i) 3430,000", "(ii) 70,040,000,000", "(iii) 0.00000015", "(iv) 0.00001436"] }),
          Q("m10c0-r3-7", 7, "তলৰ সংখ্যাবোৰ সাধাৰণ ৰূপত প্ৰকাশ কৰা।", { parts: ["(i) 1.0001 × 10⁹", "(ii) 3.02 × 10⁻⁶"] }),
          Q("m10c0-r3-8", 8, "m নিৰ্ণয় কৰা যাতে (-3)^(m+1) × (-3)⁵ = (-3)⁷ হয়"),
          Q("m10c0-r3-9", 9, "তলৰ প্ৰতিটো প্ৰশ্নৰ কাৰণে চাৰিটা উত্তৰ লিখা আছে। শুদ্ধ উত্তৰটো লিখা।", { parts: ["(a) 3⁻³ ৰ মান হ'ব।  (i) 3³  (ii) 3^(1/3)  (iii) 1/(3³)  (iv) 3 × 3", "(b) (2/3)² ৰ মান হ'ব।  (i) 1/(2 × 3)²  (ii) (2 × 3)⁻²  (iii) (3/2)⁻²  (iv) (3/2)^(1/2)", "(c) (-2/3)⁴ ৰ মান হ'ব।  (i) 8/12  (ii) 16/81  (iii) -16/81  (iv) -8/12", "(d) 0.000064 ৰ প্ৰামাণিক ৰূপটো হ'ল।  (i) 64 × 10⁴  (ii) 64 × 10⁻⁴  (iii) 6.4 × 10⁵  (iv) 6.4 × 10⁻⁵", "(e) 2.03 × 10⁻⁵ ৰ মানটো হ'ব।  (i) 0.203  (ii) 0.0000203  (iii) 203000  (iv) 0.00203"] })
        ]),
        sec("অনুশীলনী R-4 (Exercise R-4) · উৎপাদক বিশ্লেষণ", "factorisation algebraic expressions class 9 revision", [
          Q("m10c0-r4-1", 1, "সাধাৰণ উৎপাদক উলিওৱা", { parts: ["(i) 14pq, 28p²q²", "(ii) 16x³, -4x², 32x", "(iii) 20pq, 30qr, 40rp", "(iv) 3x²y³, 10x³y², 6x²y²z"] }),
          Q("m10c0-r4-2", 2, "উৎপাদক বিশ্লেষণ কৰা", { parts: ["(i) 4a² + 8a³", "(ii) 7x²y - 21xy²", "(iii) a²bc + ab²c + abc²", "(iv) a³ - a²b²"] }),
          Q("m10c0-r4-3", 3, "উৎপাদক বিশ্লেষণ কৰা", { parts: ["(i) x² + xy + 6x + 6y", "(ii) xy + x + y + 1", "(iii) 24x²y + 12x² - 12xy - 6x", "(iv) z - 7 + 7xy - xyz"] }),
          Q("m10c0-r4-4", 4, "উৎপাদকত প্ৰকাশ কৰা :", { parts: ["(i) 4x² + 12x + 9", "(ii) 25m² + 30m + 9", "(iii) x² - 10x + 25", "(iv) 121b² - 88bc + 16c²", "(v) 9p² - 16q²", "(vi) (l + m)² - (l - m)²", "(vii) x² - 13x - 30", "(viii) y² - 5y - 36", "(ix) 4y² + 25y - 21", "(x) 3x⁶ - 6x⁴y - 45x²y²"] })
        ]),
        sec("অনুশীলনী R-5 (Exercise R-5) · ত্ৰিভুজৰ সৰ্বাংগসমতা", "congruence of triangles SSS SAS ASA RHS class 9 revision", [
          Q("m10c0-r5-1", 1, "দুটা ত্ৰিভুজ সৰ্বসম হ'ব যদিহে", { options: ["(a) সিহঁতৰ কালি সমান", "(b) সিহঁতৰ আকৃতি একে কিন্তু আকাৰ বেলেগ হ'ব পাৰে", "(c) সিহঁতৰ সকলো অনুৰূপ বাহু আৰু কোণবোৰ সমান", "(d) কেৱল সিহঁতৰ পৰিসীমা সমান।"] }),
          Q("m10c0-r5-2", 2, "তলত দিয়া কোনটো সৰ্বসমতাৰ নিয়মমতে মান্য হ'ব?", { options: ["(a) AAA", "(b) SSA", "(c) SAS", "(d) ASS"] }),
          Q("m10c0-r5-3", 3, "যদি এটা ত্ৰিভুজৰ দুটা বাহু আৰু সিহঁতৰ মধ্যৱৰ্তী কোণ আন এটা ত্ৰিভুজৰ দুটা বাহু আৰু সিহঁতৰ মধ্যৱৰ্তী কোণৰ সমান হয় তেন্তে ত্ৰিভুজ দুটা সৰ্বসম হোৱা চৰ্তটো হ'ব—", { options: ["(a) ASA", "(b) SAS", "(c) AAS", "(d) RHS"] }),
          Q("m10c0-r5-4", 4, "দুটা কোণ আৰু সিহঁতৰ মধ্যৱৰ্তী বাহু সমান হ'লে কোনটো সৰ্বসমতা চৰ্ত ব্যৱহাৰ হয়?", { options: ["(a) AAS", "(b) ASA", "(c) SAS", "(d) RHS"] }),
          Q("m10c0-r5-5", 5, "দুটা সমকোণী ত্ৰিভুজ RHS চৰ্তৰ দ্বাৰা সৰ্বসম হ'বলৈ সিহঁতৰ সমান জোখৰ", { options: ["(a) অতিভুজ আৰু এটা সূক্ষ্মকোণ থাকিব", "(b) দুটা সূক্ষ্মকোণ থাকিব", "(c) অতিভুজ আৰু এডাল অনুৰূপ বাহু থাকিব", "(d) আটাইবোৰ বাহু হ'ব।"] }),
          Q("m10c0-r5-6", 6, "AAS সৰ্বসমতাৰ চৰ্তই বুজাই —", { options: ["(a) দুটা কোণ আৰু এটা বাহু যিটো কোণ দুটাৰ মধ্যৱৰ্তী নহয়।", "(b) দুটা বাহু আৰু এটা কোণ সমান", "(c) তিনিওটা কোণ সমান", "(d) এটা বাহু আৰু এটা কোণ সমান।"] }),
          Q("m10c0-r5-7", 7, "যদি ∠A = ∠D, ∠B = ∠E আৰু AB = DE তেন্তে ∆ABC ≅ ∆DEF ৰ চৰ্ত হ'ব—", { options: ["(a) SAS", "(b) AAS", "(c) ASA", "(d) RHS"] }),
          Q("m10c0-r5-8", 8, "∆ABC আৰু ∆PQR ৰ AB = PQ, BC = QR আৰু AC = PR হ'লে ত্ৰিভুজ দুটা সৰ্বসম হোৱাৰ চৰ্ত হ'ব—", { options: ["(a) ASA", "(b) SSS", "(c) SAS", "(d) RHS"] }),
          Q("m10c0-r5-9", 9, "≅ চিহ্নটোৱে কি বুজায় ?", { options: ["(a) সদৃশতা", "(b) সৰ্বসমতা", "(c) সমান্তৰাল", "(d) লম্ব"] }),
          Q("m10c0-r5-10", 10, "সৰ্বসম ত্ৰিভুজবোৰত থাকিব —", { options: ["(a) সমান অনুৰূপ বাহু", "(b) সমান অনুৰূপ কোণ", "(c) একে আকৃতি আৰু একে আকাৰ", "(d) এই সকলোবোৰ"] })
        ])
      ]
    },
    {
      no: 1, title: 'বাস্তৱ সংখ্যা (Real Numbers)', kind: 'Number System',
      context: `Chapter notes (Class 10 Real Numbers, SEBA/NCERT current syllabus: the Fundamental Theorem of Arithmetic and irrational numbers).
Fundamental Theorem of Arithmetic: every composite number can be expressed (factorised) as a product of primes, and this factorisation is unique apart from the order of the prime factors. HCF = product of the smallest power of each common prime factor; LCM = product of the greatest power of each prime factor that appears. For two positive integers a and b: HCF(a, b) x LCM(a, b) = a x b (true for two numbers only, not for three). A number ending in 0 must have both 2 and 5 as prime factors, so 6^n (only prime factors 2 and 3) never ends in 0. A number that is a product of primes plus or times other numbers (like 7 x 11 x 13 + 13) can be rewritten as a product of two numbers greater than 1, so it is composite.
Irrational numbers: a number is irrational if it cannot be written as p/q with integers p, q and q not 0. Key fact: if a prime p divides a^2 then p divides a. Proofs of irrationality are by contradiction: assume sqrt(p) = a/b in lowest terms (a and b coprime), square it, show p divides a and then p divides b, which contradicts coprime. The sum or difference of a rational and an irrational number is irrational; the product or quotient of a non-zero rational and an irrational number is irrational.
Answer key (verified): Ex 1.1 Q1 (i) 140 = 2^2 x 5 x 7 (ii) 156 = 2^2 x 3 x 13 (iii) 3825 = 3^2 x 5^2 x 17 (iv) 5005 = 5 x 7 x 11 x 13 (v) 7429 = 17 x 19 x 23. Q2 (i) 26, 91: HCF 13, LCM 182 (ii) 510, 92: HCF 2, LCM 23460 (iii) 336, 54: HCF 6, LCM 3024. Q3 (i) 12, 15, 21: HCF 3, LCM 420 (ii) 17, 23, 29: HCF 1, LCM 11339 (iii) 8, 9, 25: HCF 1, LCM 1800. Q4 LCM(306, 657) = 306 x 657 / 9 = 22338. Q5 no, 6^n never ends in 0. Q6 7 x 11 x 13 + 13 = 13 x (77 + 1) = 13 x 78 = 1014, and 7 x 6 x 5 x 4 x 3 x 2 x 1 + 5 = 5 x (1008 + 1) = 5 x 1009 = 5045; each has a factor other than 1 and itself, so both are composite. Q7 LCM(18, 12) = 36 minutes. Ex 1.2 Q1 to Q3 are proofs by contradiction: sqrt(5); 3 + 2 sqrt(5) (a rational minus a rational times irrational); 1/sqrt(2), 7 sqrt(5), 6 + sqrt(2).`,
      sections: [
        sec('অনুশীলনী 1.1 (Exercise 1.1)', 'fundamental theorem of arithmetic prime factorisation hcf lcm class 10', [
          Q('m10c1-a1', 1, 'প্ৰতিটো সংখ্যাক ইয়াৰ মৌলিক উৎপাদকৰ (prime factors) গুণফল হিচাপে প্ৰকাশ কৰা:', { parts: ['(i) 140', '(ii) 156', '(iii) 3825', '(iv) 5005', '(v) 7429'] }),
          Q('m10c1-a2', 2, 'তলৰ পূৰ্ণসংখ্যাযোৰৰ ল.সা.গু. (LCM) আৰু গ.সা.গু. (HCF) উলিওৱা আৰু যাচাই কৰা যে ল.সা.গু. × গ.সা.গু. = সংখ্যা দুটাৰ গুণফল।', { parts: ['(i) 26 আৰু 91', '(ii) 510 আৰু 92', '(iii) 336 আৰু 54'] }),
          Q('m10c1-a3', 3, 'মৌলিক উৎপাদকীকৰণ পদ্ধতি (prime factorisation method) প্ৰয়োগ কৰি তলৰ পূৰ্ণসংখ্যাবোৰৰ ল.সা.গু. আৰু গ.সা.গু. উলিওৱা:', { parts: ['(i) 12, 15 আৰু 21', '(ii) 17, 23 আৰু 29', '(iii) 8, 9 আৰু 25'] }),
          Q('m10c1-a4', 4, 'দিয়া আছে গ.সা.গু. (306, 657) = 9। ল.সা.গু. (306, 657) উলিওৱা।'),
          Q('m10c1-a5', 5, 'যিকোনো স্বাভাৱিক সংখ্যা n ৰ বাবে 6ⁿ ৰ শেষৰ অংকটো 0 হ\'ব পাৰেনে, পৰীক্ষা কৰা।'),
          Q('m10c1-a6', 6, 'ব্যাখ্যা কৰা কিয় 7 × 11 × 13 + 13 আৰু 7 × 6 × 5 × 4 × 3 × 2 × 1 + 5 যৌগিক সংখ্যা (composite numbers)।'),
          Q('m10c1-a7', 7, 'এখন খেলপথাৰৰ চাৰিওফালে এটা বৃত্তাকাৰ পথ আছে। সোনিয়াই পথটোৰ এপাক গাড়ী চলাই যাবলৈ 18 মিনিট সময় লয়, আনহাতে ৰবিয়ে একে পাক ঘূৰিবলৈ 12 মিনিট সময় লয়। ধৰা হ\'ল তেওঁলোক দুয়োজনে একে সময়তে একেটা বিন্দুৰ পৰা আৰম্ভ কৰি একে দিশত গৈ আছে। কিমান মিনিটৰ পিছত তেওঁলোক পুনৰ আৰম্ভণি বিন্দুত লগ হ\'ব?')
        ]),
        sec('অনুশীলনী 1.2 (Exercise 1.2)', 'irrational numbers proof root 5 class 10 real numbers', [
          Q('m10c1-b1', 1, '√5 এটা অমূলদ সংখ্যা (irrational number) বুলি প্ৰমাণ কৰা।'),
          Q('m10c1-b2', 2, '3 + 2√5 এটা অমূলদ সংখ্যা বুলি প্ৰমাণ কৰা।'),
          Q('m10c1-b3', 3, 'তলৰবোৰ অমূলদ সংখ্যা বুলি প্ৰমাণ কৰা:', { parts: ['(i) 1/√2', '(ii) 7√5', '(iii) 6 + √2'] })
        ])
      ]
    },
    locked(2, 'বহুপদ (Polynomials)'),
    locked(3, 'দুটা চলকত বৈখিক সমীকৰণৰ যোৰ (Pair of Linear Equations in Two Variables)'),
    locked(4, 'দ্বিঘাত সমীকৰণ (Quadratic Equations)'),
    locked(5, 'সমান্তৰ প্ৰগতি (Arithmetic Progressions)'),
    locked(6, 'ত্ৰিভুজ (Triangles)'),
    locked(7, 'স্থানাংক জ্যামিতি (Coordinate Geometry)'),
    locked(8, 'ত্ৰিকোণমিতিৰ পৰিচয় (Introduction to Trigonometry)'),
    locked(9, 'ত্ৰিকোণমিতিৰ কিছুমান প্ৰয়োগ (Some Applications of Trigonometry)'),
    locked(10, 'বৃত্ত (Circles)'),
    locked(11, 'বৃত্ত সম্বন্ধীয় কালি (Areas Related to Circles)'),
    locked(12, 'পৃষ্ঠকালি আৰু আয়তন (Surface Areas and Volumes)'),
    locked(13, 'পৰিসংখ্যা (Statistics)'),
    locked(14, 'সম্ভাৱিতা (Probability)')
  ]
};
