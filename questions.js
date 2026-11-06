// Questions live here (fixed). The AI only writes the ANSWERS.
// To add more: copy a block, give it a new unique id.
// Optional `context` is hidden from students and only sent to the AI
// (use it when a question refers to an Activity the AI can't see).
// To add a chapter: add one more object to `chapters` (unique `no`, ids that start with c<no>-).
// Courses (class + subject) are listed at the bottom of this file.
const science = {
  id: 'c10-science',
  subject: 'Science',
  class: 10,
  chapters: [
  {
  no: 1, title: 'Chemical Reactions and Equations',
  sections: [
    {
      title: 'In-text Questions (page 6)',
      questions: [
        { id: 'c1-p6-1', no: 1, text: 'Why should a magnesium ribbon be cleaned before burning in air?' },
        {
          id: 'c1-p6-2', no: 2,
          text: 'Write the balanced equation for the following chemical reactions.',
          parts: [
            '(i) Hydrogen + Chlorine → Hydrogen chloride',
            '(ii) Barium chloride + Aluminium sulphate → Barium sulphate + Aluminium chloride',
            '(iii) Sodium + Water → Sodium hydroxide + Hydrogen'
          ]
        },
        {
          id: 'c1-p6-3', no: 3,
          text: 'Write a balanced chemical equation with state symbols for the following reactions.',
          parts: [
            '(i) Solutions of barium chloride and sodium sulphate in water react to give insoluble barium sulphate and the solution of sodium chloride.',
            '(ii) Sodium hydroxide solution (in water) reacts with hydrochloric acid solution (in water) to produce sodium chloride solution and water.'
          ]
        }
      ]
    },
    {
      title: 'In-text Questions (page 10)',
      questions: [
        {
          id: 'c1-p10-1', no: 1,
          text: 'A solution of a substance ‘X’ is used for white washing.',
          parts: [
            '(i) Name the substance ‘X’ and write its formula.',
            '(ii) Write the reaction of the substance ‘X’ named in (i) above with water.'
          ]
        },
        {
          id: 'c1-p10-2', no: 2,
          text: 'Why is the amount of gas collected in one of the test tubes in Activity 1.7 double of the amount collected in the other? Name this gas.',
          context: 'Activity 1.7 in the textbook is the electrolysis of water: water with a few drops of dilute sulphuric acid is electrolysed, and gas is collected in two test tubes over the two electrodes.'
        }
      ]
    },
    {
      title: 'In-text Questions (page 13)',
      questions: [
        { id: 'c1-p13-1', no: 1, text: 'Why does the colour of copper sulphate solution change when an iron nail is dipped in it?' },
        {
          id: 'c1-p13-2', no: 2,
          text: 'Give an example of a double displacement reaction other than the one given in Activity 1.10.',
          context: 'Activity 1.10 in the textbook is the reaction of sodium sulphate solution with barium chloride solution, forming a white precipitate of barium sulphate.'
        },
        {
          id: 'c1-p13-3', no: 3,
          text: 'Identify the substances that are oxidised and the substances that are reduced in the following reactions.',
          parts: [
            '(i) 4Na(s) + O₂(g) → 2Na₂O(s)',
            '(ii) CuO(s) + H₂(g) → Cu(s) + H₂O(l)'
          ]
        }
      ]
    },
    {
      title: 'Exercises (pages 14-16)',
      questions: [
        {
          id: 'c1-ex-1', no: 1,
          text: 'Which of the statements about the reaction below are incorrect?  2PbO(s) + C(s) → 2Pb(s) + CO₂(g)',
          options: [
            '(a) Lead is getting reduced.',
            '(b) Carbon dioxide is getting oxidised.',
            '(c) Carbon is getting oxidised.',
            '(d) Lead oxide is getting reduced.',
            '(i) (a) and (b)',
            '(ii) (a) and (c)',
            '(iii) (a), (b) and (c)',
            '(iv) all'
          ]
        },
        {
          id: 'c1-ex-2', no: 2,
          text: 'Fe₂O₃ + 2Al → Al₂O₃ + 2Fe.  The above reaction is an example of a',
          options: [
            '(a) combination reaction.',
            '(b) double displacement reaction.',
            '(c) decomposition reaction.',
            '(d) displacement reaction.'
          ]
        },
        {
          id: 'c1-ex-3', no: 3,
          text: 'What happens when dilute hydrochloric acid is added to iron fillings? Tick the correct answer.',
          options: [
            '(a) Hydrogen gas and iron chloride are produced.',
            '(b) Chlorine gas and iron hydroxide are produced.',
            '(c) No reaction takes place.',
            '(d) Iron salt and water are produced.'
          ]
        },
        { id: 'c1-ex-4', no: 4, text: 'What is a balanced chemical equation? Why should chemical equations be balanced?' },
        {
          id: 'c1-ex-5', no: 5,
          text: 'Translate the following statements into chemical equations and then balance them.',
          parts: [
            '(a) Hydrogen gas combines with nitrogen to form ammonia.',
            '(b) Hydrogen sulphide gas burns in air to give water and sulphur dioxide.',
            '(c) Barium chloride reacts with aluminium sulphate to give aluminium chloride and a precipitate of barium sulphate.',
            '(d) Potassium metal reacts with water to give potassium hydroxide and hydrogen gas.'
          ]
        },
        {
          id: 'c1-ex-6', no: 6,
          text: 'Balance the following chemical equations.',
          parts: [
            '(a) HNO₃ + Ca(OH)₂ → Ca(NO₃)₂ + H₂O',
            '(b) NaOH + H₂SO₄ → Na₂SO₄ + H₂O',
            '(c) NaCl + AgNO₃ → AgCl + NaNO₃',
            '(d) BaCl₂ + H₂SO₄ → BaSO₄ + HCl'
          ]
        },
        {
          id: 'c1-ex-7', no: 7,
          text: 'Write the balanced chemical equations for the following reactions.',
          parts: [
            '(a) Calcium hydroxide + Carbon dioxide → Calcium carbonate + Water',
            '(b) Zinc + Silver nitrate → Zinc nitrate + Silver',
            '(c) Aluminium + Copper chloride → Aluminium chloride + Copper',
            '(d) Barium chloride + Potassium sulphate → Barium sulphate + Potassium chloride'
          ]
        },
        {
          id: 'c1-ex-8', no: 8,
          text: 'Write the balanced chemical equation for the following and identify the type of reaction in each case.',
          parts: [
            '(a) Potassium bromide(aq) + Barium iodide(aq) → Potassium iodide(aq) + Barium bromide(s)',
            '(b) Zinc carbonate(s) → Zinc oxide(s) + Carbon dioxide(g)',
            '(c) Hydrogen(g) + Chlorine(g) → Hydrogen chloride(g)',
            '(d) Magnesium(s) + Hydrochloric acid(aq) → Magnesium chloride(aq) + Hydrogen(g)'
          ]
        },
        { id: 'c1-ex-9', no: 9, text: 'What does one mean by exothermic and endothermic reactions? Give examples.' },
        { id: 'c1-ex-10', no: 10, text: 'Why is respiration considered an exothermic reaction? Explain.' },
        { id: 'c1-ex-11', no: 11, text: 'Why are decomposition reactions called the opposite of combination reactions? Write equations for these reactions.' },
        { id: 'c1-ex-12', no: 12, text: 'Write one equation each for decomposition reactions where energy is supplied in the form of heat, light or electricity.' },
        { id: 'c1-ex-13', no: 13, text: 'What is the difference between displacement and double displacement reactions? Write equations for these reactions.' },
        { id: 'c1-ex-14', no: 14, text: 'In the refining of silver, the recovery of silver from silver nitrate solution involved displacement by copper metal. Write down the reaction involved.' },
        { id: 'c1-ex-15', no: 15, text: 'What do you mean by a precipitation reaction? Explain by giving examples.' },
        {
          id: 'c1-ex-16', no: 16,
          text: 'Explain the following in terms of gain or loss of oxygen with two examples each.',
          parts: ['(a) Oxidation', '(b) Reduction']
        },
        { id: 'c1-ex-17', no: 17, text: 'A shiny brown coloured element ‘X’ on heating in air becomes black in colour. Name the element ‘X’ and the black coloured compound formed.' },
        { id: 'c1-ex-18', no: 18, text: 'Why do we apply paint on iron articles?' },
        { id: 'c1-ex-19', no: 19, text: 'Oil and fat containing food items are flushed with nitrogen. Why?' },
        {
          id: 'c1-ex-20', no: 20,
          text: 'Explain the following terms with one example each.',
          parts: ['(a) Corrosion', '(b) Rancidity']
        }
      ]
    }
  ]
  },
  {
  no: 2, title: 'Acids, Bases and Salts',
  sections: [
    {
      title: 'In-text Questions (page 18)',
      questions: [
        { id: 'c2-p18-1', no: 1, text: 'You have been provided with three test tubes. One of them contains distilled water and the other two contain an acidic solution and a basic solution, respectively. If you are given only red litmus paper, how will you identify the contents of each test tube?' }
      ]
    },
    {
      title: 'In-text Questions (page 22)',
      questions: [
        { id: 'c2-p22-1', no: 1, text: 'Why should curd and sour substances not be kept in brass and copper vessels?' },
        { id: 'c2-p22-2', no: 2, text: 'Which gas is usually liberated when an acid reacts with a metal? Illustrate with an example. How will you test for the presence of this gas?' },
        { id: 'c2-p22-3', no: 3, text: 'Metal compound A reacts with dilute hydrochloric acid to produce effervescence. The gas evolved extinguishes a burning candle. Write a balanced chemical equation for the reaction if one of the compounds formed is calcium chloride.' }
      ]
    },
    {
      title: 'In-text Questions (page 25)',
      questions: [
        { id: 'c2-p25-1', no: 1, text: 'Why do HCl, HNO₃, etc., show acidic characters in aqueous solutions while solutions of compounds like alcohol and glucose do not show acidic character?' },
        { id: 'c2-p25-2', no: 2, text: 'Why does an aqueous solution of an acid conduct electricity?' },
        { id: 'c2-p25-3', no: 3, text: 'Why does dry HCl gas not change the colour of the dry litmus paper?' },
        { id: 'c2-p25-4', no: 4, text: 'While diluting an acid, why is it recommended that the acid should be added to water and not water to the acid?' },
        { id: 'c2-p25-5', no: 5, text: 'How is the concentration of hydronium ions (H₃O⁺) affected when a solution of an acid is diluted?' },
        { id: 'c2-p25-6', no: 6, text: 'How is the concentration of hydroxide ions (OH⁻) affected when excess base is dissolved in a solution of sodium hydroxide?' }
      ]
    },
    {
      title: 'In-text Questions (page 28)',
      questions: [
        { id: 'c2-p28-1', no: 1, text: 'You have two solutions, A and B. The pH of solution A is 6 and pH of solution B is 8. Which solution has more hydrogen ion concentration? Which of this is acidic and which one is basic?' },
        { id: 'c2-p28-2', no: 2, text: 'What effect does the concentration of H⁺(aq) ions have on the nature of the solution?' },
        { id: 'c2-p28-3', no: 3, text: 'Do basic solutions also have H⁺(aq) ions? If yes, then why are these basic?' },
        { id: 'c2-p28-4', no: 4, text: 'Under what soil condition do you think a farmer would treat the soil of his fields with quick lime (calcium oxide) or slaked lime (calcium hydroxide) or chalk (calcium carbonate)?' }
      ]
    },
    {
      title: 'In-text Questions (page 33)',
      questions: [
        { id: 'c2-p33-1', no: 1, text: 'What is the common name of the compound CaOCl₂?' },
        { id: 'c2-p33-2', no: 2, text: 'Name the substance which on treatment with chlorine yields bleaching powder.' },
        { id: 'c2-p33-3', no: 3, text: 'Name the sodium compound which is used for softening hard water.' },
        { id: 'c2-p33-4', no: 4, text: 'What will happen if a solution of sodium hydrocarbonate is heated? Give the equation of the reaction involved.' },
        { id: 'c2-p33-5', no: 5, text: 'Write an equation to show the reaction between Plaster of Paris and water.' }
      ]
    },
    {
      title: 'Exercises (pages 34-35)',
      questions: [
        {
          id: 'c2-ex-1', no: 1,
          text: 'A solution turns red litmus blue, its pH is likely to be',
          options: ['(a) 1', '(b) 4', '(c) 5', '(d) 10']
        },
        {
          id: 'c2-ex-2', no: 2,
          text: 'A solution reacts with crushed egg-shells to give a gas that turns lime-water milky. The solution contains',
          options: ['(a) NaCl', '(b) HCl', '(c) LiCl', '(d) KCl']
        },
        {
          id: 'c2-ex-3', no: 3,
          text: '10 mL of a solution of NaOH is found to be completely neutralised by 8 mL of a given solution of HCl. If we take 20 mL of the same solution of NaOH, the amount HCl solution (the same solution as before) required to neutralise it will be',
          options: ['(a) 4 mL', '(b) 8 mL', '(c) 12 mL', '(d) 16 mL']
        },
        {
          id: 'c2-ex-4', no: 4,
          text: 'Which one of the following types of medicines is used for treating indigestion?',
          options: ['(a) Antibiotic', '(b) Analgesic', '(c) Antacid', '(d) Antiseptic']
        },
        {
          id: 'c2-ex-5', no: 5,
          text: 'Write word equations and then balanced equations for the reaction taking place when –',
          parts: [
            '(a) dilute sulphuric acid reacts with zinc granules.',
            '(b) dilute hydrochloric acid reacts with magnesium ribbon.',
            '(c) dilute sulphuric acid reacts with aluminium powder.',
            '(d) dilute hydrochloric acid reacts with iron filings.'
          ]
        },
        { id: 'c2-ex-6', no: 6, text: 'Compounds such as alcohols and glucose also contain hydrogen but are not categorised as acids. Describe an Activity to prove it.' },
        { id: 'c2-ex-7', no: 7, text: 'Why does distilled water not conduct electricity, whereas rain water does?' },
        { id: 'c2-ex-8', no: 8, text: 'Why do acids not show acidic behaviour in the absence of water?' },
        {
          id: 'c2-ex-9', no: 9,
          text: 'Five solutions A, B, C, D and E when tested with universal indicator showed pH as 4, 1, 11, 7 and 9, respectively. Which solution is',
          parts: [
            '(a) neutral?',
            '(b) strongly alkaline?',
            '(c) strongly acidic?',
            '(d) weakly acidic?',
            '(e) weakly alkaline?',
            'Arrange the pH in increasing order of hydrogen-ion concentration.'
          ]
        },
        { id: 'c2-ex-10', no: 10, text: 'Equal lengths of magnesium ribbons are taken in test tubes A and B. Hydrochloric acid (HCl) is added to test tube A, while acetic acid (CH₃COOH) is added to test tube B. Amount and concentration taken for both the acids are same. In which test tube will the fizzing occur more vigorously and why?' },
        { id: 'c2-ex-11', no: 11, text: 'Fresh milk has a pH of 6. How do you think the pH will change as it turns into curd? Explain your answer.' },
        {
          id: 'c2-ex-12', no: 12,
          text: 'A milkman adds a very small amount of baking soda to fresh milk.',
          parts: [
            '(a) Why does he shift the pH of the fresh milk from 6 to slightly alkaline?',
            '(b) Why does this milk take a long time to set as curd?'
          ]
        },
        { id: 'c2-ex-13', no: 13, text: 'Plaster of Paris should be stored in a moisture-proof container. Explain why?' },
        { id: 'c2-ex-14', no: 14, text: 'What is a neutralisation reaction? Give two examples.' },
        { id: 'c2-ex-15', no: 15, text: 'Give two important uses of washing soda and baking soda.' }
      ]
    }
  ]
  },
  {
  no: 3, title: 'Metals and Non-metals',
  sections: [
    {
      title: 'In-text Questions (page 40)',
      questions: [
        {
          id: 'c3-p40-1', no: 1,
          text: 'Give an example of a metal which',
          parts: [
            '(i) is a liquid at room temperature.',
            '(ii) can be easily cut with a knife.',
            '(iii) is the best conductor of heat.',
            '(iv) is a poor conductor of heat.'
          ]
        },
        { id: 'c3-p40-2', no: 2, text: 'Explain the meanings of malleable and ductile.' }
      ]
    },
    {
      title: 'In-text Questions (page 46)',
      questions: [
        { id: 'c3-p46-1', no: 1, text: 'Why is sodium kept immersed in kerosene oil?' },
        {
          id: 'c3-p46-2', no: 2,
          text: 'Write equations for the reactions of',
          parts: ['(i) iron with steam', '(ii) calcium and potassium with water']
        },
        {
          id: 'c3-p46-3', no: 3,
          text: 'Samples of four metals A, B, C and D were taken and added to the following solution one by one. The results obtained have been tabulated as follows.',
          table: {
            head: ['Metal', 'Iron(II) sulphate', 'Copper(II) sulphate', 'Zinc sulphate', 'Silver nitrate'],
            rows: [
              ['A', 'No reaction', 'Displacement', '', ''],
              ['B', 'Displacement', '', 'No reaction', ''],
              ['C', 'No reaction', 'No reaction', 'No reaction', 'Displacement'],
              ['D', 'No reaction', 'No reaction', 'No reaction', 'No reaction']
            ]
          },
          parts: [
            'Use the Table above to answer the following questions about metals A, B, C and D.',
            '(i) Which is the most reactive metal?',
            '(ii) What would you observe if B is added to a solution of Copper(II) sulphate?',
            '(iii) Arrange the metals A, B, C and D in the order of decreasing reactivity.'
          ]
        },
        { id: 'c3-p46-4', no: 4, text: 'Which gas is produced when dilute hydrochloric acid is added to a reactive metal? Write the chemical reaction when iron reacts with dilute H₂SO₄.' },
        { id: 'c3-p46-5', no: 5, text: 'What would you observe when zinc is added to a solution of iron(II) sulphate? Write the chemical reaction that takes place.' }
      ]
    },
    {
      title: 'In-text Questions (page 49)',
      questions: [
        {
          id: 'c3-p49-1', no: 1,
          text: '',
          parts: [
            '(i) Write the electron-dot structures for sodium, oxygen and magnesium.',
            '(ii) Show the formation of Na₂O and MgO by the transfer of electrons.',
            '(iii) What are the ions present in these compounds?'
          ]
        },
        { id: 'c3-p49-2', no: 2, text: 'Why do ionic compounds have high melting points?' }
      ]
    },
    {
      title: 'In-text Questions (page 53)',
      questions: [
        {
          id: 'c3-p53-1', no: 1,
          text: 'Define the following terms.',
          parts: ['(i) Mineral', '(ii) Ore', '(iii) Gangue']
        },
        { id: 'c3-p53-2', no: 2, text: 'Name two metals which are found in nature in the free state.' },
        { id: 'c3-p53-3', no: 3, text: 'What chemical process is used for obtaining a metal from its oxide?' }
      ]
    },
    {
      title: 'In-text Questions (page 55)',
      questions: [
        {
          id: 'c3-p55-1', no: 1,
          text: 'Metallic oxides of zinc, magnesium and copper were heated with the following metals.',
          table: {
            head: ['Metal', 'Zinc', 'Magnesium', 'Copper'],
            rows: [
              ['Zinc oxide', '', '', ''],
              ['Magnesium oxide', '', '', ''],
              ['Copper oxide', '', '', '']
            ]
          },
          parts: ['In which cases will you find displacement reactions taking place?']
        },
        { id: 'c3-p55-2', no: 2, text: 'Which metals do not corrode easily?' },
        { id: 'c3-p55-3', no: 3, text: 'What are alloys?' }
      ]
    },
    {
      title: 'Exercises (pages 56-57)',
      questions: [
        {
          id: 'c3-ex-1', no: 1,
          text: 'Which of the following pairs will give displacement reactions?',
          options: [
            '(a) NaCl solution and copper metal',
            '(b) MgCl₂ solution and aluminium metal',
            '(c) FeSO₄ solution and silver metal',
            '(d) AgNO₃ solution and copper metal.'
          ]
        },
        {
          id: 'c3-ex-2', no: 2,
          text: 'Which of the following methods is suitable for preventing an iron frying pan from rusting?',
          options: ['(a) Applying grease', '(b) Applying paint', '(c) Applying a coating of zinc', '(d) All of the above.']
        },
        {
          id: 'c3-ex-3', no: 3,
          text: 'An element reacts with oxygen to give a compound with a high melting point. This compound is also soluble in water. The element is likely to be',
          options: ['(a) calcium', '(b) carbon', '(c) silicon', '(d) iron.']
        },
        {
          id: 'c3-ex-4', no: 4,
          text: 'Food cans are coated with tin and not with zinc because',
          options: [
            '(a) zinc is costlier than tin.',
            '(b) zinc has a higher melting point than tin.',
            '(c) zinc is more reactive than tin.',
            '(d) zinc is less reactive than tin.'
          ]
        },
        {
          id: 'c3-ex-5', no: 5,
          text: 'You are given a hammer, a battery, a bulb, wires and a switch.',
          parts: [
            '(a) How could you use them to distinguish between samples of metals and non-metals?',
            '(b) Assess the usefulness of these tests in distinguishing between metals and non-metals.'
          ]
        },
        { id: 'c3-ex-6', no: 6, text: 'What are amphoteric oxides? Give two examples of amphoteric oxides.' },
        { id: 'c3-ex-7', no: 7, text: 'Name two metals which will displace hydrogen from dilute acids, and two metals which will not.' },
        { id: 'c3-ex-8', no: 8, text: 'In the electrolytic refining of a metal M, what would you take as the anode, the cathode and the electrolyte?' },
        {
          id: 'c3-ex-9', no: 9,
          text: 'Pratyush took sulphur powder on a spatula and heated it. He collected the gas evolved by inverting a test tube over it, as shown in figure below.',
          context: 'The figure shows sulphur powder on a spatula being heated over a burner, with a test tube held upside down over it to collect the gas evolved.',
          parts: [
            '(a) What will be the action of gas on (i) dry litmus paper? (ii) moist litmus paper?',
            '(b) Write a balanced chemical equation for the reaction taking place.'
          ]
        },
        { id: 'c3-ex-10', no: 10, text: 'State two ways to prevent the rusting of iron.' },
        { id: 'c3-ex-11', no: 11, text: 'What type of oxides are formed when non-metals combine with oxygen?' },
        {
          id: 'c3-ex-12', no: 12,
          text: 'Give reasons',
          parts: [
            '(a) Platinum, gold and silver are used to make jewellery.',
            '(b) Sodium, potassium and lithium are stored under oil.',
            '(c) Aluminium is a highly reactive metal, yet it is used to make utensils for cooking.',
            '(d) Carbonate and sulphide ores are usually converted into oxides during the process of extraction.'
          ]
        },
        { id: 'c3-ex-13', no: 13, text: 'You must have seen tarnished copper vessels being cleaned with lemon or tamarind juice. Explain why these sour substances are effective in cleaning the vessels.' },
        { id: 'c3-ex-14', no: 14, text: 'Differentiate between metal and non-metal on the basis of their chemical properties.' },
        { id: 'c3-ex-15', no: 15, text: 'A man went door to door posing as a goldsmith. He promised to bring back the glitter of old and dull gold ornaments. An unsuspecting lady gave a set of gold bangles to him which he dipped in a particular solution. The bangles sparkled like new but their weight was reduced drastically. The lady was upset but after a futile argument the man beat a hasty retreat. Can you play the detective to find out the nature of the solution he had used?' },
        { id: 'c3-ex-16', no: 16, text: 'Give reasons why copper is used to make hot water tanks and not steel (an alloy of iron).' }
      ]
    }
  ]
  }
  ]
};

// Courses: one per class + subject. Add a new file for each (see english7.js) and list it here.
module.exports = { courses: [science, require('./english7.js'), require('./maths7.js'), require('./science7.js')] };
