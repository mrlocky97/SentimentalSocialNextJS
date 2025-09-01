/**
 * Conjuntos de datos de prueba para evaluación del modelo de sentimiento
 * 
 * Estos conjuntos de datos se utilizan para probar el rendimiento del modelo
 * de análisis de sentimiento en diferentes escenarios y tipos de texto.
 */

export const TestDatasetSpanish = [
  {
    text: "Me encanta este producto, es lo mejor que he comprado",
    expectedLabel: "positive"
  },
  {
    text: "Qué decepción, esperaba mucho más de esta marca",
    expectedLabel: "negative"
  },
  {
    text: "El servicio al cliente fue horrible, nunca más compro aquí",
    expectedLabel: "negative"
  },
  {
    text: "Increíble experiencia de compra, todo llegó perfecto",
    expectedLabel: "positive"
  },
  {
    text: "Precio normal, calidad normal, nada especial que comentar",
    expectedLabel: "neutral"
  },
  {
    text: "La tienda abre a las 9:00 y cierra a las 20:00 horas",
    expectedLabel: "neutral"
  },
  {
    text: "Buenísimo el servicio! Súper rápido y el personal muy amable 😍",
    expectedLabel: "positive"
  },
  {
    text: "Malísima la atención, encima los precios carísimos para lo que ofrecen 😤",
    expectedLabel: "negative"
  },
  {
    text: "Se inauguró ayer la nueva sucursal en el centro comercial",
    expectedLabel: "neutral"
  },
  {
    text: "Que producto tan espectacular, 100% recomendado para todos",
    expectedLabel: "positive"
  }
];

export const TestDatasetEnglish = [
  {
    text: "This product completely exceeded my expectations. Absolutely love it!",
    expectedLabel: "positive"
  },
  {
    text: "Terrible experience with customer service. Will not be shopping here again.",
    expectedLabel: "negative"
  },
  {
    text: "Store hours are from 9am to 8pm Monday through Saturday.",
    expectedLabel: "neutral"
  },
  {
    text: "The quality of this product is disappointing. Save your money.",
    expectedLabel: "negative"
  },
  {
    text: "Best purchase I've made this year! Can't believe the value for money.",
    expectedLabel: "positive"
  },
  {
    text: "Product arrived on schedule. Packaging was as expected.",
    expectedLabel: "neutral"
  },
  {
    text: "Absolutely frustrated with this company's policies! Avoid at all costs!",
    expectedLabel: "negative"
  },
  {
    text: "Great customer service, fast delivery, and excellent quality! 👍",
    expectedLabel: "positive"
  },
  {
    text: "The new branch will be opening next Tuesday at the mall.",
    expectedLabel: "neutral"
  },
  {
    text: "So happy with my purchase! This is exactly what I was looking for! 😊",
    expectedLabel: "positive"
  }
];

export const TestDatasetMixed = [
  {
    text: "Qué maravilla! This brand really gets it right! Excelente servicio!",
    expectedLabel: "positive"
  },
  {
    text: "C'est vraiment disappointing! Expected so much better from this brand",
    expectedLabel: "negative"
  },
  {
    text: "The nuevo producto está available en all stores ahora",
    expectedLabel: "neutral"
  },
  {
    text: "Muy bad experience con customer service, never again!",
    expectedLabel: "negative"
  },
  {
    text: "Amazing producto! Totally recomendado para everyone! 😍",
    expectedLabel: "positive"
  },
  {
    text: "El website está down for maintenance until tomorrow",
    expectedLabel: "neutral"
  },
  {
    text: "Absolutely perfect! La mejor compra que he hecho este año!",
    expectedLabel: "positive"
  },
  {
    text: "Terrible calidad, awful service, waste of dinero 👎",
    expectedLabel: "negative"
  },
  {
    text: "This store opens mañana at 9am y cierra at 8pm",
    expectedLabel: "neutral"
  },
  {
    text: "No me gustó nada el producto. Totally overrated and expensive.",
    expectedLabel: "negative"
  }
];

export const TestDatasetSarcasm = [
  {
    text: "Oh wonderful, another app update that breaks everything I liked about it",
    expectedLabel: "negative"
  },
  {
    text: "Great job Brand! Nothing says quality like breaking after one day",
    expectedLabel: "negative"
  },
  {
    text: "Wow, thanks for the 'amazing' customer service. Really made my day.",
    expectedLabel: "negative"
  },
  {
    text: "Just what I needed, another delay in shipping. So professional!",
    expectedLabel: "negative"
  },
  {
    text: "Loving how this product falls apart. Really shows attention to detail!",
    expectedLabel: "negative"
  },
  {
    text: "Amazing how they charge premium prices for such 'quality' work.",
    expectedLabel: "negative"
  },
  {
    text: "Sure, waiting 2 hours on hold is exactly how I wanted to spend my day!",
    expectedLabel: "negative"
  },
  {
    text: "Brilliantly designed to stop working right after the warranty expires!",
    expectedLabel: "negative"
  },
  {
    text: "Oh look, another useless feature nobody asked for. Just what we needed.",
    expectedLabel: "negative"
  },
  {
    text: "Fantastic! The third time I've had to return this 'reliable' product.",
    expectedLabel: "negative"
  }
];

export const TestDatasetSlang = [
  {
    text: "This product is fire! Absolutely obsessed!",
    expectedLabel: "positive"
  },
  {
    text: "No cap, this is the best purchase I have made this year!",
    expectedLabel: "positive"
  },
  {
    text: "This ain't it chief. Major disappointment vibes.",
    expectedLabel: "negative"
  },
  {
    text: "Straight up trash! How is this even legal to sell?",
    expectedLabel: "negative"
  },
  {
    text: "Lowkey the most underrated product out there rn.",
    expectedLabel: "positive"
  },
  {
    text: "Deadass thought this would be better. Big yikes.",
    expectedLabel: "negative"
  },
  {
    text: "This slaps so hard! Take my money!",
    expectedLabel: "positive"
  },
  {
    text: "That's cap! The ads were super misleading tbh.",
    expectedLabel: "negative"
  },
  {
    text: "Hits different when you use it right. No shade.",
    expectedLabel: "positive"
  },
  {
    text: "Bussin! Worth every penny, fr fr!",
    expectedLabel: "positive"
  }
];

export const AllTestDatasets = [
  ...TestDatasetSpanish,
  ...TestDatasetEnglish,
  ...TestDatasetMixed,
  ...TestDatasetSarcasm,
  ...TestDatasetSlang
];
