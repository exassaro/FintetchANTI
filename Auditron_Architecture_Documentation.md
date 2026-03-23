# 1. Introduction

Financial transaction processing is fundamentally challenged by the massive volume of unstandardized data, the complexity of dynamic taxation slabs (GST at 0%, 5%, 18%, 40%), and an inherently high rate of human error. Traditional compliance workflows rely on post-facto manual effort, creating significant bottlenecks and exposing organizations to unmitigated anomaly risks.

**Auditron** is an AI-driven intelligent system engineered to automate and secure these financial workflows. The platform operates as a decision intelligence platform (not an accounting system), designed to augment existing data pipelines with machine learning inference. 

Key capabilities of the platform include:
*   **Automated GST Classification:** Dynamic, schema-aware mapping of disparate transaction records into defined GST tax slabs.
*   **Multivariate Anomaly Detection:** Ensemble-based detection of both structural outliers and semantic anomalies in transaction sequences.
*   **Time-Series Forecasting:** Predictive modeling of transaction volumes and category distributions over time.
*   **Human-in-the-Loop (HITL) Review:** Native feedback mechanisms that capture human corrections to construct high-fidelity datasets for continuous model improvement.

---

# 2. Methodology

The platform components are compartmentalized by function, utilizing modern data science and microservice engineering standards.

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **ML Models** | Random Forest, Isolation Forest, Autoencoder, TF-IDF | Classification of transactions and primary detection of numerical anomalies. |
| **NLP** | Sentence Transformers | Embedding generation for semantic text anomaly detection. |
| **Orchestration** | Microservices, RESTful API | Domain-driven isolation of core system functionalities ensuring scalability. |
| **Backend Core** | FastAPI (Python) | High-performance, asynchronous API routing and execution context. |
| **Frontend** | React | Single-page application (SPA) providing the user interface and human review dashboard. |
| **Storage** | PostgreSQL, Local File Storage | Relational persistence for metadata and local volume storage for raw/processed CSV arrays. |
| **MLOps** | MLflow | Experiment tracking, model registry, and lifecycle management (promotion logic). |
| **Deployment** | Docker, CI/CD | Containerization of services and automated testing/deployment pipelines. |

---

# 3. System Design and Architecture

## 3.1 High-Level Architecture

Auditron utilizes a **microservices-based architecture**, allowing horizontal scalability and isolated failure domains. Each service encapsulates a distinct business domain and communicates over standard HTTP protocols. 

The standard request flow follows:
`User → Frontend → API Gateway → Core Services → DB / MLflow`

### System Flow Diagram

```text
       [ User Interface Layer ]
                 │
                 ▼
       [ Frontend UI / React ]
                 │
                 ▼
      [ API Gateway / Router ]
                 │
                 ├──────────────────────────────┐
                 ▼                              ▼
      [ Core Services Layer ]           [ ML Services Layer ]
       • Auth Service                    • Classification Service
       • Analytics Service               • Anomaly Detection Service
                                         • Retraining Service
                 │                              │
                 └──────────────┬───────────────┘
                                ▼
                      [ Data & ML Layer ]
                    • PostgreSQL (Metadata)
                    • MLflow (Model Registry)
                    • File Storage (CSV State)
```

---

# 4. Detailed Module Architecture

## Module 1 – Orchestrator / System Flow

The system orchestrator functions as the primary nervous system for the platform, ensuring correct serialization of tasks across distributed components without maintaining heavy state overhead.

**Core Functions:**
*   **Route API calls:** Direct incoming web traffic from the frontend to the appropriate microservice endpoints.
*   **Manage pipeline flow:** Sequence asynchronous operations (e.g., waiting for classification to finish before initiating anomaly detection).
*   **Maintain state:** Track temporary file paths, job IDs, and system metadata during the span of a transaction batch.

## Module 2 – Classification Architecture

This module forms the primary inference engine for GST categorization, designed to handle highly varied inbound CSV structures via schema hashing.

**Components:**
1.  **Data Ingestion:** Secure HTTP consumption of raw CSV streams to isolated staging directories.
2.  **Schema Detection:** Programmatic identification of file format to apply correct parsing logic.
3.  **Feature Engineering:** Column regularization and vectorization.
4.  **ML Classification:** Supervised inference.
5.  **Output Generation:** Structuring results into standardized payload schemas.

