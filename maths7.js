// Class 7 Mathematics (Composite Mathematics-VII). Question ids start with m7c<chapter>- so they never clash with other courses.
// `context` on a chapter is hidden from students and only sent to the AI (notes in our own words, textbook figures, answer keys).
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
const Q = (id, no, label, text, extra = {}) => ({ id, no, label, text, ...extra });
const sec = (title, video, qs) => ({ title, questions: qs.map(q => ({ video, ...q })) });

module.exports = {
  id: 'c7-maths',
  subject: 'Mathematics',
  class: 7,
  chapters: [
    {
      no: 1, title: 'Integers', kind: 'Unit 1 · Number System',
      context: `Chapter notes (Class 7 Integers): The set of integers Z = {..., -3, -2, -1, 0, 1, 2, 3, ...}. Zero is neither positive nor negative. Absolute value |a| is the numerical value of a without its sign. Predecessor = one less, successor = one more. On the number line the number on the right is greater; every positive integer is greater than every negative integer and 0.
Addition: like signs -> add the absolute values and keep the sign; unlike signs -> subtract the smaller absolute value from the larger and keep the sign of the larger. Subtraction: a - b = a + (-b). Multiplication and division: like signs give a positive result, unlike signs give a negative result; anything times 0 is 0; division by zero is not allowed; 0 divided by a non-zero integer is 0.
Properties: integers are closed under addition, subtraction and multiplication but NOT under division. Addition and multiplication are commutative and associative; subtraction and division are not. Additive identity is 0 and multiplicative identity is 1 (there is no identity for subtraction or division). Additive inverse of a is -a. Distributive property: a x (b + c) = a x b + a x c and a x (b - c) = a x b - a x c. (-1) raised to an even power is 1 and to an odd power is -1.
BODMAS: simplify brackets first in the order ( ), { }, [ ]; then 'of', division, multiplication, addition, subtraction. 'of' means multiplication.`,
      sections: [
        sec('Exercise 1 (A) (pages 3-4)', 'integers class 7 comparison addition subtraction', [
          Q('m7c1-a1', 1, 'A1.', 'Fill in the blanks:', { parts: ['(i) The greatest negative integer is ........ .', '(ii) 0 is greater than every ........ integer.', '(iii) The absolute value of an integer is either ........ or ........ than the integer, but never ........ than the integer.', '(iv) The successor of –91 is ........ .', '(v) The predecessor of –380 is ........ .'] }),
          Q('m7c1-a2', 2, 'A2.', 'Replace each blank by < or > to make the given statement true:', { parts: ['(i) –8 ........ –18', '(ii) –4 ........ 0', '(iii) –357 ........ –537', '(iv) –71 ........ 17'] }),
          Q('m7c1-a3', 3, 'A3.', '', { parts: ['(i) Arrange the following integers in ascending order: –8, –4, 0, –11, 9, 4, 6, 13, –27, 19', '(ii) Arrange the following integers in descending order: –6, –11, 12, –32, –23, 14, 0, 32, 16, –19, –18'] }),
          Q('m7c1-a4', 4, 'A4.', 'Add:', { parts: ['(i) –18, 14', '(ii) –26, –3', '(iii) 46, –46', '(iv) 400, –31, –71', '(v) –613, –421, –700'] }),
          Q('m7c1-a5', 5, 'A5.', 'Subtract the first integer from the second in each case:', { parts: ['(i) 6, 18', '(ii) –3, 6', '(iii) –27, –54', '(iv) 12, –7'] }),
          Q('m7c1-a6', 6, 'A6.', 'Find the value of:', { parts: ['(i) –37 – (–15) – 2', '(ii) 16 – [14 – (–2) – (–6)]'] }),
          Q('m7c1-a7', 7, 'A7.', 'Using >, < or =, fill in the boxes to make each statement true:', { parts: ['(i) (–1) + (–5) [ ] (–7) – (–5)', '(ii) 42 – 35 + 12 [ ] 42 – 35 – 12', '(iii) 6 – (–2) + 5 [ ] –1 – (–2) – 3', '(iv) –135 + 64 + 41 [ ] –159 – (–81) + 160'] }),
          Q('m7c1-a8', 8, 'A8.', 'MCQ: Which of the following on simplification is not negative?', { options: ['(a) –8 – (–4) + 5', '(b) 7 + (–11) – 5', '(c) –4 – 2 + (–8)', '(d) –10 – (–2) + 4'] }),
          Q('m7c1-a9', 9, 'A9.', "MCQ: In a quiz, positive marks were given for correct answers and negative marks for incorrect answers. If Rishi's scores in six successive rounds were 30, –10, –12, –5, –15, 20, what is his total score at the end?", { options: ['(a) –12', '(b) 8', '(c) –8', '(d) 12'] }),
          Q('m7c1-a10', 10, 'A10.', 'HOTS: What is the value of 0 – 1 + 2 – 3 + 4 – 5 + 6 – 7 + ... + 16 – 17 + 18 – 19 + 20 ?')
        ]),
        sec('Exercise 1 (B) (pages 6-7)', 'multiplication of integers class 7', [
          Q('m7c1-b1', 1, 'B1.', 'Find each of the following products:', { parts: ['(i) 7 × 3', '(ii) –7 × 3', '(iii) 7 × –3', '(iv) –7 × –3', '(v) –4 × 4', '(vi) 8 × –9', '(vii) –17 × 0', '(viii) –24 × –5', '(ix) –845 × 12', '(x) 500 × –19'] }),
          Q('m7c1-b2', 2, 'B2.', 'Simplify:', { parts: ['(i) –4 × –2 × 1', '(ii) –5 × –6 × –1', '(iii) –15 × –8 × –283 × 0', '(iv) –14 × –5 × –8', '(v) –17 × –15 × –12', '(vi) –7 × 29 × –8 × 0', '(vii) –48 × 20 × –1 × –5', '(viii) (1/12) × –9 × 4 × –1', '(ix) (–2/5) × 25 × 238'] }),
          Q('m7c1-b3', 3, 'B3.', 'Fill in the blanks:', { parts: ['(i) The product of ........ and (–1) is –35.', '(ii) ........ × (–8) = 96.', '(iii) The sign of the product of 8 negative integers and 1 positive integer is ........ .', '(iv) –7 × 29 × 0 × –8 = ........ .'] }),
          Q('m7c1-b4', 4, 'B4.', 'State which is greater:', { parts: ['(i) (7 + 8) × 9 or 7 + (8 × 9)', '(ii) (7 – 8) × 9 or 7 – (8 × 9)', '(iii) (–7 – 8) × 9 or 7 – (–8 × –9)'] }),
          Q('m7c1-b5', 5, 'B5.', 'Use the number line to work out:', { parts: ['(i) –4 × 3', '(ii) 5 × –2'] }),
          Q('m7c1-b6', 6, 'B6.', 'The temperature of a certain place fell by 2°C (a change of –2°C) each day for a week. What is the change of temperature over the whole week?'),
          Q('m7c1-b7', 7, 'B7.', 'For each of the following statements write a true (T) or false (F):', { parts: ['(i) The product of three negative integers is a negative integer.', '(ii) Of the two integers, if one is negative, then their product must be negative.', '(iii) The product of a negative and a positive integer may be zero.', '(iv) If a > 1, then there is no integer b such that a × b = b × a = b.'] }),
          Q('m7c1-b8', 8, 'B8.', 'MCQ: Which of the following expressions are equal to –20 ?', { parts: ['I  –4 × 5', 'II  –32 + 10 – (–2)', 'III  –6 × 2 – [–2 × –4]', 'IV  5 × (–2) + (–3) × 4'], options: ['(a) I only', '(b) I and II', '(c) I, II and III', '(d) I, II, III and IV'] }),
          Q('m7c1-b9', 9, 'B9.', 'MCQ: A certain freezing process requires that room temperature be lowered from 40°C at the rate of 5°C every hour. What will be the room temperature 10 hours after the process begins?', { options: ['(a) –10°C', '(b) 10°C', '(c) 20°C', '(d) –5°C'] }),
          Q('m7c1-b10', 10, 'B10.', 'HOTS: Use < or > to compare –2 × (–1) × 4 × 2 × (–3) and (–2) + (–1) + 4 + 2 – (–3).')
        ]),
        sec('Exercise 1 (C) (page 9)', 'division of integers class 7', [
          Q('m7c1-c1', 1, 'C1.', 'Find:', { parts: ['(i) –6 ÷ 2', '(ii) 8 ÷ (–4)', '(iii) (–57) ÷ (–19)', '(iv) (23) ÷ (–23)', '(v) 17 ÷ [(–6) + 5]', '(vi) [18 + (–18)] ÷ (–20)', '(vii) [–30 – (–18)] ÷ [19 + (–13)]', '(viii) [90 ÷ (–5)] ÷ [(–81) ÷ (–9)]', '(ix) [400 × (–20)] ÷ [(–250) × (–8)]', '(x) [–155 + (–100)] ÷ [–300 + 45]'] }),
          Q('m7c1-c2', 2, 'C2.', 'Write true (T) or false (F) for the following statements:', { parts: ['(i) 0 ÷ (–8) = 0', '(ii) (–25) ÷ 0 = 0', '(iii) (–54) ÷ (–9) = –6', '(iv) 19 ÷ (–1) = –19', '(v) (–59) ÷ (–1) = –59', '(vi) (36) ÷ (–4) = 9'] }),
          Q('m7c1-c3', 3, 'C3.', 'MCQ: Evaluate [(–48) ÷ 16] ÷ 3', { options: ['(a) 1', '(b) –9', '(c) 9', '(d) –1'] }),
          Q('m7c1-c4', 4, 'C4.', 'MCQ: Which has the greatest quotient?', { options: ['(a) –20 ÷ –5', '(b) –20 ÷ 5', '(c) 20 ÷ –4', '(d) 20 ÷ 4'] }),
          Q('m7c1-c5', 5, 'C5.', 'MCQ: The temperature at noon at a certain place was 12 degrees above zero. If it decreases at the rate of 2 degrees per hour until midnight, at what time would it be 10 degrees below zero?', { options: ['(a) 2 p.m.', '(b) 11 p.m.', '(c) 12 midnight', '(d) 10 p.m.'] }),
          Q('m7c1-c6', 6, 'C6.', 'HOTS: Use the given number line to find the sign of the quotient (a – b) / ab. (On the number line, b is to the left of 0 and a is to the right of 0.) [Hint. a is +ve, b is –ve]')
        ]),
        sec('Exercise 1 (D) (pages 13-14)', 'properties of integers class 7', [
          Q('m7c1-d1', 1, 'D1.', 'Fill in the blanks and name the property used:', { parts: ['(i) 11 + ........ = (–27) + 11', '(ii) 45 + 21 = ........ + 45', '(iii) 8 × 4 = 4 × ........', '(iv) ........ × (–6) = (–6) × 12', '(v) [21 + 19] + (–32) = ........ + [19 + (–32)]', '(vi) 43 + [(–10) + 7] = [43 + ........] + 7', '(vii) [12 × 39] × (–4) = 12 × [........ × –4]', '(viii) ........ × [16 × 26] = [(–57) × 16] × ........', '(ix) 127 × [25 + ........] = 127 × 25 + 127 × 5', '(x) (–11) × (........) = (–11) × 9 + (–11) × 1'] }),
          Q('m7c1-d2', 2, 'D2.', 'Is subtraction of integers commutative ? Give an example to support your answer.'),
          Q('m7c1-d3', 3, 'D3.', 'Find the value of:', { parts: ['(i) 8792 × 997 – (792 × 997)', '(ii) –295 × –66 + (–295) × (–34)', '(iii) 65129 × 99 – (–65129)', '(iv) (–70) × (10 – 8 – 39 + 107)'] }),
          Q('m7c1-d4', 4, 'D4.', 'Name the additive inverse of:', { parts: ['(i) 15', '(ii) –23', '(iii) 0'] }),
          Q('m7c1-d5', 5, 'D5.', 'Verify and also name the property used:', { parts: ['(i) (–445) + 315 = 315 + (–445)', '(ii) 17 × (–12) = (–12) × 17', '(iii) [64 + (–40)] + 16 = 64 + [(–40) + 16]', '(iv) 20 × [5 × (–16)] = (20 × 5) × (–16)', '(v) 18 × [100 + (–5)] = 18 × 100 + 18 × (–5)', '(vi) (–20) × [(–3) + 9] = (–20) × (–3) + (–20) × 9'] }),
          Q('m7c1-d6', 6, 'D6.', 'Find the product using suitable properties:', { parts: ['(i) (–48) × 105', '(ii) 62 × 199', '(iii) 115 × (–98)', '(iv) 325 × (–204)'] }),
          Q('m7c1-d7', 7, 'D7.', 'Fill in the blanks:', { parts: ['(i) (–63) + ........ = (–63)', '(ii) 14 + ........ = 0', '(iii) 117 × ........ = 117', '(iv) ........ ÷ (–75) = 0', '(v) ........ × 1 = 729'] }),
          Q('m7c1-d8', 8, 'D8.', 'Is division of integers closed ? Give an example to support your answer.'),
          Q('m7c1-d9', 9, 'D9.', 'State whether the statement is true (T) or false (F):', { parts: ['(i) The smallest positive integer is 1.', '(ii) The identity element for addition in integers is 1.', '(iii) The additive inverse of zero is the number itself.', '(iv) When two negative integers are multiplied, the product is also negative.', '(v) (14 – 3) – 8 = 14 – (3 – 8)'] }),
          Q('m7c1-d10', 10, 'D10.', 'MCQ: The set of integers is not closed under', { options: ['(a) Addition', '(b) Subtraction', '(c) Multiplication', '(d) Division'] }),
          Q('m7c1-d11', 11, 'D11.', 'MCQ: 1763 × (–2) + (–1763) × 98 =', { options: ['(a) 176300', '(b) 169248', '(c) –176300', '(d) –169248'] }),
          Q('m7c1-d12', 12, 'D12.', 'MCQ: Evaluate (–6 + 34) ÷ (–14) + 2', { options: ['(a) 4', '(b) 0', '(c) –2', '(d) –1'] }),
          Q('m7c1-d13', 13, 'D13.', 'HOTS: Simplify:', { parts: ['(a) 25 – [20 – {8 ÷ 4 – (15 – 25 ÷ 5) ÷ 2}]', '(b) 45 ÷ {8 – (–2 of 5 + 3)}'] })
        ]),
        sec('Exercise 1 (E) (pages 15-16)', 'word problems on integers class 7', [
          Q('m7c1-e1', 1, 'E1.', 'The temperature of the fridge compartment of a refrigerator is set at 8°C. The freezer compartment is set at –10°C. What is the difference between these temperature settings ?'),
          Q('m7c1-e2', 2, 'E2.', 'A car moves 17 km north from a point A and then moves 14 km towards south along the same road. If the distance towards north is represented by a positive integer, then how will you represent the distance towards south. By which integer will you represent its final position from A ? (Fig. Q.2: the car starts at A, goes 17 km north to B, then 14 km south to C.)'),
          Q('m7c1-e3', 3, 'E3.', 'Reena climbs up 5 stairs every second and then climbs down 2 stairs over the next second. How many seconds will she take to climb 60 stairs ?'),
          Q('m7c1-e4', 4, 'E4.', 'Start with the integer –8. Add –12 to it, subtract 10 from the result. Divide the result by +3 and multiply the answer by –2. What do you get ?'),
          Q('m7c1-e5', 5, 'E5.', 'Arnav had ₹ 20 with him. He spent ₹ 8 on Monday, got ₹ 5 as pocket money on Tuesday, gave ₹ 7 loan to a friend on Wednesday, ate an icecream worth ₹ 10 on Thursday, received a reward of ₹ 5 from his grandfather on Friday. How much does he have on Sunday, if his friend repays the loan on Saturday ?'),
          Q('m7c1-e6', 6, 'E6.', 'A submarine left the surface of the water at the rate of –2 metres per second. At that rate, how long would it take the submarine to reach –60 meters level.'),
          Q('m7c1-e7', 7, 'E7.', 'MCQ: The deep freezer of a sweet shop should be set at –12°C. It is set at –18°C by mistake. What is the difference between these temperature settings ?', { options: ['(a) 30°C', '(b) –6°C', '(c) 6°C', '(d) 30°C'] }),
          Q('m7c1-e8', 8, 'E8.', 'MCQ: A hiker is descending 152 m every 8 minutes. What will be hikers change in elevation in half an hour ? Write as an integer.', { options: ['(a) –4560 m', '(b) –76 m', '(c) –570 m', '(d) –1216 m'] }),
          Q('m7c1-e9', 9, 'E9.', 'MCQ: In a test, (+4) marks are given for every correct answer and (–2) marks for every wrong answer. Rohit answered all the questions and scored 68 marks. 25 of Rohit\'s answers were correct. How many of the questions he attempted were incorrect ?', { options: ['(a) 22', '(b) 5', '(c) 16', '(d) 8'] }),
          Q('m7c1-e10', 10, 'E10.', 'HOTS: Mt. Everest is at a height of 8850 m. Its base is at an elevation of 5400 m. The temperature here drops at the rate of 1 degree per 100 metres. If the temperature at the base is –5°C, what is the temperature at the top ? [Hint. Temperature at base is more than temperature at top]')
        ]),
        sec('Mental Maths (page 17)', 'integers class 7 mental maths', [
          Q('m7c1-mm1', 1, 'M1.', 'Work out:', { parts: ['1. 48 ÷ (–16)', '2. 0 ÷ 2000', '3. (–9) × (–25) × (–4) × (–2)', '4. |45 + (–65)|', '5. (–22 – 8) ÷ 6'] }),
          Q('m7c1-mm2', 2, 'M2.', 'Additive inverse of –23 is ........ .'),
          Q('m7c1-mm3', 3, 'M3.', '(–6) – 2 = 2 – (–6); True or False ?'),
          Q('m7c1-mm4', 4, 'M4.', '(–1)¹⁰³ + (–1)¹⁰⁴ = 0; True or False ?'),
          Q('m7c1-mm5', 5, 'M5.', 'Multiplicative identity is the integer ........ .'),
          Q('m7c1-mm6', 6, 'M6.', '849 × (–19) + 849 × 19 = ........ .'),
          Q('m7c1-mm7', 7, 'M7.', 'Circle the problem whose answer is –63:', { options: ['9 × 7', '–9 × 7', '–7 × –9'] }),
          Q('m7c1-mm8', 8, 'M8.', 'Circle the problem whose answer is 45:', { options: ['–9 × 5', '–5 × 9', '–9 × –5'] }),
          Q('m7c1-mm9', 9, 'M9.', 'Circle the problem whose answer is 8:', { options: ['–48 ÷ 6', '48 ÷ (–6)', '–48 ÷ –6'] }),
          Q('m7c1-mm10', 10, 'M10.', 'Circle the problem whose answer is –5:', { options: ['40 ÷ 8', '–40 ÷ –8', '40 ÷ –8'] })
        ]),
        sec('Chapter Assessment (pages 17-18)', 'integers class 7 chapter revision', [
          Q('m7c1-ca1', 1, 'CA1.', 'Fill in the blanks:', { parts: ['(i) 8 + (–4) – ........ = 7', '(ii) 58 × (–34) – 58 × 65 – 58 = ........ .', '(iii) When the dividend and divisor are of opposite signs, the quotient has a ........ sign.', '(iv) 18 ÷ (–18) + 63 ÷ (–7) = ........ .', '(v) The sign of the product of 21 negative integers and 5 positive integers is ........ .'] }),
          Q('m7c1-ca2', 2, 'CA2.', 'Answer True (T) or False (F):', { parts: ['(i) The sum of two negative integers is less than either of the addends.', '(ii) The multiplicative identity for integers is –1.', '(iii) For any integer a, a ÷ a = –1.', '(iv) The product of two numbers with opposite signs is always negative.', '(v) The difference of two numbers with opposite signs is always negative.'] }),
          Q('m7c1-ca3', 3, 'CA3.', 'MCQ: In a quiz, team A scored 40, –10, 0 and team B scored 10, 0, –40 in three successive rounds. Which team scored more ?', { options: ['(a) A', '(b) B', '(c) A and B both', '(d) None of these'] }),
          Q('m7c1-ca4', 4, 'CA4.', 'MCQ: (–48) × (–1) × (3) × 0 × (–4) =', { options: ['(a) –576', '(b) 576', '(c) 0', '(d) 1000'] }),
          Q('m7c1-ca5', 5, 'CA5.', 'MCQ: An elevator descends into a mine shaft at the rate of 6 m/min. If the descent starts from 10 m above the ground level, how long will it take to reach –350 m ?', { options: ['(a) 10 min', '(b) 20 min', '(c) 1 hour', '(d) 45 min'] }),
          Q('m7c1-ca6', 6, 'CA6.', 'MCQ: (–1)²¹⁷ × (–4)¹¹ × (–3)¹³ results in a', { options: ['(a) negative integer', '(b) positive integer', '(c) zero', '(d) none of these'] }),
          Q('m7c1-ca7', 7, 'CA7.', 'MCQ: Aastha multiplied two numbers and got –4 as the product. She then subtracted the second number from the first and got the answer as 5. The two numbers are :', { options: ['(a) 2, –3', '(b) 1, –4', '(c) –1, 4', '(d) 5, –1'] }),
          Q('m7c1-ca8', 8, 'CA8.', 'Long answer: The product of three integers is –600. If two of them are –15 and 10, the third integer is :'),
          Q('m7c1-ca9', 9, 'CA9.', 'Long answer: Find the value of : (–10 – 10) ÷ {–10 – (–10 – 10)}.'),
          Q('m7c1-ca10', 10, 'CA10.', 'HOTS: Arrange –9 ÷ 3, –4 + 6, 2(–4), 1|–7 – 3|, –5 – 3 × 2 in ascending order.'),
          Q('m7c1-ca11', 11, 'CA11.', 'HOTS: Add the additive inverse of (–12 + 16 – 42 ÷ 3 of 7) to the product of –2, –3 and –4.')
        ]),
        sec('Worksheet (page 18)', 'division of integers class 7', [
          Q('m7c1-w1', 1, 'W1.', 'Work out. Then look for your answer in the code. Write the letter that matches each answer above the question number in the table. (The letters above the question numbers form words: 1-3, 4-7, 8-11, 12, 13-16, 17-19.)', {
            parts: ['1. –30 ÷ –6', '2. 16 ÷ –2', '3. –85 ÷ –5', '4. 3 × –3', '5. –6 × 2', '6. 19 ÷ –19', '7. –63 ÷ –9', '8. –7 × 3', '9. –104 ÷ 13', '10. 260 ÷ 5', '11. –7 × –1', '12. –96 ÷ 8', '13. –21 × –2', '14. 91 ÷ –7', '15. –104 ÷ –2', '16. –105 ÷ –15', '17. –84 ÷ 14', '18. 48 ÷ –6', '19. –60 ÷ –20'],
            table: { head: ['–21', '–13', '–12', '–9', '–8', '–6', '–1', '3', '5', '7', '17', '42', '52'], rows: [['D', 'I', 'A', 'H', 'O', 'J', 'V', 'B', 'Y', 'E', 'U', 'F', 'N']] },
            video: 'division of integers class 7'
          })
        ]),
        sec('Enrichment: Mathematics and History (pages 18-19)', 'BC and AD number line integers', [
          Q('m7c1-h1', 1, 'MH1.', 'Which year is it ? What year is 100 years before 50 B.C. ?', { context: 'On our calendar, B.C. dates are like negative integers and A.D. dates are like positive integers. One less than –10 is –11, so one year before 10 B.C. is 11 B.C. Textbook answer: 150 B.C.' }),
          Q('m7c1-h2', 2, 'MH2.', 'Although you live in the "20 hundreds," you live in the twenty first century. In which century was the year 150 ?', { context: 'The years 1 through 100 A.D. are counted as the first century. Textbook answer: the second century.' }),
          Q('m7c1-h3', 3, 'MH3.', 'The year 1 through the year 100 A.D. is counted as the first century. What was the first year of the twentieth century ? What was the last year ?', { context: 'Textbook answer: 1901 and 2000.' }),
          Q('m7c1-h4', 4, 'MH4.', "The ancient Greeks dated their calendar from the beginning of the Olympic Games in 776 B.C. The Romans counted their years from the traditional date of the founding of Rome in 753 B.C. According to the Greek's calendar, in what year was Rome founded ?", { context: 'Textbook answer: the year 23 (776 – 753 = 23).' })
        ])
      ]
    },
    { no: 2, title: 'Fractions', kind: 'Unit 1 · Number System', locked: true, sections: [] },
    { no: 3, title: 'Decimals', kind: 'Unit 1 · Number System', locked: true, sections: [] },
    { no: 4, title: 'Rational Numbers', kind: 'Unit 1 · Number System', locked: true, sections: [] },
    { no: 5, title: 'Exponents and Powers', kind: 'Unit 1 · Number System', locked: true, sections: [] },
    { no: 6, title: 'Algebraic Expressions', kind: 'Unit 2 · Algebra', locked: true, sections: [] },
    { no: 7, title: 'Linear Equations in One Variable', kind: 'Unit 2 · Algebra', locked: true, sections: [] },
    { no: 8, title: 'Ratio and Proportion and Unitary Method', kind: 'Unit 3 · Commercial Arithmetic', locked: true, sections: [] },
    { no: 9, title: 'Percentage and Its Applications', kind: 'Unit 3 · Commercial Arithmetic', locked: true, sections: [] },
    { no: 10, title: 'Lines and Angles', kind: 'Unit 4 · Geometry', locked: true, sections: [] },
    { no: 11, title: 'The Triangle and Its Properties', kind: 'Unit 4 · Geometry', locked: true, sections: [] },
    { no: 12, title: 'Practical Geometry', kind: 'Unit 4 · Geometry', locked: true, sections: [] },
    { no: 13, title: 'Congruence of Triangles', kind: 'Unit 4 · Geometry', locked: true, sections: [] },
    { no: 14, title: 'Perimeter and Area', kind: 'Unit 5 · Mensuration', locked: true, sections: [] },
    { no: 15, title: 'Data Handling', kind: 'Unit 6 · Statistics', locked: true, sections: [] },
    { no: 16, title: 'Chance and Probability', kind: 'Unit 6 · Statistics', locked: true, sections: [] },
    { no: 17, title: 'Symmetry', kind: 'Unit 4 · Geometry (Contd.)', locked: true, sections: [] },
    { no: 18, title: 'Visualising Solid Shapes (Representing 3-D in 2-D)', kind: 'Unit 4 · Geometry (Contd.)', locked: true, sections: [] }
  ]
};
