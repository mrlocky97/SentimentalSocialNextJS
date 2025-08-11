/**
 * Test Dataset for Sentiment Analysis Evaluation
 * Manually labeled examples for testing accuracy
 */

export const sentimentTestDataset = [
  // POSITIVE EXAMPLES
  {
    text: 'I absolutely love this product! It works perfectly and exceeded my expectations 😍',
    expectedSentiment: 'positive',
  },
  {
    text: 'Amazing service! The team was incredibly helpful and responsive. Highly recommend!',
    expectedSentiment: 'positive',
  },
  {
    text: "This is fantastic! Best purchase I've made this year 🎉",
    expectedSentiment: 'positive',
  },
  {
    text: 'Great job on the new update! Everything runs much smoother now',
    expectedSentiment: 'positive',
  },
  {
    text: 'Excellent quality and fast delivery. Very satisfied with my order',
    expectedSentiment: 'positive',
  },

  // NEGATIVE EXAMPLES
  {
    text: 'This is terrible! Worst experience ever. Complete waste of money 😠',
    expectedSentiment: 'negative',
  },
  {
    text: 'Horrible customer service. They never responded to my complaints',
    expectedSentiment: 'negative',
  },
  {
    text: 'I hate this update. It made everything worse and more confusing',
    expectedSentiment: 'negative',
  },
  {
    text: 'Awful quality. The product broke after just one day of use',
    expectedSentiment: 'negative',
  },
  {
    text: "Disappointed and frustrated. This doesn't work as advertised",
    expectedSentiment: 'negative',
  },

  // NEUTRAL EXAMPLES
  {
    text: 'The product arrived on time. Standard packaging and delivery',
    expectedSentiment: 'neutral',
  },
  {
    text: "I received the order. It's exactly what was described in the listing",
    expectedSentiment: 'neutral',
  },
  {
    text: 'The interface has been updated. Some features moved to different locations',
    expectedSentiment: 'neutral',
  },
  {
    text: 'This is a typical smartphone with standard features for the price range',
    expectedSentiment: 'neutral',
  },
  {
    text: 'The meeting is scheduled for tomorrow at 3 PM in conference room B',
    expectedSentiment: 'neutral',
  },

  // CHALLENGING CASES (Sarcasm, Mixed Sentiment)
  {
    text: 'Oh great, another system update that breaks everything. Just what I needed today...',
    expectedSentiment: 'negative',
  },
  {
    text: 'The product is good but the customer service could be better',
    expectedSentiment: 'neutral',
  },
  {
    text: "I like the design but I'm not sure about the price. Mixed feelings about this",
    expectedSentiment: 'neutral',
  },
  {
    text: 'Perfect! Another bug in the software. They really know how to test things properly 🙄',
    expectedSentiment: 'negative',
  },
  {
    text: 'Works fine I guess. Nothing special but gets the job done',
    expectedSentiment: 'neutral',
  },
];

export const sarcasmTestDataset = [
  // ENGLISH SARCASM
  {
    text: 'Oh great, another system update that breaks everything. Just what I needed today...',
    expectedSentiment: 'negative',
  },
  {
    text: 'Perfect! Another bug in the software. They really know how to test things properly 🙄',
    expectedSentiment: 'negative',
  },
  {
    text: 'Wonderful! My computer crashed right before the deadline. How lovely!',
    expectedSentiment: 'negative',
  },
  {
    text: 'Oh fantastic, another meeting that could have been an email',
    expectedSentiment: 'negative',
  },

  // SPANISH SARCASM
  {
    text: 'Qué maravilloso, otra actualización que rompe todo. Justo lo que necesitaba hoy...',
    expectedSentiment: 'negative',
  },
  {
    text: 'Perfecto! Otro error en el software. Realmente saben cómo hacer las cosas 🙄',
    expectedSentiment: 'negative',
  },
  {
    text: 'Genial, mi ordenador se colgó justo antes de la fecha límite. ¡Qué hermoso!',
    expectedSentiment: 'negative',
  },

  // FRENCH SARCASM
  {
    text: "Oh génial, une autre mise à jour qui casse tout. Exactement ce qu'il me fallait...",
    expectedSentiment: 'negative',
  },
  {
    text: 'Parfait! Encore un bug dans le logiciel. Ils savent vraiment comment tester 🙄',
    expectedSentiment: 'negative',
  },

  // GERMAN SARCASM
  {
    text: 'Oh toll, noch ein Update das alles kaputt macht. Genau was ich heute brauchte...',
    expectedSentiment: 'negative',
  },
  {
    text: 'Perfekt! Noch ein Fehler in der Software. Sie wissen wirklich wie man testet 🙄',
    expectedSentiment: 'negative',
  },
];

