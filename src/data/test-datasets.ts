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
