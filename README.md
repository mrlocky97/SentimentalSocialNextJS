# SentimentalSocial - Twitter Sentiment Analysis API

🚀 **Advanced API for Twitter sentiment analysis with marketing insights**

A complete platform that combines unlimited tweet collection via web scraping, intelligent sentiment analysis, and automatic generation of marketing insights.

## 🌟 Key Features

### 🕷️ **Unlimited Tweet Collection**

- **Real Twitter Scraper**: Cookie-based authentication with @the-convocation/twitter-scraper
- **Smart Fallback System**: Automatic fallback to mock data for development/testing
- **Rate Limiting**: Intelligent controls to avoid blocks
- **Persistent Sessions**: Cookie management for seamless authentication

### 🧠 **Advanced Sentiment Analysis**

- **Sentiment Scoring**: Scale from -1 (very negative) to +1 (very positive)
- **Emotion Analysis**: Detection of 6 emotions (joy, sadness, anger, fear, surprise, disgust)
- **Brand Mention Detection**: Automatic brand mention identification
- **Entity Extraction**: Extraction of people, organizations, and locations
- **Language Detection**: Support for English and Spanish

### 💡 **Automatic Marketing Insights**

- **Brand Perception Analysis**: Real-time brand perception analysis
- **Customer Feedback Detection**: Automatic complaint and feedback identification
- **Influencer Impact Scoring**: Influence scoring based on engagement
- **Trend Identification**: Detection of emerging trends
- **Actionable Recommendations**: Specific recommendations for each insight

### 📊 **Analytics and Reporting**

- **Real-time Statistics**: Live statistics
- **Sentiment Trends**: Temporal trend analysis
- **Batch Processing**: Batch processing up to 100 tweets
- **Performance Metrics**: Detailed performance metrics

## 🏗️ Architecture

```
📁 SentimentalSocial/
├── 🕷️ Hybrid Scraping System
│   ├── TwitterRealScraperService (Cookie-based)
│   ├── TwitterScraperService (Mock fallback)
│   ├── TwitterCookieManager
│   └── Automatic Fallback Logic
├── 🧠 Sentiment Analysis Engine
│   ├── SentimentAnalysisService
│   ├── TweetSentimentAnalysisManager
│   └── Marketing Insights Generator
├── 📊 API Layer
│   ├── Express Server + TypeScript
│   ├── Swagger Documentation
│   └── Rate Limiting & Monitoring
├── 🗄️ Data Layer
│   ├── MongoDB Integration
│   ├── Cookie Session Management
│   └── Performance Tracking
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Twitter/X account (for real scraping)

### 1. Setup Project

```bash
# Clone the repository
git clone <repository-url>
cd sentimentalsocial

# Install dependencies
npm install

# Run setup script
node setup.js
```

### 2. Configure Environment

```bash
# Edit .env.local with your configuration
cp .env.example .env.local
```

### 3. Twitter Authentication (Optional)

For real Twitter scraping, follow the [Twitter Authentication Guide](./TWITTER_AUTHENTICATION.md):

```bash
# 1. Extract cookies from browser (see guide)
# 2. Edit manual-cookies.json
# 3. Import cookies
node import-cookies.js
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## 📋 API Endpoints

### Core Scraping

```bash
# Scrape tweets by hashtag
POST /api/v1/scraping/hashtag
{
  "hashtag": "AI",
  "maxTweets": 50,
  "analyzeSentiment": true
}

# Scrape tweets by user
POST /api/v1/scraping/user
{
  "username": "elonmusk",
  "maxTweets": 30,
  "analyzeSentiment": true
}

# Search tweets
POST /api/v1/scraping/search
{
  "query": "machine learning",
  "maxTweets": 100
}

# Get system status
GET /api/v1/scraping/status
```

### Documentation

- **Swagger UI**: `http://localhost:3001/api-docs`
- **API Info**: `http://localhost:3001/api/v1`
- **Health Check**: `http://localhost:3001/health`
  └── 🗄️ Data Layer
  ├── MongoDB Integration
  ├── Tweet Repository
  └── User Management

````

## 🚀 Quick Start

### Prerequisitos
- Node.js 18+
- MongoDB
- Git

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/mrlocky97/SentimentalSocialNextJS.git
cd SentimentalSocialNextJS

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus configuraciones

# Construir el proyecto
npm run build

# Iniciar el servidor
npm start
````

### Variables de Entorno Requeridas

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/sentimentalsocial

# Twitter API (opcional)
TWITTER_BEARER_TOKEN=your_bearer_token_here

# Servidor
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_here

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 📖 API Documentation

### 🔗 Endpoints Principales

#### **Recolección Híbrida**

```bash
# Estado del sistema
GET /api/v1/hybrid-collection/status

# Recomendaciones para hashtag
GET /api/v1/hybrid-collection/recommendations?hashtag=Nike

# Recolección híbrida
POST /api/v1/hybrid-collection/collect
{
  "hashtag": "Nike",
  "maxTweets": 100,
  "scrapingRatio": 0.8
}
```

#### **Análisis de Sentimientos**

```bash
# Demo con ejemplos
GET /api/v1/sentiment/demo

# Análisis de texto personalizado
POST /api/v1/sentiment/test
{
  "text": "I love Nike shoes! They are amazing!"
}

# Análisis de tweet individual
POST /api/v1/sentiment/analyze
{
  "tweet": {
    "tweetId": "123",
    "content": "Great product!",
    "author": { "username": "user123" }
  }
}

# Análisis en lotes
POST /api/v1/sentiment/batch
{
  "tweets": [...],
  "includeStats": true
}
```

### 📚 Documentación Completa