**Core Functions:**
*   **Detect schema (A/B/C/D/H):** Route data to the proper preprocessing pipeline based on column signatures.
*   **TF-IDF + Random Forest prediction:** Extract textual features and predict the target variable (GST slab: 0%, 5%, 18%, 40%).
*   **Confidence scoring:** Output probability metrics for each classification to determine confidence and trigger manual review if below threshold.

## Module 3 – Anomaly Detection Architecture

The anomaly system uses an ensemble approach to cover both numerical deviations (e.g., highly unusual price variations) and textual deviations (e.g., illogical merchant-category relationships).

**Components:**
1.  **Numeric Detector:** Analysis of quantitative fields.
2.  **Text Detector:** Analysis of unstructured string fields.
3.  **Confidence Analyzer:** Synthesis of anomaly scores.
4.  **Ensemble Scoring:** Final risk weighting.

**Core Functions:**
*   **Isolation Forest:** Identify statistical outliers in multi-dimensional numeric space.
*   **Autoencoder:** Detect complex reconstruction errors indicating hidden structural deviations.
*   **Embedding similarity:** Utilize Sentence Transformers to flag semantic anomalies in unstructured text.
*   **Adaptive thresholding:** Dynamically adjust anomaly sensitivity based on historical batch distributions.

## Module 4 – Analytics & Decision Layer

This layer converts raw prediction metadata into actionable business intelligence, interfacing directly with the user.

**Components:**
*   **Dashboard:** High-level system telemetry and aggregate reporting.
*   **Review Queue:** Interactive table containing low-confidence predictions or flagged anomalies.
*   **Forecasting Engine:** Predictive module for future data trends.
*   **Chatbot / Explanation:** Natural language interface for query-based system insights.

**Core Functions:**
*   **KPI visualization:** Render metrics summarizing total processed entries, anomaly rates, and processing latency.
*   **Human validation:** Accept overrides from human reviewers and record the delta back to the database.
*   **Time-series forecasting:** Use algorithms (Prophet, ARIMA) to project future volume and anomaly load.
*   **Insight generation:** Provide explainable contexts for flagged transactions.

## Module 5 – Retraining & MLOps Architecture

The MLOps module closes the loop of the system logic. It ensures that the primary models do not stagnate over time and adapt to shifting transaction patterns captured via human feedback.

**Core Functions:**
*   **Dataset aggregation:** Compile raw data, predictions, and human corrections into a ground-truth retraining corpus.
*   **Model training:** Execute scheduled pipeline jobs to refit Random Forest models dynamically.
*   **Evaluation (Macro-F1):** Score candidate models against standard validation matrices with a focus on minority class precision.
*   **MLflow tracking:** Log parameters, artifacts, and metrics to prevent zombie models and ensure reproducibility.
*   **Promotion logic:** Conditionally advance a model from `Staging` to `Production` in the MLflow registry only if its validation metrics exceed the existing baseline.

---

# 5. Data Flow / Pipeline

The end-to-end lifecycle of a data batch follows a strict deterministic sequence:

`Raw CSV → Preprocessing → Classification → Anomaly Detection → Dashboard → Review Queue → Corrections → Retraining`

---

# 6. Key Design Principles

Auditron is built adhering to the following structural constraints to ensure production-grade reliability:

*   **Microservices separation:** Hard boundaries between logic domains to decouple deployment and scaling constraints.
*   **Stateless services:** API servers do not maintain local memory state between requests, relying entirely on persistence layers.
*   **File-based data exchange:** Heavy data matrices are exchanged via volume mounts or storage references, avoiding memory saturation on HTTP transport layers.
*   **Human-in-the-loop learning:** The architecture considers human override a first-class citizen, required to mitigate model drift.
*   **Model lifecycle management:** Strict adherence to MLOps promotion gates ensures broken or overfit models do not silently graduate to production environments.

---

# 7. Conclusion

Auditron achieves a scalable fintech AI platform via the modular composition of modern distributed systems and robust machine learning pipelines. By operating independently of core accounting structures, it provides an auxiliary decision intelligence layer capable of real-time multi-dimensional inference. The synthesis of automated ML validation with explicit human-in-the-loop fallback creates a system tailored for rigid real-world compliance workflows, maintaining high adaptability to arbitrary financial data anomalies.
