// Class 6 Mathematics (Composite Mathematics-VI), English medium, Nashib Ali Academy. Question ids start with m6c<chapter>- so they never clash with other courses.
// `context` on a chapter is hidden from students and only sent to the AI (notes in our own words, answer keys for pattern questions).
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
const Q = (id, no, label, text, extra = {}) => ({ id, no, label, text, ...extra });
const sec = (title, video, qs) => ({ title, questions: qs.map(q => ({ video, ...q })) });
const lock = (no, title, kind) => ({ no, title, ...(kind ? { kind } : {}), locked: true, sections: [] });

module.exports = {
  id: 'c6-maths',
  subject: 'Mathematics',
  class: 6,
  chapters: [
    {
      no: 1, title: 'Patterns in Mathematics',
      context: `Chapter notes (Class 6 "Patterns in Mathematics"), in our own words. Use them to answer in simple English.
Whole numbers: natural numbers N = {1, 2, 3, ...}; whole numbers W = {0, 1, 2, 3, ...}. 0 is the smallest whole number and the smallest natural number is 1. Every natural number is a whole number but not every whole number is natural. There is no largest whole number. Between two consecutive whole numbers there is no whole number. 0 has no predecessor in whole numbers, 1 has no predecessor in natural numbers. The number to the right on the number line is greater.
Closure: whole numbers are closed under addition and multiplication; NOT under subtraction (8 - 15 is not a whole number) and NOT under division (8 / 3 is not a whole number).
Commutative: a + b = b + a and a x b = b x a. Subtraction and division are not commutative. Associative: (a + b) + c = a + (b + c) and (a x b) x c = a x (b x c); subtraction and division are not associative.
Identity: additive identity is 0 (a + 0 = a); multiplicative identity is 1 (a x 1 = a). a x 0 = 0. 0 / a = 0 for a not 0. a / a = 1 for a not 0. a / 1 = a. Division by 0 is meaningless.
Distributive property: a x (b + c) = a x b + a x c and a x (b - c) = a x b - a x c. It is used to break a big multiplication into easy parts or to combine like terms (for example 46 x 982 + 27 x 982 - 58 x 982 - 15 x 982 = 982 x (46 + 27 - 58 - 15)). For "suitable arrangement" questions group numbers whose product is easy (like 4 x 25 = 100, 8 x 125 = 1000, 2 x 50 = 100).
Inverse operations: addition and subtraction undo each other (a - b = c means b + c = a); multiplication and division undo each other. Dividend = divisor x quotient + remainder.
Sequences: an arithmetic sequence adds the same number every time; a geometric sequence multiplies by the same number every time. Some patterns use two steps (for example multiply by 4 then divide by 2). Special sequences: even, odd, prime, composite, square (1, 4, 9, 16, ...), cube (1, 8, 27, 64, ...), triangular (1, 3, 6, 10, 15, 21, 28, 36, ...), Virahanka numbers (1, 2, 3, 5, 8, 13, 21, 34, ...).
Patterns in operations: add 9, 99, 999 as adding 10, 100, 1000 and then subtracting 1; multiply by 9, 99, 999 as multiplying by (10 - 1), (100 - 1), (1000 - 1).

Answer keys for pattern questions (work out any other question yourself):
- Test Your Understanding: (1) add 3: 18, 21, 24. (2) subtract 5: 60, 55, 50. (3) divide by 2: 12, 6, 3. (4) divide by 2, then add 2, repeatedly: 24, 26, 13.
- Page 17: 382 + 99999 = 100381 and 2112 + 9999 = 12111. 124 x 9999 = 1239876 and 432 x 99999 = 43199568. Pattern 3 next two steps: 11111 x 11111 = 123454321 and 111111 x 111111 = 12345654321. Pattern 4 next two steps: 12345 x 9 + 5 = 111110 and 123456 x 9 + 6 = 1111110.
- Page 22 Q3 (i): the triangular numbers in the list are 3, 6, 10, 28, 36 (the list in the photo was a little blurry). (ii) 6 (it can be a line, a 2 x 3 rectangle and a triangle). (iii) 36 is both a square number and a triangular number (1 also is).
- Page 22 Q4: sums of consecutive triangular numbers: 1 + 3 = 4, 3 + 6 = 9, 6 + 10 = 16, 10 + 15 = 25: they give the square numbers.
- Page 22 Q5: 1 = 1, 1 + 7 = 8, 1 + 7 + 19 = 27, 1 + 7 + 19 + 37 = 64: they give the cube numbers.
- Page 22 Q6: (i) 12345 x 8 + 5 = 98765, 123456 x 8 + 6 = 987654. (ii) 21438 x 100001 = 2143821438, 758321 x 1000001 = 758321758321 (the number is written twice). (iii) 64 x 625 = 64 x 10000/16 = 40000, 64 x 3125 = 64 x 100000/32 = 200000 (5 = 10/2, 25 = 100/4, 125 = 1000/8, 625 = 10000/16, 3125 = 100000/32).`,
      sections: [
        sec('Exercise 1 (A) (page 2)', 'whole numbers natural numbers predecessor successor class 6', [
          Q('m6c1-a1', 1, 'A1.', 'Fill in the blanks:', { parts: ['(i) The smallest natural number is ........ .', '(ii) The predecessor of 100 is ........ .', '(iii) The successor of 0 is ........ .', '(iv) Every whole number on the number line is ........ than every whole number on its right.', '(v) Every natural number is a ........ number.'] }),
          Q('m6c1-a2', 2, 'A2.', 'Write three consecutive successors of 999.'),
          Q('m6c1-a3', 3, 'A3.', 'Write three consecutive predecessors of 2001.'),
          Q('m6c1-a4', 4, 'A4.', 'In each of the following pairs of numbers, state which is greater.', { parts: ['(i) 740, 704', '(ii) 860, 86', '(iii) 7382, 7283', '(iv) 800139, 8006139'] }),
          Q('m6c1-a5', 5, 'A5.', 'Answer True (T) or False (F):', { parts: ['(i) All whole numbers are natural numbers.', '(ii) Every whole number has its predecessor.', '(iii) Zero is the smallest whole number.', '(iv) The predecessor of every two-digit number is a single-digit number.', '(v) Between any two non-consecutive whole numbers, there lies a whole number.'] }),
          Q('m6c1-a6', 6, 'A6.', 'MCQ: How many times does the digit 2 occur between 1 and 100 ?', { options: ['(a) 10', '(b) 9', '(c) 12', '(d) 20'] }),
          Q('m6c1-a7', 7, 'A7.', 'MCQ: Which of the following natural numbers does not have a predecessor ?', { options: ['(a) 2', '(b) 1', '(c) 3', '(d) 1000'] }),
          Q('m6c1-a8', 8, 'A8.', 'HOTS: Given two whole numbers a and b, which of the following may not always be whole numbers.', { options: ['(a) a + b', '(b) a − b', '(c) a × b', '(d) 2a + b'] })
        ]),
        sec('Exercise 1 (B) (page 4)', 'properties of addition whole numbers class 6', [
          Q('m6c1-b1', 1, 'B1.', 'Fill in the blanks to make each of the following a true statement.', { parts: ['(i) 529 + ........ = 398 + 529', '(ii) 0 + 815 = ........', '(iii) 10,000 + ........ = 10,000', '(iv) 12 + 47 + 88 = 100 + ........', '(v) 39 + (201 + 18) = (39 + 201) + ........'] }),
          Q('m6c1-b2', 2, 'B2.', 'Find the sums:', { parts: ['(i) 217 + 483', '(ii) 483 + 217', 'Are they same ? Which property of addition do they show ?'] }),
          Q('m6c1-b3', 3, 'B3.', 'Find each sum:', { parts: ['(i) (39208 + 392) + 726', '(ii) 39208 + (392 + 726)', 'Are they equal ? Which property of addition do they show ?'] }),
          Q('m6c1-b4', 4, 'B4.', 'MCQ: A student wrote 5 + 24 + 25 + 6 = 5 + 25 + 24 + 6. Which property of addition did he use ?', { options: ['(a) Closure property', '(b) Commutative property', '(c) Associative property', '(d) Property of zero'] }),
          Q('m6c1-b5', 5, 'B5.', 'MCQ: 18 + (82 + 8) = (18 + 82) + 8 is an example of:', { options: ['(a) Closure property', '(b) Commutative property', '(c) Property of zero', '(d) Associative property'] }),
          Q('m6c1-b6', 6, 'B6.', "HOTS: Find a whole number 'p' such that p + p = p.")
        ]),
        sec('Exercise 1 (C) (page 6)', 'subtraction of whole numbers properties class 6', [
          Q('m6c1-c1', 1, 'C1.', 'For each addition sentence, write two subtraction sentences:', { parts: ['(i) 8 + 17 = 25', '(ii) 75 + 59 = 134', '(iii) 101 + 278 = 379'] }),
          Q('m6c1-c2', 2, 'C2.', 'Perform the following subtractions and check your result by corresponding addition:', { parts: ['(i) 13407 − 10999', '(ii) 100000 − 95673', '(iii) 3030301 − 676767', '(iv) 80093000 − 989996'] }),
          Q('m6c1-c3', 3, 'C3.', 'Sheela brought a Hindi novel from the library which had 378 pages. She read 152 pages on the first two days. If she read 79 pages on the third day, how many pages would remain unread ?'),
          Q('m6c1-c4', 4, 'C4.', 'MCQ: Find the difference between the largest number of 5 digits and the smallest number of 6 digits.', { options: ['(a) 0', '(b) 11111', '(c) 1', '(d) 10000'] }),
          Q('m6c1-c5', 5, 'C5.', 'MCQ: The population of a village is 1500. If 489 are men and 472 are women, find the number of children.', { options: ['(a) 549', '(b) 439', '(c) 559', '(d) 539'] })
        ]),
        sec('Exercise 1 (D) (page 10)', 'properties of multiplication distributive property class 6', [
          Q('m6c1-d1', 1, 'D1.', 'Fill in the blanks with a whole number to make each of the following a true statement.', { parts: ['(i) 23987 × 0 = ........', '(ii) 59083 × 1 = ........', '(iii) 879 × 56 = 56 × ........', '(iv) 100 × 100 × ........ = 100000', '(v) 27 × 98 × 35 = 35 × ........ × 27', '(vi) 87 × 19 = 19 × (80 + ........)', '(vii) 205 × 69 = 69 × 200 + 69 × ........'] }),
          Q('m6c1-d2', 2, 'D2.', 'Fill in the blanks:', { parts: ['(i) 56 × 39 = 56 × 30 + 56 × ........', '(ii) 37 × 19 = 37 × 10 + 37 × 5 + 37 × ........', '(iii) 18 × 47 = 18 × 50 − 18 × ........', '(iv) 76 × 88 = 76 × 90 − 76 × ........'] }),
          Q('m6c1-d3', 3, 'D3.', 'What number should replace each n ?', { parts: ['(i) 3 (n + 6) = (3 × 5) + (3 × 6)', '(ii) (7 × 4) + (n × 3) = 7 (4 + 3)', '(iii) (9 × 8) + (8 × 8) = (9 + 8) n'] }),
          Q('m6c1-d4', 4, 'D4.', 'Multiply by suitable arrangement:', { parts: ['(i) 20, 5, 8, 7', '(ii) 25, 4, 598', '(iii) 4, 2893, 250', '(iv) 2, 2867, 50', '(v) 8, 786, 125', '(vi) 3982, 625, 16', '(vii) 394, 5, 80', '(viii) 15, 8, 40, 225', '(ix) 16, 80, 25 and 15237  [Hint. Product = [(80 × 25) × 15237] × 16]'] }),
          Q('m6c1-d5', 5, 'D5.', 'Find each of the following products by using properties of multiplication:', { parts: ['(i) 972 × 8 + 972 × 2', '(ii) 46 × 982 + 27 × 982 − 58 × 982 − 15 × 982', '(iii) 957 × 10 × 583 − 483 × 9570  [Hint. Product = 9570 × 583 − 483 × 9570]'] }),
          Q('m6c1-d6', 6, 'D6.', 'Using properties of addition and multiplication, find each of the following products:', { parts: ['(i) 928 × 857  [Hint. 928 × 857 = (900 + 20 + 8) × 857]', '(ii) 3046 × 729', '(iii) 849 × 205', '(iv) 367 × 10004'] }),
          Q('m6c1-d7', 7, 'D7.', 'MCQ: The multiplicative identity for the set of whole numbers is', { options: ['(a) 0', '(b) 2', '(c) 1', '(d) Does not exist.'] }),
          Q('m6c1-d8', 8, 'D8.', 'MCQ: Which expression does not have the same value as the expression 8 × (5 + 36) ?', { options: ['(a) 8 × 41', '(b) 8 × 5 + 8 × 36', '(c) 8 × 5 + 36', '(d) 40 + 8 × 36'] }),
          Q('m6c1-d9', 9, 'D9.', 'MCQ: The value of 300 × 4 × 0 × 10 is', { options: ['(a) 1200', '(b) 12000', '(c) 120000', '(d) 0'] }),
          Q('m6c1-d10', 10, 'D10.', 'MCQ: 473 × 23 = (473 × 20) + (473 × 3). This mathematical sentence represents:', { options: ['(a) Commutative property of multiplication', '(b) Associative property of multiplication', '(c) Distributive property of addition over multiplication', '(d) Distributive property of multiplication over addition.'] })
        ]),
        sec('Exercise 1 (E) (page 12)', 'division of whole numbers properties class 6', [
          Q('m6c1-e1', 1, 'E1.', 'Find the value of each of the following:', { parts: ['(i) 0 ÷ 39', '(ii) 0 ÷ 975', '(iii) 5 ÷ 5', '(iv) 701 − (1869 ÷ 1869)', '(v) (3278 ÷ 3278) − (5098 ÷ 5098)'] }),
          Q('m6c1-e2', 2, 'E2.', 'Replace the letter by a suitable numeral to make a true statement:', { parts: ['(i) 0 ÷ b = 0', '(ii) 48 ÷ 48 = n', '(iii) p ÷ 7 = 0', '(iv) m ÷ 708 = 0'] }),
          Q('m6c1-e3', 3, 'E3.', 'Answer true or false:', { parts: ['(i) Every multiplication fact for two distinct non-zero whole numbers gives two corresponding division facts.', '(ii) There are no distinct whole numbers a, b and c such that a ÷ (b ÷ c) = (a ÷ b) ÷ c.', '(iii) If a whole number p is divided by another whole number q and q > p, then p ÷ q is a whole number.', '(iv) Any non-zero whole number divided by itself gives the quotient 1.'] }),
          Q('m6c1-e4', 4, 'E4.', 'What must 789 be multiplied by to give 78,97,890 ?'),
          Q('m6c1-e5', 5, 'E5.', 'MCQ: In a sum, the divisor is 173, the quotient is 2,544 and the remainder is 60. What is the dividend ?', { options: ['(a) 12924', '(b) 440172', '(c) 152813', '(d) 172544'] }),
          Q('m6c1-e6', 6, 'E6.', 'MCQ: A cinema hall is to be constructed in which each row must have 36 seats. Determine the minimum number of rows required to seat 600 persons at a time.', { options: ['(a) 18', '(b) 17', '(c) 20', '(d) 18'] })
        ]),
        sec('Test Your Understanding (page 14)', 'number sequences patterns class 6', [
          Q('m6c1-t1', 1, 'T1.', 'Identify the rule for forming the following number sequences and then write the next three numbers in each of these sequences.', { parts: ['1. 3, 6, 9, 12, 15, ........', '2. 80, 75, 70, 65, ........', '3. 192, 96, 48, 24, ........', '4. 180, 90, 92, 46, 48, ........'] })
        ]),
        sec('Patterns in operations (page 17)', 'patterns in operations whole numbers class 6', [
          Q('m6c1-p1', 1, 'P1.', 'Pattern 1 (Addition): 125 + 9 = 125 + (10 − 1) = 135 − 1 = 134; 125 + 99 = 125 + (100 − 1) = 225 − 1 = 224; 125 + 999 = 125 + (1000 − 1) = 1125 − 1 = 1124; 125 + 9999 = 125 + (10000 − 1) = 10125 − 1 = 10124. Find:', { parts: ['(i) 382 + 99999', '(ii) 2112 + 9999'] }),
          Q('m6c1-p2', 2, 'P2.', 'Pattern 2 (Multiplication): 65 × 9 = 65 × (10 − 1); 65 × 99 = 65 × (100 − 1); 65 × 999 = 65 × (1000 − 1) and so on. Find:', { parts: ['(i) 124 × 9999', '(ii) 432 × 99999'] }),
          Q('m6c1-p3', 3, 'P3.', 'Pattern 3 (Multiplication): 1 × 1 = 1; 11 × 11 = 121; 111 × 111 = 12321; 1111 × 1111 = 1234321. Write the next two steps.'),
          Q('m6c1-p4', 4, 'P4.', 'Pattern 4 (Combination of addition and multiplication): 1 × 9 + 1 = 10; 12 × 9 + 2 = 110; 123 × 9 + 3 = 1110; 1234 × 9 + 4 = 11110. Write the next two steps.')
        ]),
        sec('Pattern questions (page 22)', 'triangular numbers square numbers patterns class 6', [
          Q('m6c1-q3', 3, 'Q3.', '', { parts: ['(i) Which of the following numbers are triangular numbers ?  2, 3, 4, 5, 6, 9, 10, 25, 27, 28, 35, 36', '(ii) Which is the smallest number that can be shown as a line, rectangle and triangle ?', '(iii) Which number can be shown both as a square and a triangular number ? Draw figures with dots illustrating this fact.'] }),
          Q('m6c1-q4', 4, 'Q4.', 'What happens when you add pairs of consecutive triangular numbers ? What sequence do you get ? Show with figures. (NCERT)', { parts: ['1 + 3 = ........', '3 + 6 = ........', '6 + 10 = ........', '10 + 15 = ........'] }),
          Q('m6c1-q5', 5, 'Q5.', 'What happens when you add hexagonal numbers as given below. What sequence do you get ? Draw cubes to show each number. (NCERT)', { parts: ['1 = ........', '1 + 7 = ........', '1 + 7 + 19 = ........', '1 + 7 + 19 + 37 = ........'] }),
          Q('m6c1-q6', 6, 'Q6.', 'Write the next two steps of each of the given patterns. Can you say how the pattern works ?', { parts: ['(i) 1 × 8 + 1 = 9; 12 × 8 + 2 = 98; 123 × 8 + 3 = 987; 1234 × 8 + 4 = 9876; 12345 × 8 + 5 = ........; 123456 × 8 + 6 = ........', '(ii) 7 × 11 = 77; 63 × 101 = 6363; 234 × 1001 = 234234; 4189 × 10001 = 41894189; 21438 × 100001 = ........; 758321 × 1000001 = ........', '(iii) 64 × 5 = 64 × 10/2 = 320; 64 × 25 = 64 × 100/4 = 1600; 64 × 125 = 64 × 1000/8 = 8000; 64 × 625 = ........ = ........; 64 × 3125 = ........ = ........'] })
        ]),
        sec('Mental Maths (page 23)', 'mental maths whole numbers class 6', [
          Q('m6c1-mm1', 1, 'MM1.', 'Fill in the blanks:', { parts: ['1. 537 × 15 = ........ × 537', '2. 39 × 0 = ........', '3. 86 − 42 = 42 − 86. True or False', '4. 0 × 0 = ........', '5. 0 ÷ 38 = ........', '6. 29 ÷ 29 = ........', '7. 28 × 59 = 59 × 28. Name the property.', '8. 7 × (3 + 5) = 7 × 3 + 7 × ........', '9. 259 × 75 = 259 × (70 + ........)'] })
        ]),
        sec('Chapter Assessment (pages 23-24)', 'whole numbers chapter assessment class 6', [
          Q('m6c1-ca1', 1, 'CA1.', 'Fill in the blanks:', { parts: ['(i) The additive identity for whole numbers is ........ .', '(ii) The whole number which cannot be used as a divisor is ........ .', '(iii) The difference of two whole numbers need not be a whole number. Thus, the ........ property does not hold good in subtraction of whole numbers.', '(iv) The value of 175 × 215 − 175 × 115 is ........ .', '(v) Whole numbers are not commutative under ........ and ........ .'] }),
          Q('m6c1-ca2', 2, 'CA2.', 'Answer True (T) and False (F):', { parts: ['(i) 16 × 10 − 16 × 3 = (16 − 3) × 10', '(ii) If 21 + x = 15, then x = 21 − 15', '(iii) If y ÷ 7 = 0, then y = 0', '(iv) a × (b + c) = (a + b) × (a + c)', '(v) Multiplication distributes over subtraction.'] }),
          Q('m6c1-ca3', 3, 'CA3.', 'Assertion (A) and Reason (R) type question: Read both the statements given below and choose the correct option. Assertion (A): The smallest whole number does not have a predecessor in the set of whole numbers. Reason (R): 1 is a whole number.', { options: ['(i) Both Assertion (A) and Reason (R) are true and Reason (R) is correct explanation of Assertion (A).', '(ii) Both Assertion (A) and Reason (R) are true but Reason (R) is not correct explanation of Assertion (A).', '(iii) Assertion (A) is true but Reason (R) is false.', '(iv) Assertion (A) is false but Reason (R) is true.'] }),
          Q('m6c1-ca4', 4, 'CA4.', 'MCQ: Which of the following will not represent zero ?', { options: ['(i) 1 ÷ 0', '(ii) 0 × 0', '(iii) 0/2', '(iv) (10 − 10)/2'] }),
          Q('m6c1-ca5', 5, 'CA5.', 'MCQ: The product 5 × 476 × 20 × 10 is', { options: ['(i) 47600', '(ii) 95200', '(iii) 476000', '(iv) 952000'] }),
          Q('m6c1-ca6', 6, 'CA6.', 'MCQ: Which of the following statements is not true for three whole numbers a, b and c ?', { options: ['(i) a + (b + c) = (a + b) + c', '(ii) a × (b + c) = (a × b) + (a × c)', '(iii) a ÷ (b ÷ c) = (a ÷ b) ÷ c', '(iv) (a × b) × c = a × (b × c)'] }),
          Q('m6c1-ca7', 7, 'CA7.', 'MCQ: Manisha makes 8 gift packs containing biscuits for Diwali. She puts 12 chocolate biscuits, 14 coconut biscuits and 8 butter cookies in each pack. With the help of which property, can you calculate the total number of biscuits in 8 packs ?', { options: ['(i) Commutative property', '(ii) Associative property', '(iii) Distributive property', '(iv) None of these.'] }),
          Q('m6c1-ca8', 8, 'CA8.', 'MCQ: On dividing a number by 68, we get 269 as quotient and 0 as remainder. On dividing the same number by 67, what will be the remainder ?', { options: ['(i) 0', '(ii) 1', '(iii) 2', '(iv) 3'] }),
          Q('m6c1-ca9', 9, 'CA9.', 'MCQ: Find the sum: 837 + 300 + 363', { options: ['(i) 1400', '(ii) 1600', '(iii) 1500', '(iv) 450'] }),
          Q('m6c1-ca10', 10, 'CA10.', 'MCQ: Which whole number a does not satisfy the relation a ÷ a = 1 ?', { options: ['(i) 1', '(ii) 5', '(iii) 0', '(iv) 100'] }),
          Q('m6c1-ca11', 11, 'CA11.', 'HOTS: Use simple methods to compute the following. Show the steps involved.', { parts: ['(i) 9 + 99 + 999 + 9999', '(ii) 333 × 222 ÷ 666'] })
        ])
      ]
    },
    lock(2, 'Lines and Angles'),
    lock(3, 'Number Play'),
    lock(4, 'Data Handling and Presentation'),
    lock(5, 'Prime Time'),
    lock(6, 'Perimeter and Area'),
    lock(7, 'Fractions'),
    lock(8, 'Playing with Constructions'),
    lock(9, 'Symmetry (Reflection and Rotation)'),
    lock(10, 'The Other Side of Zero (Negative Numbers and Integers)'),
    lock(11, 'Decimals', 'Optional chapter'),
    lock(12, 'Introduction to Algebra', 'Optional chapter'),
    lock(13, 'Ratio, Proportion and Unitary Method', 'Optional chapter'),
    lock(14, 'Plane Figures', 'Optional chapter'),
    lock(15, 'Three Dimensional Shapes', 'Optional chapter')
  ]
};
