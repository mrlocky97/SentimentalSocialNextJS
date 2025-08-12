# CodeViz Research Context

> **Note**: This file contains research context from CodeViz. Most recent contexts are at the bottom.

---

## Research Query

parece 2 proyectos a la ves, es un caos

*Session: 6cbef59066afd872cbaf6aaa47a7aa22 | Generated: 8/12/2025, 10:27:38 PM*

### Analysis Summary

# Codebase Architecture Overview: SentimentalSocial

The codebase for SentimentalSocial is structured to support both a **real-time API/web application** and **offline data processing/model evaluation tasks**. This dual nature, while providing comprehensive functionality, can initially give the impression of "two projects at once."

## High-Level Architecture

The system can be broadly divided into two main conceptual areas:

1.  **API & Web Application Layer:** Handles incoming HTTP requests, serves the dashboard, manages user interactions, and provides sentiment analysis results via API endpoints. This is the "online" part of the system.
2.  **Sentiment Analysis & Data Processing Core:** Contains the core logic for sentiment analysis, model training, data persistence, and various utility functions. This core is utilized by the API layer and also by standalone scripts for offline tasks.

### Core Components and Their Relationships

The primary entry point for the API and web application is [src/server.ts](src/server.ts). This file sets up the Express.js server and integrates various middleware, routes, and services.

#### **1. API & Web Application Layer**

This layer is responsible for exposing functionality to external clients (e.g., web browsers, other applications) and managing the application's state.

*   **[Server Entry Point](src/server.ts)**:
    *   **Purpose**: Initializes the Express.js application, configures middleware (e.g., authentication, logging, rate limiting), connects to the database, and mounts API routes.
    *   **Internal Parts**: Imports and uses various [middleware](src/middleware/), [routes](src/routes/), and [services](src/services/).
    *   **External Relationships**: Listens for incoming HTTP requests and dispatches them to the appropriate route handlers.

*   **[Controllers](src/controllers/)**:
    *   **Purpose**: Handle specific API requests, process input, interact with services, and send responses. They act as the interface between the HTTP layer and the business logic.
    *   **Internal Parts**: Examples include [dashboard.controller.ts](src/controllers/dashboard.controller.ts) for dashboard-related data, [health.controller.ts](src/controllers/health.controller.ts) for application health checks, and [metrics.controller.ts](src/controllers/metrics.controller.ts) for exposing application metrics.
    *   **External Relationships**: Called by [routes](src/routes/) and utilize [services](src/services/) to perform business logic.

*   **[Routes](src/routes/)**:
    *   **Purpose**: Define the API endpoints and map them to specific controller methods. They organize the application's URL structure.
    *   **Internal Parts**: Files like [sentiment.ts](src/routes/sentiment.ts) define routes related to sentiment analysis, [auth.ts](src/routes/auth.ts) for authentication, and [campaigns.ts](src/routes/campaigns.ts) for campaign management.
    *   **External Relationships**: Registered with the main Express application in [src/server.ts](src/server.ts) and direct incoming requests to [controllers](src/controllers/).

*   **[Middleware](src/middleware/)**:
    *   **Purpose**: Intercept and process requests before they reach the route handlers or responses before they are sent. They handle cross-cutting concerns like authentication, logging, and rate limiting.
    *   **Internal Parts**: Examples include [auth.ts](src/middleware/auth.ts) for authentication, [intelligent-rate-limit.ts](src/middleware/intelligent-rate-limit.ts) for rate limiting, and [request-logging.ts](src/middleware/request-logging.ts) for logging requests.
    *   **External Relationships**: Chained together and executed in sequence by the Express.js application.

#### **2. Sentiment Analysis & Data Processing Core**

This core provides the underlying business logic and data management capabilities, serving both the API layer and standalone scripts.

*   **[Services](src/services/)**:
    *   **Purpose**: Encapsulate the business logic and orchestrate interactions with data sources and other services. They are the heart of the application's functionality.
    *   **Internal Parts**: Key services include [enhanced-sentiment.service.ts](src/services/enhanced-sentiment.service.ts) and [naive-bayes-sentiment.service.ts](src/services/naive-bayes-sentiment.service.ts) for sentiment analysis, [model-persistence.service.ts](src/services/model-persistence.service.ts) for saving and loading models, and [auth.service.ts](src/services/auth.service.ts) for authentication logic.
    *   **External Relationships**: Consumed by [controllers](src/controllers/) and [scripts](src/scripts/) to perform specific tasks. They interact with [repositories](src/repositories/) for data access.

*   **[Repositories](src/repositories/)**:
    *   **Purpose**: Abstract the data storage layer, providing methods for interacting with the database (e.g., MongoDB). They separate data access logic from business logic.
    *   **Internal Parts**: Examples include [mongo-campaign.repository.ts](src/repositories/mongo-campaign.repository.ts) for campaign data, [mongo-tweet.repository.ts](src/repositories/mongo-tweet.repository.ts) for tweet data, and [mongo-user.repository.ts](src/repositories/mongo-user.repository.ts) for user data.
    *   **External Relationships**: Used by [services](src/services/) to persist and retrieve data.

*   **[Lib Utilities](src/lib/)**:
    *   **Purpose**: Contains various utility functions and helper modules that support different parts of the application.
    *   **Internal Parts**: Includes modules for [sentiment](src/lib/sentiment/), [database](src/lib/database/), [config](src/lib/config/), and [utils](src/lib/utils/).
    *   **External Relationships**: Used across [controllers](src/controllers/), [services](src/services/), and [scripts](src/scripts/).

*   **[Scripts](src/scripts/)**:
    *   **Purpose**: Contains standalone scripts for various tasks, often related to development, maintenance, or offline data processing. This is a significant contributor to the "two projects" feeling, as these scripts operate independently of the running server.
    *   **Internal Parts**: Examples include [train-sentiment-model.ts](src/scripts/train-sentiment-model.ts) for training the sentiment model, [save-trained-model.ts](src/scripts/save-trained-model.ts) for persisting models, and various `test-*.ts` scripts for testing different aspects of the system.
    *   **External Relationships**: Directly interact with [services](src/services/) and [data](src/data/) to perform their tasks. They are typically run via the command line.

*   **[Data](src/data/)**:
    *   **Purpose**: Stores static data, such as trained sentiment models and test datasets.
    *   **Internal Parts**: Includes [trained-sentiment-model.json](src/data/trained-sentiment-model.json), [model-metadata.json](src/data/model-metadata.json), and [test-datasets.ts](src/data/test-datasets.ts).
    *   **External Relationships**: Accessed by [services](src/services/) (e.g., [model-persistence.service.ts](src/services/model-persistence.service.ts)) and [scripts](src/scripts/) (e.g., [train-sentiment-model.ts](src/scripts/train-sentiment-model.ts)).

## Why it might feel like "two projects"

The perception of "two projects" likely arises from the clear separation between:

1.  **The continuously running web server and API (Express.js application):** This handles real-time requests and user interactions.
2.  **The collection of independent scripts:** These are used for tasks like model training, evaluation, and data manipulation, which are often run as one-off processes or scheduled jobs, separate from the main application's runtime.

While distinct in their execution context, both parts share and rely heavily on the common **Sentiment Analysis & Data Processing Core** ([src/services/](src/services/), [src/lib/](src/lib/), [src/data/](src/data/), [src/repositories/](src/repositories/)). This shared core is what unifies the two "sides" of the project. The project is designed this way to allow for flexible model management and data processing outside of the live API environment, while still leveraging the same core logic.

