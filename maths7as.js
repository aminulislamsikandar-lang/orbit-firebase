// Class 7 Mathematics, Assamese medium (textbook "নতুন গণিত", used at Halimon Nessa Academy). Question ids start with m7ac<chapter>- so they never clash with other courses.
// Question text is in Assamese, copied from the textbook exercises (the English line printed under a word problem is not kept). `context` on a chapter is hidden from students and only sent to the AI (notes in English).
// Only the exercises of a chapter are added here (no theory page, no worked examples). Chapters that are not listed yet are not in this book's list in the app.
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
    }
  ]
};