export const multilingualTestDataset = [
  // POSITIVE - Multiple languages
  {
    text: 'I absolutely love this product! Amazing quality and great service 😍',
    expectedSentiment: 'positive',
  },
  {
    text: 'Me encanta absolutamente este producto! Calidad increíble y gran servicio 😍',
    expectedSentiment: 'positive',
  },
  {
    text: "J'adore absolument ce produit! Qualité incroyable et excellent service 😍",
    expectedSentiment: 'positive',
  },
  {
    text: 'Ich liebe dieses Produkt absolut! Erstaunliche Qualität und großartiger Service 😍',
    expectedSentiment: 'positive',
  },

  // NEGATIVE - Multiple languages
  {
    text: 'This is terrible! Worst experience ever. Complete waste of money 😠',
    expectedSentiment: 'negative',
  },
  {
    text: '¡Esto es terrible! La peor experiencia de mi vida. Completa pérdida de dinero 😠',
    expectedSentiment: 'negative',
  },
  {
    text: "C'est terrible! Pire expérience de ma vie. Perte d'argent complète 😠",
    expectedSentiment: 'negative',
  },
  {
    text: 'Das ist schrecklich! Schlimmste Erfahrung aller Zeiten. Komplette Geldverschwendung 😠',
    expectedSentiment: 'negative',
  },

  // NEUTRAL - Multiple languages
  {
    text: 'The product arrived on time. Standard packaging and delivery.',
    expectedSentiment: 'neutral',
  },
  {
    text: 'El producto llegó a tiempo. Embalaje y entrega estándar.',
    expectedSentiment: 'neutral',
  },
  {
    text: 'Le produit est arrivé à temps. Emballage et livraison standard.',
    expectedSentiment: 'neutral',
  },
  {
    text: 'Das Produkt kam pünktlich an. Standard Verpackung und Lieferung.',
    expectedSentiment: 'neutral',
  },
];

export const marketingSpecificTestDataset = [
  // Marketing-specific positive
  {
    text: 'This brand really understands their customers! Love their marketing approach 💯',
    expectedSentiment: 'positive',
  },
  {
    text: 'Brilliant campaign! This ad made me want to buy the product immediately',
    expectedSentiment: 'positive',
  },

  // Marketing-specific negative
  {
    text: 'Another annoying ad interrupting my video. This brand is becoming really invasive',
    expectedSentiment: 'negative',
  },
  {
    text: "Misleading advertisement. The product doesn't match what they promised in the campaign",
    expectedSentiment: 'negative',
  },

  // Marketing-specific neutral
  {
    text: 'Saw the new commercial during the game. Standard product presentation',
    expectedSentiment: 'neutral',
  },
];

export const techSpecificTestDataset = [
  // Tech-specific examples
  {
    text: 'The new TypeScript features are amazing! Loving the improved type safety',
    expectedSentiment: 'positive',
  },
  {
    text: 'React 18 concurrent features are game-changing for performance optimization',
    expectedSentiment: 'positive',
  },
  {
    text: 'This API documentation is terrible. No clear examples and confusing explanations',
    expectedSentiment: 'negative',
  },
  {
    text: 'The database migration completed successfully. All tables updated',
    expectedSentiment: 'neutral',
  },
];
