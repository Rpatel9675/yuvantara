// Yuvantara Industry & Technology Content Store
// Centralized data source for all technology and industry pages
(function(window) {
  'use strict';

  var INDUSTRY_CONTENT = {
    "agriculture": {
      "title": "Agriculture Technology",
      "lead": "Smart farming, telemetry sensors, and agricultural data systems. We shape security, infrastructure, and automation around how this domain works.",
      "overview": "Technology solutions in agriculture focus on modernizing farm operations, crop monitoring, resource management, and supply chain tracking through connected systems and data-driven methods. By integrating field telemetry with central cloud analytics, agricultural teams gain timely operational insights while maintaining dependable operations in distributed environments.",
      "technologies": [
        { "name": "IoT Sensors & Telemetry", "desc": "Monitoring soil moisture, ambient temperature, humidity, and local weather conditions in real time." },
        { "name": "Satellite & Drone Imagery Processing", "desc": "Analyzing field health, vegetation indices, and crop stress indicators across large geographic areas." },
        { "name": "Cloud Data Pipelines", "desc": "Aggregating and processing distributed farm telemetry for historical analytics and reporting." },
        { "name": "Edge Computing Gateways", "desc": "Running localized automation and sensor gateways with resilient low-bandwidth connectivity." },
        { "name": "Mobile Field Applications", "desc": "Providing field workers and agronomists with offline-capable data collection and logging tools." }
      ],
      "useCases": [
        { "title": "Precision Irrigation Management", "desc": "Automated irrigation scheduling based on real-time soil moisture and ambient weather readings." },
        { "title": "Crop Health & Pest Monitoring", "desc": "Early detection of anomalies, nutrient deficiencies, and pest vectors through sensor and imagery data." },
        { "title": "Cold Chain & Harvest Logistics", "desc": "Continuous monitoring of storage temperature and transit conditions from harvest to distribution." },
        { "title": "Equipment Telematics & Maintenance", "desc": "Tracking agricultural machinery runtime, fuel utilization, and scheduling preventive servicing." }
      ]
    },
    "machine-learning": {
      "title": "Machine Learning Engineering",
      "lead": "Predictive models, neural architectures, and scalable inference pipelines designed for production environments.",
      "overview": "Machine learning engineering encompasses data preprocessing, model development, validation, deployment, and ongoing monitoring for automated prediction and decision support. We implement robust machine learning pipelines that transition research prototypes into scalable, maintainable production software with verifiable performance.",
      "technologies": [
        { "name": "Python & Scikit-learn", "desc": "Building foundational predictive pipelines, regression models, classification workflows, and feature engineering." },
        { "name": "Deep Learning Frameworks (PyTorch, TensorFlow)", "desc": "Constructing neural network architectures for computer vision, natural language processing, and sequence modeling." },
        { "name": "MLOps & Model Registries (MLflow)", "desc": "Versioning datasets, parameters, artifacts, and deployed models throughout the development lifecycle." },
        { "name": "Vector Databases & Embeddings", "desc": "Indexing high-dimensional vector representations for similarity search and contextual retrieval." },
        { "name": "Model Serving Engines (FastAPI, ONNX)", "desc": "Delivering low-latency REST and gRPC inference endpoints with containerized scalability." }
      ],
      "useCases": [
        { "title": "System Anomaly Detection", "desc": "Identifying operational outliers and potential infrastructure faults in real-time data streams." },
        { "title": "Demand & Resource Forecasting", "desc": "Projecting workload capacity and volume requirements based on historical signals and seasonality." },
        { "title": "Automated Document Classification", "desc": "Extracting structured metadata and categorizing unstructured text documents automatically." },
        { "title": "Personalization & Recommendation", "desc": "Matching user contexts with appropriate actions, tools, and content based on behavior patterns." }
      ]
    },
    "healthcare": {
      "title": "Healthcare IT & Telemetry",
      "lead": "Secure clinical systems, medical standards interoperability, and protected patient record infrastructure.",
      "overview": "Healthcare technology systems prioritize strict patient data privacy, interoperability across clinical standards, clinical workflow support, and continuous infrastructure availability. Solutions are architected to streamline clinical administration while upholding rigorous compliance and data confidentiality standards.",
      "technologies": [
        { "name": "HL7 & FHIR Standards", "desc": "Ensuring standards-compliant healthcare data exchange between electronic records and diagnostic tools." },
        { "name": "Role-Based Access Control (RBAC)", "desc": "Enforcing granular, audit-logged permissions for clinical, administrative, and lab personnel." },
        { "name": "Medical Imaging & DICOM Protocols", "desc": "Transmitting, indexing, and storing diagnostic imaging outputs securely across hospital networks." },
        { "name": "End-to-End Cryptographic Encryption", "desc": "Safeguarding patient health information and diagnostic data both in transit and at rest." },
        { "name": "High-Availability Cluster Infrastructure", "desc": "Guaranteeing continuous uptime and failover capability for mission-critical clinical systems." }
      ],
      "useCases": [
        { "title": "Electronic Medical Record Interoperability", "desc": "Synchronizing clinical histories between diagnostic labs, outpatient clinics, and hospital departments." },
        { "title": "Remote Patient Vitals Monitoring", "desc": "Ingesting telemetry from authenticated bedside and home medical devices with alert thresholds." },
        { "title": "Laboratory Information Management", "desc": "Managing sample chain-of-custody, technician sign-offs, and automated lab report delivery." },
        { "title": "Clinical Resource Scheduling", "desc": "Coordinating clinician availability, diagnostic room allocations, and patient intake workflows." }
      ]
    },
    "logistics": {
      "title": "Logistics & Supply Chain",
      "lead": "Real-time tracking, warehouse management, route optimization, and transparent consignment visibility.",
      "overview": "Logistics and supply chain technology solutions streamline inventory tracking, warehouse operations, route planning, and end-to-end freight visibility. By connecting telematics gateways with central operational dashboards, logistics organizations reduce transit delays and enhance operational transparency.",
      "technologies": [
        { "name": "Barcode & RFID Tracking", "desc": "Enabling rapid scanning, item identification, and automated receipt logging across checkpoints." },
        { "name": "GPS & Telematics Gateways", "desc": "Transmitting vehicle location, speed, fuel utilization, and route adherence data in real time." },
        { "name": "Warehouse Management Engines (WMS)", "desc": "Organizing bin allocation, pick-and-pack routing, and automated stock level alerts." },
        { "name": "Spatial & Routing Algorithms", "desc": "Computing optimal multi-stop transit paths factoring in road constraints and delivery windows." },
        { "name": "Event-Driven Message Brokers", "desc": "Distributing real-time status updates across dispatchers, drivers, and customer tracking portals." }
      ],
      "useCases": [
        { "title": "End-to-End Consignment Visibility", "desc": "Providing real-time checkpoint updates and exception alerts from origin to final destination." },
        { "title": "Warehouse Inventory Reconciliation", "desc": "Automated cycle counts, barcode audits, and reorder trigger notifications." },
        { "title": "Last-Mile Delivery Dispatching", "desc": "Dynamic task allocation and turn-by-turn routing for urban distribution fleets." },
        { "title": "Digital Proof of Delivery (e-POD)", "desc": "Capturing digital signatures, photo confirmations, and timestamps upon consignment handover." }
      ]
    },
    "education": {
      "title": "Education & Learning Technology",
      "lead": "Digital learning management, virtual classrooms, automated assessments, and verified credentialing.",
      "overview": "Educational technology platforms support institutional learning management, virtual classrooms, student assessment, curriculum delivery, and academic record keeping. We build scalable platforms that deliver responsive learning experiences for students, educators, and institutional administrators.",
      "technologies": [
        { "name": "Learning Management Platforms (LMS)", "desc": "Hosting structured course syllabi, lecture modules, graded assignments, and discussion boards." },
        { "name": "Real-Time WebRTC Media Streams", "desc": "Powering interactive video lectures, mentoring sessions, and screen-sharing workshops." },
        { "name": "Automated Assessment Engines", "desc": "Delivering randomized question pools, automated code evaluators, and test result analytics." },
        { "name": "Cloud Content Delivery Networks (CDN)", "desc": "Distributing high-definition video lessons and digital coursework with low latency." },
        { "name": "Single Sign-On & Identity Federation", "desc": "Unifying access across institutional portals, virtual lab environments, and digital libraries." }
      ],
      "useCases": [
        { "title": "Structured Internship & Coursework Delivery", "desc": "Delivering modular industrial training tracks with progressive milestone unlocks." },
        { "title": "Automated Lab & Code Evaluation", "desc": "Testing student code submissions against automated test cases with immediate feedback." },
        { "title": "Tamper-Evident Digital Credentialing", "desc": "Generating cryptographic certificates with verification QR codes and registry tracking." },
        { "title": "Academic Progress Analytics", "desc": "Providing mentors and program coordinators with granular visibility into student performance." }
      ]
    },
    "ai": {
      "title": "Artificial Intelligence Solutions",
      "lead": "Conversational agents, knowledge retrieval, natural language parsing, and autonomous workflows.",
      "overview": "Artificial intelligence solutions integrate modern generative models, knowledge retrieval systems, natural language understanding, and automated workflows into organizational operations. We focus on practical, grounded implementations that enhance human productivity while maintaining strict output verification.",
      "technologies": [
        { "name": "Large Language Model Integrations", "desc": "Deploying foundation models for document summarization, information extraction, and synthesis." },
        { "name": "Retrieval-Augmented Generation (RAG)", "desc": "Grounding model responses in verified organizational document stores and technical knowledge bases." },
        { "name": "Natural Language Processing (NLP)", "desc": "Parsing unstructured text for entity recognition, intent categorization, and key information extraction." },
        { "name": "Agentic Workflow Orchestration", "desc": "Coordinating multi-step task execution with structured tool-calling and deterministic error handling." },
        { "name": "AI Safety & Output Validation", "desc": "Enforcing schema compliance, input sanitization, and hallucination reduction guardrails." }
      ],
      "useCases": [
        { "title": "Institutional Knowledge Assistants", "desc": "Querying internal technical manuals, guidelines, and documentation with verifiable citations." },
        { "title": "Automated Inquiry Classification", "desc": "Triaging incoming communications, summarizing context, and routing requests to appropriate teams." },
        { "title": "Code Review & Quality Auditing", "desc": "Assisting development teams by scanning code changes for stylistic conformance and documentation." },
        { "title": "Automated Report Synthesis", "desc": "Aggregating multi-source operational metrics into structured executive briefing notes." }
      ]
    },
    "robotics": {
      "title": "Robotics & Embedded Systems",
      "lead": "Hardware automation, real-time control logic, microcontrollers, and sensor-actuator integration.",
      "overview": "Robotics and embedded systems solutions bridge hardware control, sensor integration, real-time operating systems, and automation logic for industrial and research applications. We develop robust firmware and controller software designed for deterministic physical execution in demanding field environments.",
      "technologies": [
        { "name": "Robot Operating System (ROS / ROS 2)", "desc": "Utilizing modular robotics middleware for inter-process communication, navigation, and kinematics." },
        { "name": "Embedded Microcontrollers (ARM, STM32, ESP32)", "desc": "Developing C/C++ firmware for low-latency sensor acquisition, motor control, and hardware interrupts." },
        { "name": "Computer Vision & Edge Processing", "desc": "Processing video feeds on edge accelerators for obstacle detection, tag recognition, and visual servoing." },
        { "name": "Industrial Fieldbus Protocols (CAN, Modbus, MQTT)", "desc": "Interfacing embedded controllers with industrial programmable automation systems." },
        { "name": "Real-Time Operating Systems (FreeRTOS)", "desc": "Ensuring predictable execution timelines and task preemption for critical control loops." }
      ],
      "useCases": [
        { "title": "Autonomous Mobile Robotics (AMR)", "desc": "Facilitating warehouse transport, obstacle avoidance, and path planning in indoor facilities." },
        { "title": "Industrial Pick-and-Place Automation", "desc": "Controlling articulated robotic arms for precision sorting, assembly, and packaging." },
        { "title": "Remote Environmental Inspection", "desc": "Deploying sensor-equipped mobile rovers for telemetry collection in hazardous areas." },
        { "title": "IoT Edge Gateway Deployment", "desc": "Translating physical sensor signals into structured network packets for central monitoring." }
      ]
    },
    "innovation": {
      "title": "Innovation & Prototyping",
      "lead": "Rapid concept validation, architecture proofs of concept, agile modernization, and emerging tech.",
      "overview": "Innovation engineering accelerates product prototyping, proofs of concept, agile system modernization, and emerging technology experimentation for forward-looking teams. We help organizations test technical feasibility, refine requirements, and de-risk new architectures before committing to large-scale deployment.",
      "technologies": [
        { "name": "Rapid Prototype Frameworks", "desc": "Building functional proof-of-concept applications using modern modular component libraries." },
        { "name": "Containerization & Microservices (Docker)", "desc": "Packaging application components into portable, isolated containers with predictable execution." },
        { "name": "Serverless & Event-Driven Compute", "desc": "Running targeted functional services that execute on demand with zero idle infrastructure cost." },
        { "name": "Modern API Standards (REST & GraphQL)", "desc": "Structuring clean interface contracts that enable rapid frontend and mobile client integration." },
        { "name": "Automated Testing & CI/CD Pipelines", "desc": "Validating code changes continuously with automated regression suites and deployment gates." }
      ],
      "useCases": [
        { "title": "Architectural Feasibility Validation", "desc": "Benchmarking prospective database and messaging architectures under simulated load." },
        { "title": "Legacy System Modernization", "desc": "Wrapping monolithic services in modern API layers to facilitate progressive component migration." },
        { "title": "Developer Sandbox Environments", "desc": "Providing engineering teams with isolated sandbox environments for testing new software stacks." },
        { "title": "Technology Evaluation Frameworks", "desc": "Structuring objective criteria to compare alternative frameworks, libraries, and vendor platforms." }
      ]
    },
    "python": {
      "title": "Python Engineering & Automation",
      "lead": "Full-stack web applications, data processing pipelines, backend APIs, and automation scripts.",
      "overview": "Python engineering services deliver robust web applications, data processing pipelines, automation scripting, and backend API development utilizing the extensive Python ecosystem. We emphasize clean architecture, static type analysis, and comprehensive testing to deliver durable production software.",
      "technologies": [
        { "name": "Web Frameworks (Django, FastAPI, Flask)", "desc": "Architecting secure, scalable RESTful web APIs and asynchronous application backends." },
        { "name": "Data Analysis & Manipulation (Pandas, NumPy)", "desc": "Processing structured tabular data, performing calculations, and transforming complex datasets." },
        { "name": "Asynchronous Task Queues (Celery, Redis)", "desc": "Managing distributed background execution, long-running data jobs, and periodic task scheduling." },
        { "name": "Headless Browser Automation (Playwright, Selenium)", "desc": "Automating web workflows, end-to-end user journey validation, and data collection routines." },
        { "name": "Quality & Type Tooling (Pytest, Mypy, Ruff)", "desc": "Maintaining rigorous code standards through static analysis, linting, and automated unit testing." }
      ],
      "useCases": [
        { "title": "Automated Data Ingestion Pipelines", "desc": "Extracting records from heterogeneous sources, validating schemas, and populating data stores." },
        { "title": "Administrative Automation & Tooling", "desc": "Scripting repetitive system maintenance, log aggregation, and user account management." },
        { "title": "Asynchronous Backend Web Services", "desc": "Powering responsive frontend interfaces with high-performance asynchronous API endpoints." },
        { "title": "Batch Document Processing", "desc": "Generating automated PDF reports, parsing uploaded spreadsheets, and dispatching notification emails." }
      ]
    },
    "management": {
      "title": "IT & Systems Management",
      "lead": "Operational governance, IT service desk management, infrastructure monitoring, and policy enforcement.",
      "overview": "Technology management solutions provide organizations with operational visibility, resource planning, project governance, and IT service desk management to align technical teams with organizational goals. We establish structured processes and tools that maintain system reliability and compliance across departments.",
      "technologies": [
        { "name": "IT Service Management (ITSM)", "desc": "Managing technical incidents, service tickets, change requests, and resolution workflows." },
        { "name": "Agile Project & Milestone Tracking", "desc": "Coordinating engineering sprint backlogs, task assignments, and delivery milestones." },
        { "name": "Infrastructure Monitoring & Telemetry", "desc": "Tracking server health, memory utilization, disk thresholds, and network latency metrics." },
        { "name": "Role-Based Governance & Audit Trails", "desc": "Maintaining tamper-evident logs of administrative actions, permission grants, and data modifications." },
        { "name": "Operational Dashboards & BI Reporting", "desc": "Visualizing key performance indicators, service level metrics, and team resource allocation." }
      ],
      "useCases": [
        { "title": "Centralized Technical Service Desk", "desc": "Logging, prioritizing, and resolving technical support requests with defined resolution targets." },
        { "title": "Change Management & Release Governance", "desc": "Reviewing system changes through structured approval gates before production rollout." },
        { "title": "Asset Lifecycle & License Management", "desc": "Tracking organizational hardware inventory, software licenses, and maintenance contracts." },
        { "title": "Policy & Regulatory Compliance Auditing", "desc": "Ensuring IT operations conform to institutional cybersecurity policies and data privacy standards." }
      ]
    },
    "financial": {
      "title": "Financial Technology & Security",
      "lead": "Secure payment integrations, transaction hashing, financial audit logs, and accounting compliance.",
      "overview": "Financial technology solutions emphasize data integrity, regulatory compliance, transaction security, automated accounting, and fault-tolerant payment flows. We build systems that protect monetary data, verify payment signatures, and maintain immutable audit trails of financial transactions.",
      "technologies": [
        { "name": "Payment Gateway Integrations", "desc": "Supporting card payments, UPI, net banking, and automated webhooks with signature verification." },
        { "name": "Cryptographic Signing (HMAC, SHA-256)", "desc": "Ensuring payment callbacks and transaction payloads cannot be modified or replayed." },
        { "name": "Double-Entry Accounting Architecture", "desc": "Enforcing balanced debit and credit entries to maintain mathematically verifiable financial ledgers." },
        { "name": "Tokenization & Sensitive Data Masking", "desc": "Isolating payment identifiers and preventing storage of sensitive card or banking credentials." },
        { "name": "Automated Tax Invoice Engines", "desc": "Generating sequential, GST-compliant tax invoices with itemized tax splits and download options." }
      ],
      "useCases": [
        { "title": "Automated Enrollment Fee Processing", "desc": "Managing secure student registration payments with instant receipt and invoice generation." },
        { "title": "Bank Reconciliation & Settlement Matching", "desc": "Matching payment gateway settlement records against internal order tables automatically." },
        { "title": "Audit-Logged Financial Adjustments", "desc": "Recording all fee waivers, refunds, and balance adjustments with locked administrative attribution." },
        { "title": "Regulatory & Tax Reporting Exports", "desc": "Exporting structured financial summaries for tax preparation and external accounting audits." }
      ]
    }
  };

  window.INDUSTRY_CONTENT = INDUSTRY_CONTENT;
})(window);
