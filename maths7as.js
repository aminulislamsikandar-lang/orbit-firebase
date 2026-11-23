// Class 7 Mathematics, Assamese medium (textbook "নতুন গণিত", used at Halimon Nessa Academy). Question ids start with m7ac<chapter>- so they never clash with other courses.
// Question text is in Assamese, copied from the textbook exercises (the English line printed under a word problem is not kept). `context` on a chapter is hidden from students and only sent to the AI (notes in English).
// Only the exercises of a chapter are added here (no theory page, no worked examples). Chapters that are not listed yet are not in this book's list in the app.
// Figures from the book are not shown in the app: for figure questions the (hidden) chapter `context` describes the figure for the AI, and the student looks at the book.
// A mixed number is written with a space: 3 1/5 means 3 and 1/5. "A ক B ৰে" = A by B. "A ৰ B" = "B of A".
const Q = (id, no, label, text, extra = {}) => ({ id, no, label, text, ...extra });
const sec = (title, video, qs) => ({ title, questions: qs.map(q => ({ video, ...q })) });

module.exports = {
  id: 'c7-maths-as',
  subject: 'Mathematics',
  class: 7,
  medium: 'Assamese',
  sourceLang: 'Assamese',   // answers are Assamese: the translate menu offers English / Hinglish / Bengali
  chapters: [
    {
      no: 2, title: 'ভগ্নাংশ আৰু দশমিক সংখ্যা (Fractions and Decimal Numbers)', kind: 'Exercises 2(A) - 2(D)',
      context: `Chapter notes (Class 7, Fractions and Decimal Numbers, Assamese-medium textbook). Answer in simple Assamese, show the steps, and keep numbers, symbols and units as they are.
How the questions are written: a mixed number is written with a space, so 3 1/5 means 3 and 1/5 (= 16/5), and 2/3 is a fraction. "A ক B ৰে" with "পূৰণ" means A multiplied by B; with "হৰণ" it means A divided by B. "A ৰ B" or "108 মিটাৰৰ 5/12" means "of": B of A, which is multiplication (A x B). "খালী ঠাই পূৰ কৰা" means fill in the blank.
Multiplication of fractions: change every mixed number to an improper fraction, multiply the numerators, multiply the denominators, cancel common factors early, and write the answer in the simplest form (as a mixed number if it is larger than 1). A whole number n is n/1. "Of" means multiplication, and the order does not change the product. Area of a rectangle = length x breadth; area of a square = side x side; perimeter of an equilateral triangle = 3 x side.
Division of fractions: the reciprocal of a/b is b/a (the reciprocal of a whole number n is 1/n; mixed numbers are changed to improper fractions first; zero has no reciprocal). To divide by a fraction, multiply by its reciprocal. Word problems: share equally means divide; if the product of two numbers is given and one is known, the other = product / known number; length = area / breadth, breadth = area / length; price per kg = total price / kg.
Multiplication of decimals: ignore the decimal points, multiply as whole numbers, then put the decimal point so that the answer has as many digits after it as the two numbers together have. Multiplying by 10, 100, 1000 moves the decimal point 1, 2, 3 places to the right (add zeros if needed). Multiplying by 0.1, 0.01 moves it left.
Division of decimals: dividing by 10, 100, 1000 moves the decimal point 1, 2, 3 places to the left. To divide a decimal by a whole number, divide as usual and put the decimal point in the quotient when the point of the dividend is crossed (add zeros to the right if the division does not end). To divide by a decimal, multiply the dividend and the divisor by the same power of 10 so that the divisor becomes a whole number, then divide. A whole number divided by a whole number can be written as a decimal by adding a decimal point and zeros (for example 14 / 8 = 1.75). 56.2 / 10.00 is the same as 56.2 / 10.
Note: in Exercise 2(C) Question 3 the fourth item is printed "vi)" in the book by mistake; here it is numbered (iv).`,
      sections: [
        sec('অনুশীলনী 2(A) (ভগ্নাংশৰ পূৰণ)', 'multiplication of fractions class 7', [
          Q('m7ac2-a1', 1, 'Q1.', 'পূৰণ কৰা : (Multiply)', { parts: ['(i) 4 ক 2/3 ৰে', '(ii) 3/7 ক 28 ৰে', '(iii) 5 ক 1/7 ৰে', '(iv) 7/12 ক 18 ৰে'] }),
          Q('m7ac2-a2', 2, 'Q2.', 'পূৰণ কৰা : (Multiply)', { parts: ['(i) 2/5 ক 3/4 ৰে', '(ii) 8/7 ক 21/16 ৰে', '(iii) 3 1/5 ক 4/7 ৰে', '(iv) 2 4/9 ক 3 1/5 ৰে'] }),
          Q('m7ac2-a3', 3, 'Q3.', 'পূৰণফল উলিওৱা : (Find the product.)', { parts: ['(i) 9/16 × 8/15', '(ii) 9 × 5/12', '(iii) 3/4 × 5/2', '(iv) 5/14 × 7', '(v) 7 5/9 × 3/8', '(vi) 6 11/14 × 3 1/2'] }),
          Q('m7ac2-a4', 4, 'Q4.', 'পূৰণফল উলিওৱা : (Find the product.)', { parts: ['(i) 5 × 3/7 × 1/6', '(ii) 4/3 × 6/8 × 5/12', '(iii) 4 1/5 × 2 1/12 × 3 1/5', '(iv) 1/8 × 3 1/19 × 2 3/5', '(v) 2 1/5 × 2 1/2 × 1 3/7', '(vi) 3 1/3 × 4 2/5 × 1 6/7'] }),
          Q('m7ac2-a5', 5, 'Q5.', 'মান নিৰ্ণয় কৰা : (Find the value of each of the following.)', { parts: ['(i) 16 ৰ 3/8', '(ii) 3/7 ৰ 1/2', '(iii) 1 4/5 ৰ 2/3', '(iv) 4 2/9 ৰ 1 1/2', '(v) 9 2/3 ৰ 5/8', '(vi) 9/16 ৰ 1/6'] }),
          Q('m7ac2-a6', 6, 'Q6.', 'তলত দিয়াবোৰৰ মান নিৰ্ণয় কৰা : (Find the value of each of the following.)', { parts: ['(i) 108 মিটাৰৰ 5/12', '(ii) 1000 টকাৰ 2/5', '(iii) 350 কিগ্ৰা. ৰ 5/7', '(iv) 56 লিটাৰৰ 3/8', '(v) এসপ্তাহৰ 4/7'] }),
          Q('m7ac2-a7', 7, 'Q7.', 'এখন বৰ্গাকাৰ পথাৰৰ এটা বাহুৰ দীঘ 18 4/5 মিটাৰ। পথাৰখনৰ কালি নিৰ্ণয় কৰা।'),
          Q('m7ac2-a8', 8, 'Q8.', 'তগৰে 1 ঘণ্টাত এখন উপন্যাসৰ 1/7 অংশ পঢ়ে। তেওঁ 2 1/4 ঘণ্টাত উপন্যাসখনৰ কিমান অংশ পঢ়িব নিৰ্ণয় কৰা।'),
          Q('m7ac2-a9', 9, 'Q9.', 'এটা আয়তৰ দীঘ 7 1/5 ছেমি. আৰু প্ৰস্থ 4 2/3 ছেমি.। আয়তটোৰ কালি নিৰ্ণয় কৰা।'),
          Q('m7ac2-a10', 10, 'Q10.', "এটা শ্ৰেণীৰ মুঠ 40 জন ছাত্ৰ-ছাত্ৰীৰ 3/5 অংশ ল'ৰা। শ্ৰেণীটোৰ ছোৱালীৰ সংখ্যা নিৰ্ণয় কৰা।")
        ]),
        sec('অনুশীলনী 2(B) (ভগ্নাংশৰ হৰণ)', 'division of fractions class 7', [
          Q('m7ac2-b1', 1, 'Q1.', 'তলৰ সংখ্যাবোৰৰ প্ৰতিক্ৰমবোৰ লিখা : (Write the reciprocal of each of the following.)', { parts: ['(i) 7/11', '(ii) 1 4/9', '(iii) 1/19', '(iv) 23', '(v) 11/2'] }),
          Q('m7ac2-b2', 2, 'Q2.', 'হৰণ কৰা : (Divide)', { parts: ['(i) 4/9 ক 5/6 ৰে', '(ii) 5 3/5 ক 2 1/10 ৰে', '(iii) 25 ক 1 2/3 ৰে', '(iv) 2 3/7 ক 17 ৰে', '(v) 11 1/3 ক 3/2 ৰে'] }),
          Q('m7ac2-b3', 3, 'Q3.', 'হৰণফল উলিওৱা : (Find the quotient.)', { parts: ['(i) 23 3/4 ÷ 3 1/2', '(ii) 63 ÷ 1 3/11', '(iii) 5 1/6 ÷ 9/2', '(iv) 2 1/3 ÷ 2 1/4', '(v) 3 1/5 ÷ 1 2/3', '(vi) 5 1/3 ÷ 2 2/3'] }),
          Q('m7ac2-b4', 4, 'Q4.', 'মান উলিওৱা : (Find the values.)', { parts: ['(i) 4/9 ÷ 5', '(ii) 4 4/13 ÷ 7', '(iii) 4 1/3 ÷ 3', '(iv) 4 1/2 ÷ 4', '(v) 4 3/7 ÷ 7', '(vi) 3/8 ÷ 5/9', '(vii) 7/8 ÷ 1/2', '(viii) 6 1/4 ÷ 1 2/13', '(ix) 5 4/7 ÷ 1 3/10'] }),
          Q('m7ac2-b5', 5, 'Q5.', "দুটা সংখ্যাৰ পূৰণফল 24 3/4। ইয়াৰে এটা সংখ্যা 1 3/8 হ'লে আনটো সংখ্যা নিৰ্ণয় কৰা।"),
          Q('m7ac2-b6', 6, 'Q6.', '36 2/5 কিগ্ৰা. চাউল 13 টা পৰিয়ালৰ মাজত সমানে ভগাই দিলে, প্ৰতিটো পৰিয়ালে কিমান পৰিমাণৰ চাউল লাভ কৰিব নিৰ্ণয় কৰা।'),
          Q('m7ac2-b7', 7, 'Q7.', "12 1/2 কিগ্ৰা. আলুৰ দাম 131 1/4 টকা হ'লে প্ৰতি কিগ্ৰা. আলুৰ দাম কিমান হ'ব নিৰ্ণয় কৰা।"),
          Q('m7ac2-b8', 8, 'Q8.', "এটা আয়তৰ কালি 20 বৰ্গছেমি.। আয়তটোৰ প্ৰস্থ 2 2/5 ছেমি. হ'লে আয়তটোৰ দীঘ নিৰ্ণয় কৰা।")
        ]),
        sec('অনুশীলনী 2(C) (দশমিকৰ পূৰণ)', 'multiplication of decimal numbers class 7', [
          Q('m7ac2-c1', 1, 'Q1.', 'পূৰণ কৰা : (Multiply)', { parts: ['(i) 0.3 × 7', '(ii) 2.3 × 8', '(iii) 6.7 × 12', '(iv) 0.21 × 5', '(v) 9.18 × 6', '(vi) 12.37 × 20', '(vii) 0.132 × 3', '(viii) 4.056 × 2', '(ix) 10.444 × 15'] }),
          Q('m7ac2-c2', 2, 'Q2.', 'খালী ঠাই পূৰ কৰা : (Fill in the blanks.)', { parts: ['(i) 0.9 × 10 = ........', '(ii) 1.31 × 10 = ........', '(iii) 0.269 × 100 = ........', '(iv) 1.069 × 100 = ........', '(v) 1.493 × 10 = ........', '(vi) 2.1346 × 1000 = ........', '(vii) 2.69 × 100 = ........', '(viii) 6.95 × 1000 = ........'] }),
          Q('m7ac2-c3', 3, 'Q3.', 'পূৰণফল উলিওৱা : (Find the product.)', { parts: ['(i) 3.5 × 0.3', '(ii) 0.3 × 51.7', '(iii) 1.2 × 316.8', '(iv) 1.7 × 7.1', '(v) 0.7 × 0.007', '(vi) 11.2 × 3.15', '(vii) 1.07 × 0.03', '(viii) 10.05 × 1.75', '(ix) 101.01 × 0.01'] }),
          Q('m7ac2-c4', 4, 'Q4.', 'মান নিৰ্ণয় কৰা : (Find the values.)', { parts: ['(i) 0.1 × 0.2 × 0.3', '(ii) 2.1 × 1.2 × 0.5', '(iii) 0.5 × 2.1 × 1.5 × 0.2', '(iv) 2.5 × 1.2 × 2.1 × 1.3'] }),
          Q('m7ac2-c5', 5, 'Q5.', 'এটা সমবাহু ত্ৰিভুজৰ এটা বাহুৰ মাপ 5.23 ছেমি.। ত্ৰিভুজটোৰ পৰিসীমা নিৰ্ণয় কৰা।'),
          Q('m7ac2-c6', 6, 'Q6.', 'এখন মোনাত 18.625 কিগ্ৰা. চেনি আছে। তেনেকুৱা 12 খন মোনাত মুঠতে কিমান চেনি থাকিব নিৰ্ণয় কৰা।'),
          Q('m7ac2-c7', 7, 'Q7.', "এখন গাড়ীয়ে 1 লিটাৰ পেট্ৰ'লেৰে 18.24 কিমি. দূৰত্ব অতিক্ৰম কৰে। 7.6 লিটাৰ পেট্ৰ'লেৰে গাড়ীখনে কিমান দূৰত্ব অতিক্ৰম কৰিব নিৰ্ণয় কৰা।"),
          Q('m7ac2-c8', 8, 'Q8.', "1 মিটাৰ তামৰ তাঁৰৰ মূল্য 7.75 টকা হ'লে 24.5 মিটাৰ তামৰ তাঁৰৰ মুঠ মূল্য কিমান হ'ব?")
        ]),
        sec('অনুশীলনী 2(D) (দশমিকৰ হৰণ)', 'division of decimal numbers class 7', [
          Q('m7ac2-d1', 1, 'Q1.', 'মান নিৰ্ণয় কৰা : (Find the value of each of the following.)', { parts: ['A. (i) 1.9 ÷ 10   (ii) 24.3 ÷ 10   (iii) 179 ÷ 10   (iv) 0.6 ÷ 10', 'B. (i) 0.9 ÷ 100   (ii) 9.7 ÷ 100   (iii) 25.3 ÷ 100   (iv) 679.4 ÷ 100', 'C. (i) 0.4 ÷ 1000   (ii) 6.9 ÷ 1000   (iii) 56.2 ÷ 10.00   (iv) 717.5 ÷ 100'] }),
          Q('m7ac2-d2', 2, 'Q2.', 'হৰণ কৰা : (Divide)', { parts: ['(i) 0.6 ক 3 ৰে', '(ii) 0.45 ক 5 ৰে', '(iii) 2.64 ক 4 ৰে', '(iv) 28.49 ক 7 ৰে', '(v) 21.6 ক 6 ৰে', '(vi) 98.4 ক 8 ৰে', '(vii) 47.79 ক 9 ৰে', '(viii) 0.496 ক 2 ৰে'] }),
          Q('m7ac2-d3', 3, 'Q3.', 'হৰণফল উলিওৱা : (Find the quotient.)', { parts: ['(i) 93.45 ÷ 15', '(ii) 147.6 ÷ 12', '(iii) 305.5 ÷ 13', '(iv) 39.95 ÷ 17', '(v) 147.2 ÷ 23', '(vi) 64.6 ÷ 19', '(vii) 127.68 ÷ 24', '(viii) 142.6 ÷ 20'] }),
          Q('m7ac2-d4', 4, 'Q4.', 'হৰণফল উলিওৱা : (Find the quotient.)', { parts: ['(i) 1.28 ÷ .4', '(ii) 42.8 ÷ 0.02', '(iii) 0.0064 ÷ 0.04', '(iv) 6.9168 ÷ 52.4', '(v) 25.395 ÷ 1.5', '(vi) 21.976 ÷ 1.64', '(vii) 16.578 ÷ 5.4', '(viii) 0.228 ÷ 0.38'] }),
          Q('m7ac2-d5', 5, 'Q5.', 'হৰণ কৰা আৰু হৰণফল দশমিকত প্ৰকাশ কৰা : (Divide and express the quotient in decimal form.)', { parts: ['(i) 14 ক 8 ৰে', '(ii) 66 ক 15 ৰে', '(iii) 57 ক 20 ৰে', '(iv) 102 ক 25 ৰে', '(v) 33 ক 40 ৰে', '(vi) 13 ক 16 ৰে'] }),
          Q('m7ac2-d6', 6, 'Q6.', "এটা সমবাহু ত্ৰিভুজৰ পৰিসীমা 13.8 ছেমি. হ'লে ত্ৰিভুজটোৰ এটা বাহুৰ মাপ উলিওৱা।"),
          Q('m7ac2-d7', 7, 'Q7.', "দুটা সংখ্যাৰ পূৰণফল 60.45। ইয়াৰে এটা 6.5 হ'লে আনটো নিৰ্ণয় কৰা।"),
          Q('m7ac2-d8', 8, 'Q8.', "15.6 কিগ্ৰা. আপেল 12 জন ল'ৰাৰ মাজত সমানে ভগাই দিলে গাইপতি কিমানকৈ লাভ কৰিব?"),
          Q('m7ac2-d9', 9, 'Q9.', '34 টকা 8 জন ছাত্ৰৰ মাজত সমানে ভগাই দিলে প্ৰতিজনে কিমান টকা লাভ কৰিব?'),
          Q('m7ac2-d10', 10, 'Q10.', 'এটা আয়তৰ কালি 24.32 বৰ্গছেমি.। আয়তটোৰ দীঘ 6.4 ছেমি.। ইয়াৰ প্ৰস্থ উলিওৱা।')
        ])
      ]
    },
    {
      no: 3, title: 'সৰল সমীকৰণ (Simple Equations)', kind: 'Exercise 3(C)',
      context: `Chapter notes (Class 7, Simple Equations, Assamese-medium textbook; only Exercise 3(C), the word problems, is added so far). Answer in simple Assamese, show the steps, and keep numbers, symbols and units as they are.
Method for every question: let the unknown number be x (for age or class problems let x be the single unknown, for example the smaller age), write an equation from the statement, solve it by transposing terms (the term changes side and sign), and finally check the answer by putting it back in the statement.
Words: "তিনিগুণ" = 3 times, "চাৰিগুণ" = 4 times, "A ৰ লগত B যোগ কৰিলে" = A + B, "A ৰ পৰা B বিয়োগ কৰিলে" = A - B, "A, B তকৈ n বেছি" = A = B + n, "3/4 অংশ" = 3/4 of the number, "ক্ৰমিক স্বাভাৱিক সংখ্যা" = consecutive natural numbers (x, x + 1, x + 2), a ratio 7 : 4 means the numbers are 7x and 4x, "A, B তকৈ n বছৰ ডাঙৰ" = A = B + n years, "2/3 গুণ" = 2/3 times (boys = 2/3 of the girls).`,
      sections: [
        sec('অনুশীলনী 3(C)', 'simple equations word problems class 7', [
          Q('m7ac3-c1', 1, 'Q1.', 'এটা সংখ্যাৰ তিনিগুণৰ লগত 8 যোগ কৰিলে যোগফল 20 হয়। সংখ্যাটো উলিওৱা।'),
          Q('m7ac3-c2', 2, 'Q2.', 'এটা সংখ্যাৰ চাৰিগুণৰ পৰা 7 বিয়োগ কৰিলে 17 পোৱা যায়। সংখ্যাটো উলিওৱা।'),
          Q('m7ac3-c3', 3, 'Q3.', 'এটা স্বাভাৱিক সংখ্যাৰ তিনিগুণ, সংখ্যাটোতকৈ 26 বেছি। সংখ্যাটো উলিওৱা।'),
          Q('m7ac3-c4', 4, 'Q4.', 'এটা সংখ্যাৰ 3/4 অংশৰ লগত 5 যোগ কৰিলে যোগফল 11 হয়। সংখ্যাটো উলিওৱা।'),
          Q('m7ac3-c5', 5, 'Q5.', 'তিনিটা ক্ৰমিক স্বাভাৱিক সংখ্যাৰ যোগফল 27। সংখ্যা তিনিটা উলিওৱা।'),
          Q('m7ac3-c6', 6, 'Q6.', 'দুটা যোগাত্মক সংখ্যাৰ অনুপাত 7 : 4 আৰু সিহঁতৰ পাৰ্থক্য 15। সংখ্যা দুটা উলিওৱা।'),
          Q('m7ac3-c7', 7, 'Q7.', 'ৰমেন অৰূপতকৈ 9 বছৰ ডাঙৰ। দুয়োৰে বয়সৰ সমষ্টি 41 বছৰ। দুয়োৰে বয়স নিৰ্ণয় কৰা।'),
          Q('m7ac3-c8', 8, 'Q8.', 'এটা শ্ৰেণীত ছাত্ৰৰ সংখ্যা ছাত্ৰীৰ সংখ্যাৰ 2/3 গুণ। শ্ৰেণীটোত মুঠ ছাত্ৰ-ছাত্ৰীৰ সংখ্যা 50 গৰাকী। ছাত্ৰৰ সংখ্যা আৰু ছাত্ৰীৰ সংখ্যা নিৰ্ণয় কৰা।')
        ])
      ]
    },
    {
      no: 4, title: 'ৰেখা আৰু কোণ (Lines and Angles)', kind: 'Exercises 4(A) - 4(B)',
      context: `Chapter notes (Class 7, Lines and Angles, Assamese-medium textbook). Answer in simple Assamese, show the steps, and keep numbers, symbols and units as they are.
Point, line, ray, line segment: a point has no size, only a position. A straight line extends without end on both sides, has no end-points and no breadth, and its length cannot be measured. A ray has one initial point and extends without end in one direction. A line segment has two end-points and a measurable length. Infinitely many lines can be drawn through one point, but only one line passes through two given points. Collinear points are points that lie on the same line.
Angles: acute (more than 0° and less than 90°), right (90°), obtuse (more than 90° and less than 180°), straight (180°), reflex (more than 180° and less than 360°), complete angle (360° = 4 right angles). 1 right angle = 90 degrees. A ray turning anticlockwise makes a positive angle and turning clockwise makes a negative angle. Complementary angles add up to 90°; supplementary angles add up to 180°; an angle that is its own complement is 45° and one that is its own supplement is 90°. Adjacent angles have a common vertex and a common arm, and their other arms lie on opposite sides of the common arm. A linear pair is two adjacent angles whose non-common arms are opposite rays, so they are supplementary (180°). Angles on a straight line add up to 180° and angles around a point add up to 360°. Theorem: when two lines intersect, the vertically opposite angles are equal.
Parallel lines and a transversal (Exercise 4(B)): if a transversal cuts two parallel lines then corresponding angles are equal, alternate interior angles are equal, alternate exterior angles are equal, and interior angles on the same side of the transversal are supplementary. Conversely, if corresponding angles are equal, or alternate angles are equal, or same-side interior angles are supplementary, then the two lines are parallel. For a zig-zag between two parallel lines, draw a line through the corner point parallel to the given lines.
The app does not show the book's pictures, so the figures are described here (the figures are only described; the answers are not given). Note: in 4(A) Question 10 the book prints "interesect"; here it is written "intersect".
4(A) Q8: (i) P, O, Q are on a straight line and ray OR is above it: angle POR = 65° and angle ROQ = x. (ii) X, O, Y are on a straight line with rays OU and OZ above it: angle XOU = 60°, angle UOZ = x°, angle ZOY = 45°. (iii) X, O, Y are on a straight line with ray OZ above it: angle XOZ = (2x - 10)° and angle ZOY = (3x + 15)°. (iv) four rays OA, OB, OC, OD around the point O: angle AOB = 65°, angle BOC = 60°, angle COD = 110° and angle DOA = x°.
4(A) Q9: lines PQ and RS cross at O (P and R above, S and Q below); angle POR = 120°.
4(A) Q10: lines AB and CD cross at O (A and C above, D and B below); the top angle AOC = (5x - 20)° and the bottom angle DOB = (3x + 10)° are vertically opposite angles.
4(B) Q1 and Q2: the angles are numbered 1 to 8 as read from the photo of the book (please treat the positions as the usual layout): angles 1 and 2 are above the upper line (1 on the right of the transversal, 2 on the left), angles 3 and 4 are below the upper line (3 on the left, 4 on the right), angles 5 and 6 are above the lower line (5 on the right, 6 on the left), angles 7 and 8 are below the lower line (7 on the left, 8 on the right). Q1 figure (i): p || q, transversal m, angle 1 = 70°. Q2 figure (ii): lines a and b, transversal l, angle 2 = 120° and angle 8 = 120° (alternate exterior angles).
4(B) Q3: transversal EF cuts AB at P and CD at Q; angle BPE = 70° and angle PQC = 110°; the idea is that angle PQC and the angle next to it on the line CD form a linear pair, then compare with angle BPE.
4(B) Q4: three figures where the transversal r cuts p and q; one angle is marked at each line: (i) 45° and 135°, (ii) 115° and 65°, (iii) 30° and 145°. The positions are not described here, so if needed ask the student how the two marked angles sit (corresponding, alternate or same-side) or explain the rule for each case.
4(B) Q5: l || m and p, q are two transversals; the marked angles are 80° and 75°, and x and y are to be found. Q6: AB || CD, E is a point between them joined to B and D; angle ABE = 40° and angle CDE = 35°; draw a line through E parallel to AB. Q7: PQ || TS, Q and S are joined through R; angle PQR = 140° and angle RST = 120°; draw a line through R parallel to PQ. Q8: triangle ABC, B, C, D are on one line and CE is drawn with BA || CE; angle BAC = 65° and angle ECD = 55°. Q10: AB || DE and BC || EF with B, D, C on one line; angle at B = 70°; x is marked at D and y at E.`,
      sections: [
        sec('অনুশীলনী 4(A) (কোণ আৰু কোণৰ যোৰ)', 'types of angles pair of angles class 7', [
          Q('m7ac4-a1', 1, 'Q1.', 'তলত কেতবোৰ কোণৰ মাপ দিয়া আছে। ইহঁতৰ সূক্ষ্মকোণ (acute angles), স্থূলকোণ (obtuse angles), প্ৰবৃদ্ধ কোণবোৰ (reflex angles) বাছি উলিওৱা :', { parts: ['269°, 118°, 64°, 91°, 181°, 359°, 89°, 179°, 145°, 310°, 43°'] }),
          Q('m7ac4-a2', 2, 'Q2.', 'চমু উত্তৰ দিয়া :', { parts: ['(i) একেৰেখীয় বিন্দু (collinear points) কাক বোলে?', '(ii) এটা বিন্দুৰ মাজেৰে কেইডাল ৰেখা আঁকিব পাৰি?', '(iii) ঋণাত্মক কোণ (negative angles) কাক বোলে?', '(iv) সন্নিহিত কোণ (adjacent angles) কাক বোলে?', '(v) সম্পূৰক কোণ (supplementary angles) কাক বোলে?'] }),
          Q('m7ac4-a3', 3, 'Q3.', 'খালী ঠাই পূৰ কৰা :', { parts: ['(i) এক সমকোণ = ........ ডিগ্ৰী', '(ii) এটা সম্পূৰ্ণ কোণ = ........ ডিগ্ৰী', '(iii) ৰশ্মি এটাই ঘড়ীৰ কাঁটাৰ বিপৰীত দিশত ঘূৰি উৎপন্ন কৰা কোণক ........ কোণ বোলে।', '(iv) ৰেখাখণ্ডৰ ........ নাথাকে।', '(v) দুটা বিন্দুৰ মাজেৰে যোৱাকৈ ........ ডাল ৰেখা আঁকিব পাৰি।'] }),
          Q('m7ac4-a4', 4, 'Q4.', 'সত্য নে অসত্য লিখা :', { parts: ['(i) প্ৰবৃদ্ধ কোণবোৰ 180° তকৈ ডাঙৰ।', '(ii) সমান্তৰাল সৰলৰেখা দুডালক অসীমলৈ বঢ়াই দিলে এটা বিন্দুত ছেদ কৰিব।', '(iii) দুডাল অসমান্তৰাল সৰলৰেখাই এটাতকৈ অধিক বিন্দুত ছেদ কৰিব পাৰে।', '(iv) বিন্দুৰ কোনো আকাৰ নাথাকে।', '(v) এডাল ৰেখাৰ দুটা প্ৰান্তবিন্দু থাকে।'] }),
          Q('m7ac4-a5', 5, 'Q5.', 'তলত প্ৰতিটো কোণৰ পূৰক কোণবোৰৰ (complementary angles) মাপ লিখা :', { parts: ['(i) 37°', '(ii) 81°', '(iii) 17°', '(iv) 33°'] }),
          Q('m7ac4-a6', 6, 'Q6.', 'তলত প্ৰতিটো কোণৰ সম্পূৰক কোণবোৰৰ (supplementary angles) মাপ লিখা :', { parts: ['(i) 119°', '(ii) 47°', '(iii) 136°', '(iv) 95°'] }),
          Q('m7ac4-a7', 7, 'Q7.', 'এটা কোণ নিজেই নিজৰ সম্পূৰক। কোণটোৰ মাপ নিৰ্ণয় কৰা।'),
          Q('m7ac4-a8', 8, 'Q8.', 'তলৰ চিত্ৰবোৰৰ পৰা x ৰ মান নিৰ্ণয় কৰা :', { parts: ['(i)', '(ii)', '(iii)', '(iv)'] }),
          Q('m7ac4-a9', 9, 'Q9.', 'কাষৰ চিত্ৰত PQ আৰু RS ৰেখা দুডালে পৰস্পৰ O বিন্দুত ছেদ কৰিছে। ∠POR = 120°। ∠QOR, ∠QOS আৰু ∠POS ৰ মাপ নিৰ্ণয় কৰা।'),
          Q('m7ac4-a10', 10, 'Q10.', 'কাষৰ চিত্ৰত AB আৰু CD ৰেখা দুডালে O বিন্দুত কটাকটি (intersect) কৰিছে। x ৰ মান নিৰ্ণয় কৰা।')
        ]),
        sec('অনুশীলনী 4(B) (সমান্তৰাল ৰেখা আৰু ছেদক)', 'parallel lines and transversal class 7', [
          Q('m7ac4-b1', 1, 'Q1.', "তলৰ চিত্ৰ (i) ত p || q আৰু m ইহঁতৰ ছেদক। ∠1 = 70° হ'লে ∠2, ∠3, ∠4, ∠5, ∠6, ∠7 আৰু ∠8 ৰ মান উলিওৱা।"),
          Q('m7ac4-b2', 2, 'Q2.', 'ওপৰৰ চিত্ৰ (ii) ত a আৰু b ৰেখা দুডালক l ছেদকে দুটা বিন্দুত ছেদ কৰিছে। ইয়াৰে ∠2 = 120° আৰু ∠8 = 120°। a || b হয় নে নহয় পৰীক্ষা কৰা।'),
          Q('m7ac4-b3', 3, 'Q3.', 'ওপৰৰ চিত্ৰ (iii) ত AB আৰু CD ৰেখা দুডালক EF ছেদকে ক্ৰমে P আৰু Q বিন্দুত ছেদ কৰিছে যাতে ∠BPE = 70° আৰু ∠PQC = 110°। দেখুওৱা যে AB || CD।'),
          Q('m7ac4-b4', 4, 'Q4.', 'তলৰ চিত্ৰবোৰত p আৰু q ৰেখা দুডালক r ছেদকে ছেদ কৰিছে। p আৰু q সমান্তৰাল হয় নে নহয় পৰীক্ষা কৰা।', { parts: ['(i)', '(ii)', '(iii)'] }),
          Q('m7ac4-b5', 5, 'Q5.', "কাষৰ চিত্ৰত l || m ; p আৰু q ৰেখাদুডাল l আৰু m ৰ দুডাল ছেদক। তেনেহ'লে x আৰু y ৰ মান উলিওৱা।"),
          Q('m7ac4-b6', 6, 'Q6.', "কাষৰ চিত্ৰত AB || CD। ∠ABE = 40°, ∠CDE = 35° হ'লে ∠BED ৰ মাপ উলিওৱা।"),
          Q('m7ac4-b7', 7, 'Q7.', "কাষৰ চিত্ৰত PQ || TS। ∠PQR = 140° আৰু ∠RST = 120° হ'লে ∠QRS ৰ মাপ নিৰ্ণয় কৰা।"),
          Q('m7ac4-b8', 8, 'Q8.', "কাষৰ চিত্ৰত ΔABC ৰ ∠BAC = 65°। BA || CE আৰু ∠ECD = 55° হ'লে ∠ACE আৰু ∠ABC ৰ মাপ উলিওৱা।"),
          Q('m7ac4-b9', 9, 'Q9.', 'ABCD চতুৰ্ভুজৰ AB || DC আৰু AD || BC। প্ৰমাণ কৰা যে ∠ABC = ∠ADC।'),
          Q('m7ac4-b10', 10, 'Q10.', 'কাষৰ চিত্ৰত AB || DE আৰু BC || EF। x আৰু y ৰ মান নিৰ্ণয় কৰা।')
        ])
      ]
    },
    {
      no: 5, title: 'ত্ৰিভুজ আৰু ইয়াৰ ধৰ্ম (Triangle and its Properties)', kind: 'Exercises 5(A) - 5(C)',
      context: `Chapter notes (Class 7, Triangle and its Properties, Assamese-medium textbook). Answer in simple Assamese, show the steps, and keep numbers, symbols and units as they are.
A triangle has 3 vertices, 3 sides and 3 interior angles. By sides: scalene (all sides different), isosceles (two sides equal) and equilateral (three sides equal). By angles: acute-angled (all three angles acute), right-angled (one angle is 90°) and obtuse-angled (one angle is obtuse).
Angle sum property: the three interior angles of a triangle add up to 180°. Exterior angle: if a side of a triangle is produced, the exterior angle formed is equal to the sum of the two interior opposite angles (Property 1), so it is greater than each of them; an exterior angle and its adjacent interior angle form a linear pair (180°). A triangle cannot have two right angles or two obtuse angles; the two acute angles of a right-angled triangle add up to 90°.
Isosceles triangle: the angles opposite the equal sides are equal (Property 3), the angle between the two equal sides is the vertical angle and the other two are the base angles. Equilateral triangle: all sides are equal and each angle is 60°. Median: the line segment from a vertex to the mid-point of the opposite side (a triangle has 3 medians, and X is the mid-point of PR if QX is the median from Q). Altitude: the perpendicular from a vertex to the opposite side (a triangle has 3 altitudes and they meet at one point).
Property 5: the sum of any two sides of a triangle is greater than the third side, so three lengths can form a triangle only if the two smaller ones add up to more than the largest one.
Pythagoras theorem: in a right-angled triangle the square of the hypotenuse is equal to the sum of the squares of the other two sides. The hypotenuse is the side opposite the right angle and it is the longest side. The converse is used to test whether a triangle is right-angled: if the square of the longest side equals the sum of the squares of the other two, it is right-angled. Word problems with poles, ropes, ladders and walking east then north make a right-angled triangle.
The app does not show the book's pictures, so the figures are described here (the figures are only described; the answers are not given).
5(A) Q1: (i) triangle ABC with angle A = 50° and angle B = 55°, side BC produced to D, and x = the exterior angle ACD. (ii) triangle PQR with angle R = 90°, the exterior angle at Q is 120° and x = angle P. (iii) triangle DEF with side ED produced to C: angle E = x, angle F = 60° and the exterior angle at D is 2x. (iv) triangle ABC with BC produced on both sides (E, B, C, D on one line): the exterior angle at B is 130° and the interior angle there is x, the exterior angle at C is 135° and the interior angle there is y, and z = angle A. (v) triangle DEF with angle D = 40°, angle at E = y, angle DFE = 75°, EF produced to G and x = the exterior angle DFG. (vi) triangle LMN with ML produced to R and MN produced to Q: the exterior angle RLN = 85°, x = angle MLN, angle M = 40°, y = angle LNM and z = the exterior angle LNQ. (vii) R is on side QS of triangle PQS and PR is joined: angle Q = 50°, angle QPR = y, angle RPS = 25°, angle PRS = 110°, z = angle PRQ and x = angle S. (viii) PQ || RS, A is on PQ, B and C are on RS: angle PAB = 50°, angle ACB = 70° and x = angle BAC. (ix) triangle ABC with angle A = x - 6, angle B = 3x + 10 and angle C = 2x - 10. (x) B, C, D are on one line with angle B = 40° and angle D = 50°, a 50° angle is marked at E, x is marked near C and y near A (check the exact positions with the student).
5(A) Q8: triangle ABC, D is on AB and E is on AC, DE || BC, angle A = 45° and angle B = 65°. Q9: Q, P, T are on one line; Q, R, S are on one line; angle PQR = 30°, the angle at R inside triangle PQR is 120°, and angle RPS = 50°; the three angles asked are angle PSR, angle QPR and the exterior angle TPS.
5(B) Q1: (i) triangle ABC with AB = AC, angle B = 70° and x = angle C. (ii) triangle PQR with PQ = PR, angle P = 3x and angle Q = x. (iii) triangle ABC with angle B = 90° and AB = BC, x = angle A and y = angle C. (iv) O is a point inside triangle PQR with OP = OQ = OR: angle QPO = 40°, angle OPR = 35°, x = angle PQO and y = angle PRO.
5(C) Q7: triangle XYZ with the right angle at Y and XY = YZ, so XZ is the hypotenuse; XZ² = 32. Q8: AB and CD are vertical poles of heights 6 m and 11 m standing on the ground with BD = 12 m, and AE is drawn perpendicular to CD (E on CD) as the hint says, so that AEC is a right-angled triangle.`,
      sections: [
        sec('অনুশীলনী 5(A) (ত্ৰিভুজৰ কোণ আৰু বহিঃকোণ)', 'angle sum property and exterior angle of triangle class 7', [
          Q('m7ac5-a1', 1, 'Q1.', 'তলৰ চিত্ৰবোৰৰ পৰা x, y, z ৰ মান উলিওৱা :', { parts: ['(i)', '(ii)', '(iii)', '(iv)', '(v)', '(vi)', '(vii)', '(viii)', '(ix)', '(x)'] }),
          Q('m7ac5-a2', 2, 'Q2.', "ABC ত্ৰিভুজৰ ∠A = 75°, ∠B = 40° হ'লে ∠C ৰ মাপ উলিওৱা।"),
          Q('m7ac5-a3', 3, 'Q3.', "ΔXYZ ৰ ∠Y = 115°, ∠Z = 38° হ'লে ∠X ৰ মাপ উলিওৱা।"),
          Q('m7ac5-a4', 4, 'Q4.', 'ΔPQR ৰ QR বাহুক S বিন্দুলৈ বঢ়াই দিয়া। যদি ∠P = 75° আৰু ∠PRS = 130° তেন্তে ∠Q ৰ মাপ উলিওৱা।'),
          Q('m7ac5-a5', 5, 'Q5.', 'এটা ত্ৰিভুজৰ কোণ তিনিটাৰ মাপৰ অনুপাত 1 : 2 : 3। ত্ৰিভুজটোৰ কোণ তিনিটাৰ মাপ উলিওৱা।'),
          Q('m7ac5-a6', 6, 'Q6.', 'এটা ত্ৰিভুজৰ এটা বহিঃকোণৰ মাপ 135° আৰু বহিঃকোণটোৰ বিপৰীত অন্তঃকোণ দুটাৰ মাপৰ অনুপাত 4 : 5। ত্ৰিভুজটোৰ তিনিওটা অন্তঃকোণৰ মাপ উলিওৱা।'),
          Q('m7ac5-a7', 7, 'Q7.', "এটা সমকোণী ত্ৰিভুজৰ সূক্ষ্মকোণ দুটাৰ এটাৰ মাপ 58° হ'লে আনটো সূক্ষ্মকোণৰ মাপ কিমান?"),
          Q('m7ac5-a8', 8, 'Q8.', 'কাষৰ চিত্ৰত ABC এটা ত্ৰিভুজ আৰু DE || BC। ∠A = 45° আৰু ∠B = 65°। তেন্তে', { parts: ['(i) ∠ADE', '(ii) ∠AED আৰু', '(iii) ∠C ৰ মাপ উলিওৱা।'] }),
          Q('m7ac5-a9', 9, 'Q9.', 'কাষৰ চিত্ৰৰ পৰা তলৰ কোণকেইটাৰ মাপ উলিওৱা :', { parts: ['(i) ∠PSR', '(ii) ∠QPR', '(iii) ∠TPS'] }),
          Q('m7ac5-a10', 10, 'Q10.', 'শুদ্ধ নে অশুদ্ধ লিখা :', { parts: ['(i) এটা ত্ৰিভুজত দুটা সমকোণ থাকিব পাৰে।', '(ii) এটা ত্ৰিভুজত দুটা স্থূলকোণ থাকিব নোৱাৰে।', '(iii) এটা সমকোণী ত্ৰিভুজৰ আটাইতকৈ ডাঙৰ কোণটোৰ মাপ 90°।', '(iv) এটা ত্ৰিভুজৰ এটা বহিঃকোণৰ মাপ তাৰ বিপৰীত অন্তঃকোণ দুটাৰ প্ৰতিটোতকৈ ডাঙৰ।', '(v) ত্ৰিভুজৰ তিনিওটা কোণৰ মাপৰ যোগফল দুই সমকোণৰ সমান।', "(vi) এটা ত্ৰিভুজৰ তিনিওটা কোণ সূক্ষ্মকোণ হ'ব নোৱাৰে।"] })
        ]),
        sec('অনুশীলনী 5(B) (সমদ্বিবাহু ত্ৰিভুজ)', 'isosceles and equilateral triangle properties class 7', [
          Q('m7ac5-b1', 1, 'Q1.', 'তলৰ চিত্ৰবোৰৰ পৰা x, y ৰ মান উলিওৱা :', { parts: ['(i)', '(ii)', '(iii)', '(iv)'] }),
          Q('m7ac5-b2', 2, 'Q2.', 'এটা সমদ্বিবাহু ত্ৰিভুজৰ শীৰ্ষকোণৰ মাপ 120°। ভূমি সংলগ্ন কোণ দুটাৰ মাপ নিৰ্ণয় কৰা।'),
          Q('m7ac5-b3', 3, 'Q3.', 'এটা সমদ্বিবাহু ত্ৰিভুজৰ ভূমি সংলগ্ন কোণ দুটাৰ প্ৰতিটোৰে মাপ 40°। ত্ৰিভুজটোৰ শীৰ্ষকোণৰ মাপ নিৰ্ণয় কৰা।'),
          Q('m7ac5-b4', 4, 'Q4.', "ΔPQR ৰ PQ = QR। ∠P = 35° হ'লে বাকী দুটা কোণৰ মাপ নিৰ্ণয় কৰা।"),
          Q('m7ac5-b5', 5, 'Q5.', "সমদ্বিবাহু ΔXYZ ৰ ∠Y = ∠Z। ∠X = 78° হ'লে ∠Y ৰ মাপ নিৰ্ণয় কৰা।"),
          Q('m7ac5-b6', 6, 'Q6.', 'দেখুওৱা যে সমবাহু ত্ৰিভুজৰ প্ৰতিটো কোণৰ মাপ 60°।'),
          Q('m7ac5-b7', 7, 'Q7.', 'শুদ্ধ নে অশুদ্ধ লিখা :', { parts: ["(i) এটা সমকোণী ত্ৰিভুজ সমদ্বিবাহুও হ'ব পাৰে।", '(ii) সমবাহু ত্ৰিভুজৰ প্ৰতিটো কোণ সমকোণ।', '(iii) এটা ত্ৰিভুজৰ এডালহে মধ্যমা থাকে।', '(iv) এটা ত্ৰিভুজৰ তিনিডাল উন্নতি থাকে।', "(v) ΔPQR ৰ QX এডাল মধ্যমা হ'লে PR ৰ মধ্যবিন্দু X।", "(vi) এটা ত্ৰিভুজৰ বাহু তিনিটাৰ মাপ 6 ছেমি., 8 ছেমি., 15 ছেমি. হ'ব পাৰে।", "(vii) ত্ৰিভুজৰ দুটা বাহুৰ মাপৰ সমষ্টি তৃতীয় বাহুৰ মাপৰ সমান হ'ব পাৰে।"] })
        ]),
        sec("অনুশীলনী 5(C) (পাইথাগ'ৰাছৰ উপপাদ্য)", 'pythagoras theorem class 7', [
          Q('m7ac5-c1', 1, 'Q1.', 'ABC সমকোণী ত্ৰিভুজৰ ∠B = 90°। যদি AB = 9 ছেমি., BC = 12 ছেমি., তেন্তে AC ৰ মাপ উলিওৱা।'),
          Q('m7ac5-c2', 2, 'Q2.', 'সমকোণী ΔPQR ৰ ∠Q = 90°। যদি PR = 20 ছেমি., PQ = 16 ছেমি., তেন্তে QR ৰ মাপ উলিওৱা।'),
          Q('m7ac5-c3', 3, 'Q3.', 'এটা সমকোণী ত্ৰিভুজৰ অতিভুজৰ দীঘ 13 ছেমি. আৰু আন এটা বাহুৰ দীঘ 12 ছেমি.। তৃতীয়টো বাহুৰ দীঘ উলিওৱা।'),
          Q('m7ac5-c4', 4, 'Q4.', 'তলত এটা ত্ৰিভুজৰ তিনিটা বাহুৰ মাপ দিয়া আছে। ত্ৰিভুজটো সমকোণী হয় নে নহয় পৰীক্ষা কৰা।', { parts: ['(i) 8 ছেমি., 6 ছেমি., 10 ছেমি.', '(ii) 5 ছেমি., 7 ছেমি., 9 ছেমি.'] }),
          Q('m7ac5-c5', 5, 'Q5.', '25 মি. দীঘল ৰছী এডালৰ এটা মূৰ 20 মিটাৰৰ উচ্চতাৰ এটা উলম্ব খুঁটিৰ শীৰ্ষত বান্ধি থোৱা আছে। ৰছীডালৰ আনটো মূৰ মাটিৰ এটা স্থানত সংলগ্ন কৰা আছে যাতে ৰছীডাল পোন হৈ থাকে। খুঁটিটোৰ গুৰিৰ পৰা ৰছীডালৰ মাটিত সংলগ্ন স্থানলৈ দূৰত্ব কিমান?'),
          Q('m7ac5-c6', 6, 'Q6.', "এজন মানুহে এটা অৱস্থানৰ পৰা পূব দিশত 10 মিটাৰৰ দূৰত্ব গৈ উত্তৰমুৱাকৈ ঘূৰি 24 মিটাৰৰ দূৰত্ব গ'ল। আৰম্ভণি আৰু শেষ অৱস্থানৰ মাজৰ দূৰত্ব উলিওৱা।"),
          Q('m7ac5-c7', 7, 'Q7.', 'কাষৰ চিত্ৰত XYZ এটা সমকোণী ত্ৰিভুজ। ∠Y = 90°। যদি XY = YZ আৰু XZ² = 32 ছেমি.² তেন্তে XY ৰ মাপ উলিওৱা।'),
          Q('m7ac5-c8', 8, 'Q8.', 'কাষৰ চিত্ৰত AB আৰু CD দুটা উলম্ব খুঁটি (vertical pole)। ইহঁতৰ উচ্চতা (height) ক্ৰমে 6 মি. আৰু 11 মি.। যদি BD = 12 মি. তেন্তে AC উলিওৱা।', { parts: ['[ইংগিত : AE ⊥ CD অংকন কৰা।]'] })
        ])
      ]
    }
  ]
};
