/**
 * Training Dataset para Naive Bayes
 * Dataset multiidioma balanceado para análisis de sentimientos
 */

import { TrainingData } from '../experimental/naive-bayes.model';

export const SENTIMENT_TRAINING_DATASET: TrainingData[] = [
    // ===================== POSITIVOS EN ESPAÑOL =====================
    { text: "Me encanta este producto, es increíble y de excelente calidad", sentiment: "positive" },
    { text: "Fantástico servicio al cliente, muy recomendado", sentiment: "positive" },
    { text: "Excelente experiencia de compra, todo perfecto", sentiment: "positive" },
    { text: "Producto maravilloso, superó mis expectativas completamente", sentiment: "positive" },
    { text: "Servicio rápido y eficiente, muy satisfecho con la compra", sentiment: "positive" },
    { text: "La calidad es excepcional, definitivamente volvería a comprar", sentiment: "positive" },
    { text: "Atención al cliente brillante, resolvieron todo rápidamente", sentiment: "positive" },
    { text: "Producto increíble con gran relación calidad-precio", sentiment: "positive" },
    { text: "Estoy muy feliz con mi compra, todo llegó perfecto", sentiment: "positive" },
    { text: "Recomiendo totalmente este producto, es genial", sentiment: "positive" },
    { text: "Servicio excepcional, personal muy amable y profesional", sentiment: "positive" },
    { text: "La mejor compra que he hecho, producto de primera calidad", sentiment: "positive" },
    { text: "Increíble velocidad de entrega y empaque perfecto", sentiment: "positive" },
    { text: "Producto fantástico, funciona exactamente como esperaba", sentiment: "positive" },
    { text: "Estoy encantado con el resultado, superó mis expectativas", sentiment: "positive" },

    // ===================== POSITIVOS EN INGLÉS =====================
    { text: "Amazing product, absolutely love it! High quality and great value", sentiment: "positive" },
    { text: "Excellent customer service, very satisfied with the experience", sentiment: "positive" },
    { text: "Perfect quality, works exactly as described", sentiment: "positive" },
    { text: "Outstanding product, would definitely recommend to friends", sentiment: "positive" },
    { text: "Fantastic purchase, exceeded all my expectations", sentiment: "positive" },
    { text: "Great value for money, very happy with this product", sentiment: "positive" },
    { text: "Superb quality and fast delivery, highly recommended", sentiment: "positive" },
    { text: "Wonderful experience from start to finish", sentiment: "positive" },
    { text: "Brilliant service, quick response and professional help", sentiment: "positive" },
    { text: "Love this product, it's exactly what I needed", sentiment: "positive" },
    { text: "Exceptional quality and attention to detail", sentiment: "positive" },
    { text: "Perfect condition, arrived quickly and well packaged", sentiment: "positive" },
    { text: "Outstanding customer support, very helpful team", sentiment: "positive" },
    { text: "Excellent build quality, very impressed", sentiment: "positive" },
    { text: "Great product at an amazing price, totally worth it", sentiment: "positive" },

    // ===================== NEGATIVOS EN ESPAÑOL =====================
    { text: "Terrible experiencia, nunca más compro aquí", sentiment: "negative" },
    { text: "Producto de muy mala calidad, completamente decepcionado", sentiment: "negative" },
    { text: "Servicio al cliente horrible, no resuelven nada", sentiment: "negative" },
    { text: "Llegó roto y el soporte técnico no ayuda", sentiment: "negative" },
    { text: "Pérdida total de tiempo y dinero, muy frustrado", sentiment: "negative" },
    { text: "Calidad pésima, no funciona como prometían", sentiment: "negative" },
    { text: "Atención al cliente desastrosa, muy mal servicio", sentiment: "negative" },
    { text: "Producto defectuoso desde el primer día", sentiment: "negative" },
    { text: "Muy caro para la baja calidad que ofrece", sentiment: "negative" },
    { text: "Completamente insatisfecho con la compra", sentiment: "negative" },
    { text: "No recomiendo para nada, experiencia horrible", sentiment: "negative" },
    { text: "Entrega tardía y producto en mal estado", sentiment: "negative" },
    { text: "Servicio deficiente, personal poco profesional", sentiment: "negative" },
    { text: "Producto roto al llegar, empaque descuidado", sentiment: "negative" },
    { text: "Muy decepcionado, no vale la pena el precio", sentiment: "negative" },

    // ===================== NEGATIVOS EN INGLÉS =====================
    { text: "Awful product, completely disappointed with the quality", sentiment: "negative" },
    { text: "Terrible customer service, very unhelpful staff", sentiment: "negative" },
    { text: "Broken on arrival, waste of money", sentiment: "negative" },
    { text: "Poor quality, stopped working after one week", sentiment: "negative" },
    { text: "Horrible experience, would not recommend to anyone", sentiment: "negative" },
    { text: "Overpriced for such low quality, very disappointed", sentiment: "negative" },
    { text: "Defective product, customer support ignores emails", sentiment: "negative" },
    { text: "Completely useless, doesn't work as advertised", sentiment: "negative" },
    { text: "Worst purchase ever, total waste of time", sentiment: "negative" },
    { text: "Bad quality control, arrived damaged", sentiment: "negative" },
    { text: "Extremely poor service, very frustrated", sentiment: "negative" },
    { text: "Product failed immediately, unreliable", sentiment: "negative" },
    { text: "Terrible build quality, feels very cheap", sentiment: "negative" },
    { text: "Not worth the money, very poor performance", sentiment: "negative" },
    { text: "Disappointing product, does not meet expectations", sentiment: "negative" },

    // ===================== NEUTRALES EN ESPAÑOL =====================
    { text: "El producto está bien, nada especial pero funciona", sentiment: "neutral" },
    { text: "Cumple su función básica, precio razonable", sentiment: "neutral" },
    { text: "Producto correcto, sin grandes sorpresas", sentiment: "neutral" },
    { text: "Calidad aceptable para el precio que tiene", sentiment: "neutral" },
    { text: "Funciona como se esperaba, nada más", sentiment: "neutral" },
    { text: "Producto estándar, cumple con lo básico", sentiment: "neutral" },
    { text: "Está bien para uso ocasional", sentiment: "neutral" },
    { text: "Ni bueno ni malo, es suficiente", sentiment: "neutral" },
    { text: "Producto promedio, hace lo que dice", sentiment: "neutral" },
    { text: "Calidad media, precio justo", sentiment: "neutral" },
    { text: "Funciona correctamente, sin problemas", sentiment: "neutral" },
    { text: "Producto básico que cumple su propósito", sentiment: "neutral" },
    { text: "Está bien para el precio, sin más", sentiment: "neutral" },
    { text: "Funcionalidad estándar, nada destacable", sentiment: "neutral" },
    { text: "Producto regular, hace su trabajo", sentiment: "neutral" },

    // ===================== NEUTRALES EN INGLÉS =====================
    { text: "Product works fine, nothing special but does the job", sentiment: "neutral" },
    { text: "Average quality, reasonable price point", sentiment: "neutral" },
    { text: "It's okay, meets basic requirements", sentiment: "neutral" },
    { text: "Standard product, does what it's supposed to do", sentiment: "neutral" },
    { text: "Acceptable quality for the price range", sentiment: "neutral" },
    { text: "Works as expected, no major issues", sentiment: "neutral" },
    { text: "Basic functionality, nothing extraordinary", sentiment: "neutral" },
    { text: "Decent product, serves its purpose", sentiment: "neutral" },
    { text: "Fair quality, good enough for occasional use", sentiment: "neutral" },
    { text: "Standard build quality, reasonable value", sentiment: "neutral" },
    { text: "It's fine, no complaints but nothing special", sentiment: "neutral" },
    { text: "Average performance, meets expectations", sentiment: "neutral" },
    { text: "Ordinary product, does the basic job", sentiment: "neutral" },
    { text: "Mediocre but functional, price is fair", sentiment: "neutral" },
    { text: "Standard quality, adequate for basic needs", sentiment: "neutral" },

    // ===================== TEXTOS COMPLEJOS CON CONTEXTO =====================
    { text: "Aunque el precio es alto, la calidad lo justifica completamente", sentiment: "positive" },
    { text: "El servicio fue bueno pero el producto llegó con retraso", sentiment: "neutral" },
    { text: "Despite some minor issues, overall very satisfied with purchase", sentiment: "positive" },
    { text: "Not perfect but good value for money, would buy again", sentiment: "positive" },
    { text: "Started well but quality degraded quickly, disappointing", sentiment: "negative" },
    { text: "Expected more for this price range, somewhat underwhelmed", sentiment: "negative" },
    { text: "Mixed feelings about this product, some good and bad points", sentiment: "neutral" },
    { text: "Funciona bien en general, aunque tiene algunos defectos menores", sentiment: "neutral" },

    // ===================== TEXTOS CON EMOCIONES ESPECÍFICAS =====================
    { text: "¡Estoy súper emocionado con este producto! Es increíble", sentiment: "positive" },
    { text: "Me siento estafado, producto terrible y caro", sentiment: "negative" },
    { text: "Estoy confundido sobre las instrucciones, pero el producto funciona", sentiment: "neutral" },
    { text: "So excited about this purchase! Amazing quality", sentiment: "positive" },
    { text: "Frustrated with the poor customer service experience", sentiment: "negative" },
    { text: "Uncertain about the long-term durability, time will tell", sentiment: "neutral" },

    // ===================== CASOS ESPECÍFICOS DE MARKETING =====================
    { text: "Gran campaña publicitaria, el producto cumple las promesas", sentiment: "positive" },
    { text: "Publicidad engañosa, el producto no es como lo anuncian", sentiment: "negative" },
    { text: "La marca tiene buena reputación y este producto lo confirma", sentiment: "positive" },
    { text: "Brand disappointed me this time, usually they're better", sentiment: "negative" },
    { text: "Competitive pricing compared to similar brands", sentiment: "neutral" },
    { text: "Standard offering from this company, nothing new", sentiment: "neutral" },

    // ===================== EXPANSIÓN: MÁS POSITIVOS ESPAÑOL =====================
    { text: "Increíble atención personalizada, se preocupan realmente por el cliente", sentiment: "positive" },
    { text: "Producto innovador que revoluciona el mercado, muy impresionante", sentiment: "positive" },
    { text: "Superó todas mis expectativas, calidad premium a precio justo", sentiment: "positive" },
    { text: "Experiencia de compra fluida y sin complicaciones", sentiment: "positive" },
    { text: "Entrega ultrarrápida, llegó antes de lo prometido", sentiment: "positive" },
    { text: "Diseño elegante y funcionalidad excepcional", sentiment: "positive" },
    { text: "Relación calidad-precio imbatible en el mercado", sentiment: "positive" },
    { text: "Soporte técnico sobresaliente, resuelven todo al instante", sentiment: "positive" },
    { text: "Producto duradero que mantiene calidad con el tiempo", sentiment: "positive" },
    { text: "Interfaz intuitiva, muy fácil de usar desde el primer momento", sentiment: "positive" },
    { text: "Características avanzadas que marcan la diferencia", sentiment: "positive" },
    { text: "Empaque ecológico y presentación de lujo", sentiment: "positive" },
    { text: "Inversión que vale la pena, resultados inmediatos", sentiment: "positive" },
    { text: "Tecnología de vanguardia, años luz por delante", sentiment: "positive" },
    { text: "Servicio postventa excepcional, siempre disponibles", sentiment: "positive" },

    // ===================== EXPANSIÓN: MÁS POSITIVOS INGLÉS =====================
    { text: "Revolutionary design that sets new industry standards", sentiment: "positive" },
    { text: "Unmatched performance and reliability in daily use", sentiment: "positive" },
    { text: "Premium materials and craftsmanship throughout", sentiment: "positive" },
    { text: "Seamless integration with existing systems", sentiment: "positive" },
    { text: "Cutting-edge technology at an affordable price point", sentiment: "positive" },
    { text: "User-friendly interface with powerful capabilities", sentiment: "positive" },
    { text: "Exceeded expectations in every aspect possible", sentiment: "positive" },
    { text: "Lightning-fast delivery and pristine packaging", sentiment: "positive" },
    { text: "Outstanding durability tested over months of use", sentiment: "positive" },
    { text: "Innovative features that solve real problems", sentiment: "positive" },
    { text: "Best-in-class customer support team", sentiment: "positive" },
    { text: "Elegant design meets practical functionality", sentiment: "positive" },
    { text: "Sustainable product with minimal environmental impact", sentiment: "positive" },
    { text: "Professional-grade quality for everyday users", sentiment: "positive" },
    { text: "Game-changing product that redefines the category", sentiment: "positive" },

    // ===================== EXPANSIÓN: MÁS NEGATIVOS ESPAÑOL =====================
    { text: "Publicidad falsa, el producto real no tiene nada que ver", sentiment: "negative" },
    { text: "Construcción endeble, se rompió a la primera semana", sentiment: "negative" },
    { text: "Atención al cliente inexistente, nadie responde los emails", sentiment: "negative" },
    { text: "Instrucciones confusas e incompletas, imposible de usar", sentiment: "negative" },
    { text: "Precio excesivo para la calidad mediocre que ofrece", sentiment: "negative" },
    { text: "Entrega tardía sin avisos, muy mala comunicación", sentiment: "negative" },
    { text: "Funciones prometidas que simplemente no existen", sentiment: "negative" },
    { text: "Materiales baratos que se deterioran rápidamente", sentiment: "negative" },
    { text: "Incompatible con sistemas básicos, muy frustrante", sentiment: "negative" },
    { text: "Diseño obsoleto y poco práctico para uso diario", sentiment: "negative" },
    { text: "Devolución complicada, políticas abusivas", sentiment: "negative" },
    { text: "Rendimiento pésimo, no cumple especificaciones básicas", sentiment: "negative" },
    { text: "Ruido excesivo y vibración molesta constante", sentiment: "negative" },
    { text: "Empaque descuidado, producto dañado al llegar", sentiment: "negative" },
    { text: "Garantía inútil, no cubren defectos obvios de fábrica", sentiment: "negative" },

    // ===================== EXPANSIÓN: MÁS NEGATIVOS INGLÉS =====================
    { text: "Misleading advertising, product nothing like described", sentiment: "negative" },
    { text: "Cheap construction, broke within first week of use", sentiment: "negative" },
    { text: "Unresponsive customer service, completely ignored complaints", sentiment: "negative" },
    { text: "Confusing instructions, impossible to set up properly", sentiment: "negative" },
    { text: "Overpriced for the substandard quality delivered", sentiment: "negative" },
    { text: "Late delivery without notification, poor communication", sentiment: "negative" },
    { text: "Missing advertised features, feels like a scam", sentiment: "negative" },
    { text: "Flimsy materials that degrade quickly", sentiment: "negative" },
    { text: "Incompatible with standard systems, very frustrating", sentiment: "negative" },
    { text: "Outdated design, impractical for modern needs", sentiment: "negative" },
    { text: "Complicated return process, unfair policies", sentiment: "negative" },
    { text: "Poor performance, doesn't meet basic specifications", sentiment: "negative" },
    { text: "Excessive noise and annoying vibration", sentiment: "negative" },
    { text: "Careless packaging, arrived damaged", sentiment: "negative" },
    { text: "Useless warranty, doesn't cover obvious defects", sentiment: "negative" },

    // ===================== EXPANSIÓN: MÁS NEUTRALES ESPAÑOL =====================
    { text: "Producto estándar que cumple función básica sin sorpresas", sentiment: "neutral" },
    { text: "Calidad aceptable considerando el rango de precio", sentiment: "neutral" },
    { text: "Funciona correctamente pero sin características destacables", sentiment: "neutral" },
    { text: "Diseño simple y funcional para necesidades básicas", sentiment: "neutral" },
    { text: "Entrega puntual, producto tal como se describe", sentiment: "neutral" },
    { text: "Materiales decentes, construcción promedio", sentiment: "neutral" },
    { text: "Interfaz básica que cumple propósito principal", sentiment: "neutral" },
    { text: "Instalación sencilla, uso intuitivo sin complicaciones", sentiment: "neutral" },
    { text: "Rendimiento estable en condiciones normales de uso", sentiment: "neutral" },
    { text: "Opciones limitadas pero suficientes para uso ocasional", sentiment: "neutral" },
    { text: "Empaque funcional sin elementos de lujo", sentiment: "neutral" },
    { text: "Documentación clara y completa", sentiment: "neutral" },
    { text: "Tamaño compacto, fácil almacenamiento", sentiment: "neutral" },
    { text: "Mantenimiento simple, repuestos disponibles", sentiment: "neutral" },
    { text: "Compatible con sistemas estándar del mercado", sentiment: "neutral" },

    // ===================== EXPANSIÓN: MÁS NEUTRALES INGLÉS =====================
    { text: "Standard product that meets basic requirements adequately", sentiment: "neutral" },
    { text: "Acceptable quality considering the price range", sentiment: "neutral" },
    { text: "Functions properly but lacks standout features", sentiment: "neutral" },
    { text: "Simple design suitable for basic needs", sentiment: "neutral" },
    { text: "Timely delivery, product as described", sentiment: "neutral" },
    { text: "Decent materials, average construction quality", sentiment: "neutral" },
    { text: "Basic interface that serves its main purpose", sentiment: "neutral" },
    { text: "Easy installation, straightforward operation", sentiment: "neutral" },
    { text: "Stable performance under normal conditions", sentiment: "neutral" },
    { text: "Limited options but sufficient for occasional use", sentiment: "neutral" },
    { text: "Functional packaging without premium elements", sentiment: "neutral" },
    { text: "Clear and comprehensive documentation provided", sentiment: "neutral" },
    { text: "Compact size, convenient storage", sentiment: "neutral" },
    { text: "Simple maintenance, parts readily available", sentiment: "neutral" },
    { text: "Compatible with standard market systems", sentiment: "neutral" },

    // ===================== CASOS COMPLEJOS Y AMBIGUOS =====================
    { text: "Producto caro pero la calidad premium lo justifica completamente", sentiment: "positive" },
    { text: "Barato pero funciona, no esperes milagros", sentiment: "neutral" },
    { text: "Excelente inicio pero degrada rápido, decepcionante", sentiment: "negative" },
    { text: "Buena idea mal ejecutada, potencial desperdiciado", sentiment: "negative" },
    { text: "Cumple promesas básicas aunque falta innovación", sentiment: "neutral" },
    { text: "Expensive but premium quality justifies the cost completely", sentiment: "positive" },
    { text: "Cheap but functional, don't expect miracles", sentiment: "neutral" },
    { text: "Great start but degrades quickly, disappointing", sentiment: "negative" },
    { text: "Good concept poorly executed, wasted potential", sentiment: "negative" },
    { text: "Meets basic promises though lacks innovation", sentiment: "neutral" },

    // ===================== CONTEXTOS DE REDES SOCIALES =====================
    { text: "¡Wow! Este producto cambió mi vida completamente #gameChanger", sentiment: "positive" },
    { text: "No puedo creer lo malo que es, evítenlo a toda costa", sentiment: "negative" },
    { text: "Meh... está bien para lo que es, nada del otro mundo", sentiment: "neutral" },
    { text: "OMG! Absolutely love this purchase! #BestBuy #Happy", sentiment: "positive" },
    { text: "Worst mistake ever, total waste of money #Regret", sentiment: "negative" },
    { text: "It's okay I guess, does what it says #Average", sentiment: "neutral" },

    // ===================== EMOCIONES INTENSAS =====================
    { text: "Estoy ENAMORADO de este producto, es PERFECCIÓN PURA", sentiment: "positive" },
    { text: "Me da MUCHÍSIMA RABIA, es una ESTAFA TOTAL", sentiment: "negative" },
    { text: "No me emociona pero tampoco me molesta", sentiment: "neutral" },
    { text: "I'm OBSESSED with this product, it's PURE PERFECTION", sentiment: "positive" },
    { text: "This makes me SO ANGRY, it's a COMPLETE SCAM", sentiment: "negative" },
    { text: "Doesn't excite me but doesn't bother me either", sentiment: "neutral" },

    // ===================== CONTEXTOS TÉCNICOS =====================
    { text: "Especificaciones técnicas impresionantes, rendimiento excepcional", sentiment: "positive" },
    { text: "Fallos técnicos constantes, muy inestable", sentiment: "negative" },
    { text: "Especificaciones básicas, rendimiento estándar", sentiment: "neutral" },
    { text: "Outstanding technical specifications, exceptional performance", sentiment: "positive" },
    { text: "Constant technical failures, very unstable", sentiment: "negative" },
    { text: "Basic specifications, standard performance", sentiment: "neutral" },

    // ===================== COMPARACIONES =====================
    { text: "Mucho mejor que la competencia, líder indiscutible", sentiment: "positive" },
    { text: "Inferior a otras opciones del mercado, muy decepcionante", sentiment: "negative" },
    { text: "Similar a otros productos del mercado", sentiment: "neutral" },
    { text: "Much better than competition, undisputed leader", sentiment: "positive" },
    { text: "Inferior to other market options, very disappointing", sentiment: "negative" },
    { text: "Similar to other products in the market", sentiment: "neutral" }];