Una vez iniciado el servidor, accede a la documentación interactiva:

- **Swagger UI**: http://localhost:3001/api-docs
- **API Info**: http://localhost:3001/api/v1

## 🧪 Testing

```bash
# Test de base de datos
npm run test:db

# Test de web scraping
npm run test:scraping

# Test de recolección híbrida
npm run test:hybrid

# Test de análisis de sentimientos
npm run test:sentiment
```

### Unit/Integration tests (Jest)

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report (lcov + html in coverage/)
npm run test:coverage
```

Notes:

- Tests stub critical env vars via tests/setup-env.ts and tests/setup.ts.
- Heavy browsers are not needed for tests; CI skips Playwright/Puppeteer downloads.

## 🤖 CI

GitHub Actions runs build and tests on every push/PR to main. It uploads coverage artifacts.

Badge (replace owner/repo if you fork):

![CI](https://github.com/mrlocky97/SentimentalSocialNextJS/actions/workflows/ci.yml/badge.svg)

## 📊 Ejemplos de Uso

### Análisis de Campaña de Marketing

```javascript
// 1. Recolectar tweets sobre una campaña
const campaignTweets = await fetch('/api/v1/hybrid-collection/collect', {
  method: 'POST',
  body: JSON.stringify({
    hashtag: 'JustDoIt',
    maxTweets: 500,
    scrapingRatio: 0.8,
  }),
});

// 2. Analizar sentimientos
const sentimentAnalysis = await fetch('/api/v1/sentiment/batch', {
  method: 'POST',
  body: JSON.stringify({
    tweets: campaignTweets.data.tweets,
    includeStats: true,
  }),
});

// 3. Obtener insights
const insights = sentimentAnalysis.data.statistics;
console.log(`Sentiment promedio: ${insights.averageSentiment}`);
console.log(`Menciones de marca: ${insights.brandMentionStats.length}`);
```

### Monitoreo de Marca en Tiempo Real

```javascript
// Configurar monitoreo automático
setInterval(async () => {
  const tweets = await collectTweets('Nike', 50);
  const analysis = await analyzeSentiment(tweets);

  // Alertar si sentiment negativo > 70%
  if (analysis.sentimentDistribution.negative > 70) {
    await sendAlert('Negative sentiment spike detected!');
  }
}, 300000); // Cada 5 minutos
```

## 🎯 Casos de Uso

### Para Marketing Teams

- **Campaign Performance**: Análisis en tiempo real de campañas
- **Brand Monitoring**: Monitoreo 24/7 de menciones de marca
- **Competitor Analysis**: Comparación con competidores
- **Crisis Detection**: Detección temprana de crisis de reputación

### Para Data Analysts

- **Sentiment Trends**: Análisis de tendencias temporales
- **Customer Insights**: Comprensión profunda del feedback de clientes
- **Market Research**: Investigación de mercado basada en datos reales
- **ROI Measurement**: Medición del retorno de inversión en marketing

### Para Product Teams

- **User Feedback**: Análisis automático de feedback de usuarios
- **Feature Reception**: Análisis de recepción de nuevas características
- **Pain Point Identification**: Identificación de puntos de dolor de usuarios
- **Product-Market Fit**: Evaluación del ajuste producto-mercado

## 🛠️ Stack Tecnológico

### Backend

- **Express.js**: Framework web
- **TypeScript**: Tipado estático
- **MongoDB**: Base de datos NoSQL
- **Mongoose**: ODM para MongoDB

### Web Scraping

- **Playwright**: Automatización de navegador
- **Twikit**: Librería especializada para Twitter
- **Crawlee**: Framework de web scraping

### Sentiment Analysis

- **Custom Rule-based Engine**: Motor propio de análisis
- **NLP Techniques**: Técnicas de procesamiento de lenguaje natural
- **Emotion Detection**: Detección de emociones avanzada

### DevOps & Tools

- **Swagger**: Documentación de API
- **JWT**: Autenticación
- **bcryptjs**: Hashing de passwords
- **Helmet**: Seguridad HTTP

## 📈 Performance

### Benchmarks

- **Sentiment Analysis**: 0.04ms promedio por texto
- **Batch Processing**: 100 tweets en <100ms
- **Web Scraping**: 1000+ tweets/hora
- **API Throughput**: 1000+ requests/minuto

### Escalabilidad

- **Horizontal Scaling**: Soporte para múltiples instancias
- **Database Optimization**: Índices optimizados para consultas rápidas
- **Caching**: Sistema de caché para respuestas frecuentes
- **Rate Limiting**: Control de tráfico para estabilidad

## 🔒 Seguridad

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **Data Validation**: Validación exhaustiva de datos de entrada
- **Security Headers**: Helmet.js para headers de seguridad
- **CORS Protection**: Configuración CORS restrictiva

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- **Twikit**: Por la excelente librería de scraping de Twitter
- **Playwright**: Por la automatización de navegador robusta
- **OpenAI**: Por inspiración en técnicas de NLP
- **Community**: Por feedback y contribuciones

## 📞 Contacto

- **Developer**: [mrlocky97](https://github.com/mrlocky97)
- **Project Link**: [https://github.com/mrlocky97/SentimentalSocialNextJS](https://github.com/mrlocky97/SentimentalSocialNextJS)

---

<div align="center">

**⭐ Si este proyecto te resulta útil, no olvides darle una estrella! ⭐**

[🚀 Demo Live](https://your-demo-url.com) | [📖 Docs](https://your-docs-url.com) | [🐛 Report Bug](https://github.com/mrlocky97/SentimentalSocialNextJS/issues) | [💡 Request Feature](https://github.com/mrlocky97/SentimentalSocialNextJS/issues)

</div>