/**
 * Obtener dataset balanceado
 */
export function getBalancedDataset(): TrainingData[] {
    return SENTIMENT_TRAINING_DATASET;
}

/**
 * Obtener estadísticas del dataset
 */
export function getDatasetStatistics() {
    const stats = {
        total: SENTIMENT_TRAINING_DATASET.length,
        positive: SENTIMENT_TRAINING_DATASET.filter(d => d.sentiment === 'positive').length,
        negative: SENTIMENT_TRAINING_DATASET.filter(d => d.sentiment === 'negative').length,
        neutral: SENTIMENT_TRAINING_DATASET.filter(d => d.sentiment === 'neutral').length,
        languages: {
            spanish: SENTIMENT_TRAINING_DATASET.filter(d =>
                /[áéíóúüñ]/.test(d.text) ||
                /\b(el|la|es|de|en|con|por|para|que|un|una|muy|más|pero|como|todo|bien|mejor|bueno|malo|producto|servicio)\b/i.test(d.text)
            ).length,
            english: SENTIMENT_TRAINING_DATASET.filter(d =>
                !/[áéíóúüñ]/.test(d.text) &&
                /\b(the|a|an|is|of|in|with|for|that|and|or|but|this|product|service|quality|good|bad|great|excellent)\b/i.test(d.text)
            ).length
        }
    };

    console.log(`❌ Negativos: ${stats.negative} (${(stats.negative / stats.total * 100).toFixed(1)}%)`);

    return stats;
}

/**
 * Dividir dataset en entrenamiento y prueba
 */
export function splitDataset(testRatio: number = 0.2): { train: TrainingData[], test: TrainingData[] } {
    const shuffled = [...SENTIMENT_TRAINING_DATASET].sort(() => Math.random() - 0.5);
    const testSize = Math.floor(shuffled.length * testRatio);

    return {
        test: shuffled.slice(0, testSize),
        train: shuffled.slice(testSize)
    };
}
