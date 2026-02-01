# Requirements Document: ADRYFT Behavioral OS

## Introduction

ADRYFT is a behavioral OS for JEE/NEET aspirants in India - an AI-powered EdTech platform that addresses critical behavioral and psychological challenges faced by 23 million students. The system eliminates time management paralysis, improves focus quality, prevents burnout, reduces isolation, and maintains extracurricular engagement through five integrated AI-powered features.

## Problem Statement

JEE/NEET aspirants in India face a behavioral crisis that traditional EdTech platforms fail to address:

- **Time Management Paralysis**: Students spend 3+ hours daily planning instead of studying, leading to decision fatigue
- **Focus Quality Issues**: Only 21-25% of logged study time represents genuine learning engagement
- **Burnout Epidemic**: High-stress preparation leads to mental health crises and 70% dropout rates
- **Social Isolation**: Competitive environment creates isolation, reducing peer support and motivation
- **Inefficient Practice**: Generic problem sets don't target individual weak areas, wasting valuable preparation time

These behavioral challenges affect 23 million students annually, representing a massive opportunity for systematic intervention through AI-powered behavioral optimization.

## Business Requirements

### Business Objectives
- **Market Penetration**: Capture significant share of the 23 million JEE/NEET aspirant market
- **Revenue Model**: Validate ₹200-500/student/month pricing through demonstrated value delivery
- **Coaching Center Partnerships**: Improve coaching center completion rates from 30% to 92%
- **Scalability**: Build platform capable of serving millions of concurrent users
- **Competitive Advantage**: Establish behavioral OS as differentiated category in EdTech market

### Success Metrics
- **User Engagement**: 65% 4-week retention rate (vs 30% industry baseline)
- **Learning Outcomes**: 171% improvement in focus quality (57% vs 21% baseline)
- **Wellness Impact**: 73% burnout prevention rate for at-risk students
- **Operational Efficiency**: 95% reduction in daily planning time (3 hours to 15 minutes)
- **Customer Satisfaction**: Net Promoter Score (NPS) of 70 or higher

## Glossary

- **ADRYFT_System**: The complete behavioral OS platform including all five integrated features
- **AI_Scheduler**: The adaptive scheduling component using CSP optimization
- **RIVER**: The multi-sensor focus quality detection system
- **Burnout_Engine**: The machine learning burnout prediction and intervention system
- **Study_Pods**: The AI-matched peer group feature with campfire visualization
- **Practice_Generator**: The adaptive problem generation system using Bayesian testing
- **Focus_Quality_Score**: Composite metric measuring genuine learning engagement (0-100%)
- **CSP_Solver**: Constraint Satisfaction Problem solver for schedule optimization
- **Behavioral_OS**: Operating system layer that manages student behavior patterns
- **JEE_Aspirant**: Student preparing for Joint Entrance Examination
- **NEET_Aspirant**: Student preparing for National Eligibility cum Entrance Test
- **Chronotype**: Individual circadian rhythm pattern affecting peak cognitive performance
- **Spaced_Repetition**: Learning technique using increasing intervals between reviews

## Stakeholders

### Primary Stakeholders
- **JEE/NEET Aspirants**: Students aged 16-18 preparing for competitive entrance exams
- **Parents**: Guardians concerned about student wellness and academic performance
- **Coaching Centers**: Educational institutions seeking to improve student outcomes and retention

### Secondary Stakeholders
- **Educational Content Creators**: Subject matter experts providing curriculum and problem banks
- **Mental Health Professionals**: Counselors and psychologists supporting student wellness
- **Technology Partners**: AI/ML service providers and infrastructure partners

### Regulatory Stakeholders
- **Data Protection Authorities**: Ensuring compliance with Indian and international privacy laws
- **Educational Boards**: CBSE, state boards governing curriculum standards
- **Examination Bodies**: NTA (JEE), NMC (NEET) setting exam standards and patterns

## Constraints and Assumptions

### Technical Constraints
- **Device Compatibility**: Must support Android/iOS devices with minimum 2GB RAM
- **Network Dependency**: Core features must work offline with periodic synchronization
- **Performance Requirements**: Sub-3-second response times for all critical operations
- **Privacy Compliance**: Must adhere to Indian data protection laws and international standards

### Business Constraints
- **Market Competition**: Existing EdTech platforms with established user bases
- **Pricing Sensitivity**: Target demographic has limited disposable income
- **Seasonal Usage**: Peak usage during exam preparation periods (6-8 months annually)
- **Regional Variations**: Different state board curricula and language preferences

### Assumptions
- **Smartphone Adoption**: Target users have access to smartphones with required sensors
- **Internet Connectivity**: Reasonable internet access for initial setup and periodic sync
- **User Engagement**: Students willing to adopt AI-driven behavioral interventions
- **Coaching Center Adoption**: Educational institutions open to technology integration
- **Regulatory Stability**: Data protection and educational regulations remain stable

## Functional Requirements

### Requirement 1: AI Adaptive Scheduler

**User Story:** As a JEE/NEET aspirant, I want an AI system to automatically generate optimized daily schedules, so that I can eliminate planning paralysis and focus on actual studying instead of spending 3+ hours daily on planning.

#### Acceptance Criteria

1. WHEN a student requests a daily schedule, THE AI_Scheduler SHALL generate an optimized schedule within 3 seconds
2. WHEN generating schedules, THE AI_Scheduler SHALL satisfy 95% or more of the 100+ optimization constraints
3. WHEN creating schedules, THE AI_Scheduler SHALL incorporate curriculum prerequisites for JEE (192 physics topics), NEET (190 biology topics), and Board exams (180 topics)
4. WHEN scheduling study sessions, THE AI_Scheduler SHALL implement spaced repetition intervals following the Ebbinghaus forgetting curve (Day 1, 3, 8, 20, 60+)
5. WHEN assigning cognitive tasks, THE AI_Scheduler SHALL match high-difficulty topics to peak chronotype hours (6-8am, 4-6pm for most students)
6. WHEN creating daily schedules, THE AI_Scheduler SHALL integrate extracurricular activities as legitimate time blocks for neurological benefits
7. WHEN students use generated schedules, THE AI_Scheduler SHALL achieve 80% or higher schedule adoption rate
8. WHEN the CSP_Solver processes constraints, THE AI_Scheduler SHALL use Google OR-Tools for constraint satisfaction optimization

### Requirement 2: RIVER Focus Quality Detection

**User Story:** As a JEE/NEET aspirant, I want the system to accurately measure my genuine learning time through multiple sensors, so that I can understand my real focus quality instead of just logged hours.

#### Acceptance Criteria

1. WHEN measuring focus quality, THE RIVER SHALL collect data from 4 sensors: gyroscope, app classification, phone orientation, and optional eye-gaze tracking
2. WHEN calculating focus scores, THE RIVER SHALL use the composite formula: Focus_Quality_Score = 0.3×Gyro + 0.35×AppClass + 0.2×Orientation + 0.15×EyeGaze
3. WHEN classifying focus sessions, THE RIVER SHALL use a Random Forest ML classifier with 100 trees trained on 10,000+ labeled sessions
4. WHEN displaying focus data, THE RIVER SHALL visualize results as a river where width represents consistency, height represents quality hours, and flow rate shows real-time status
5. WHEN students achieve focus milestones, THE RIVER SHALL provide gamification through reservoir mechanics and biome unlocks
6. WHEN measuring student performance, THE RIVER SHALL achieve 52-57% average focus quality compared to 21-25% baseline
7. WHEN processing sensor data, THE RIVER SHALL maintain 85% or higher sensor accuracy across all measurement types
8. WHEN students study, THE RIVER SHALL distinguish between genuine learning time and passive time logging

### Requirement 3: Burnout Prediction Engine

**User Story:** As a JEE/NEET aspirant, I want the system to predict and prevent burnout before it occurs, so that I can maintain sustainable study habits and avoid the mental health crisis affecting my peers.

#### Acceptance Criteria

1. WHEN analyzing student behavior patterns, THE Burnout_Engine SHALL predict burnout risk 30-45 days in advance with 85% or higher accuracy
2. WHEN making predictions, THE Burnout_Engine SHALL use an ensemble ML model combining Random Forest (70% weight) and XGBoost (30% weight) trained on 5,000+ labeled student cases
3. WHEN monitoring student wellness, THE Burnout_Engine SHALL track sleep patterns, focus trends, attention fatigue, engagement decline, and distraction behavior
4. WHEN calculating risk factors, THE Burnout_Engine SHALL weight features as: Sleep (20%), focus trend (18%), micro-pauses (15%), distraction ratio (12%), and other factors
5. WHEN high burnout risk is detected, THE Burnout_Engine SHALL trigger one of 4 intervention types: sports break, sleep optimization, peer support, or schedule reduction
6. WHEN interventions are recommended, THE Burnout_Engine SHALL achieve 70% or higher intervention adoption rate
7. WHEN preventing burnout, THE Burnout_Engine SHALL reduce burnout risk by 45% compared to students without the system
8. WHEN processing behavioral data, THE Burnout_Engine SHALL maintain student privacy through on-device processing where possible

### Requirement 4: Study Pods AI-Matched Peer Groups

**User Story:** As a JEE/NEET aspirant, I want to be matched with compatible study partners in small groups, so that I can combat isolation and receive peer support while maintaining focus during study hours.

#### Acceptance Criteria

1. WHEN matching students, THE Study_Pods SHALL create groups of exactly 5 students using AI scoring across 5 criteria
2. WHEN calculating compatibility, THE Study_Pods SHALL use the matching formula: Score = 0.30×Topic + 0.25×Goal + 0.20×LearningStyle + 0.15×ToxicityAvoidance + 0.07×Timezone + 0.03×Stability
3. WHEN displaying pod status, THE Study_Pods SHALL use campfire visualization with live status indicators (green=focused, yellow=break, grey=offline)
4. WHEN managing communication, THE Study_Pods SHALL disable chat during focus hours (6am-11pm) and filter toxic language using AI
5. WHEN organizing support, THE Study_Pods SHALL implement weekly rotation of "support weeks" where different members provide encouragement
6. WHEN measuring engagement, THE Study_Pods SHALL achieve 70% or higher pod retention rate after 4 weeks
7. WHEN facilitating peer support, THE Study_Pods SHALL generate 4 or more support interactions per student per week
8. WHEN students interact in pods, THE Study_Pods SHALL maintain a positive, supportive environment free from academic competition toxicity

### Requirement 5: Custom Practice Generation

**User Story:** As a JEE/NEET aspirant, I want the system to generate adaptive practice problems targeting my weak areas at optimal difficulty, so that I can efficiently improve my performance in challenging topics.

#### Acceptance Criteria

1. WHEN generating practice sets, THE Practice_Generator SHALL deliver adaptive problems targeting weak topics at optimal difficulty levels
2. WHEN determining difficulty, THE Practice_Generator SHALL use Bayesian Adaptive Testing to target 65% success rate for optimal learning
3. WHEN scheduling reviews, THE Practice_Generator SHALL implement spaced repetition intervals (Day 1, 3, 8, 20, 60+) for long-term retention
4. WHEN providing problems, THE Practice_Generator SHALL access a pre-made bank of 500+ problems per weak topic, indexed by difficulty, sub-topic, and learning style
5. WHEN measuring improvement, THE Practice_Generator SHALL help 60% or more students improve weak topics to 85%+ proficiency within 4 weeks
6. WHEN adapting to student performance, THE Practice_Generator SHALL adjust problem difficulty based on real-time success rates
7. WHEN generating content, THE Practice_Generator SHALL ensure problems align with JEE/NEET/Board exam patterns and difficulty levels
8. WHEN tracking progress, THE Practice_Generator SHALL provide detailed analytics on topic-wise improvement and retention rates

### Requirement 6: System Architecture and Performance

**User Story:** As a system architect, I want a robust, scalable technical foundation, so that the platform can serve 23 million students with high performance and reliability.

#### Acceptance Criteria

1. WHEN building the mobile application, THE ADRYFT_System SHALL use Flutter for native mobile development with offline-first capability
2. WHEN running on devices, THE ADRYFT_System SHALL maintain 60 FPS performance and support devices with 2GB RAM
3. WHEN handling backend operations, THE ADRYFT_System SHALL use Python FastAPI with async processing for real-time synchronization
4. WHEN performing machine learning, THE ADRYFT_System SHALL use Scikit-Learn/PyTorch for training and TensorFlow Lite for on-device inference
5. WHEN storing data, THE ADRYFT_System SHALL use Supabase PostgreSQL with encryption at rest and row-level security
6. WHEN optimizing schedules, THE ADRYFT_System SHALL use Google OR-Tools CSP solver for constraint satisfaction
7. WHEN synchronizing data, THE ADRYFT_System SHALL implement WebSocket connections for real-time updates
8. WHEN processing requests, THE ADRYFT_System SHALL maintain sub-3-second response times for all critical operations

## Non-Functional Requirements

### Requirement 7: Data Privacy and Security

**User Story:** As a JEE/NEET aspirant and parent, I want complete control over my educational and behavioral data, so that my privacy is protected while still benefiting from AI-powered insights.

#### Acceptance Criteria

1. WHEN storing sensitive data, THE ADRYFT_System SHALL implement end-to-end encryption for all student information
2. WHEN managing data access, THE ADRYFT_System SHALL allow students to control deletion, opt-outs, and private mode settings
3. WHEN sharing data with stakeholders, THE ADRYFT_System SHALL implement tiered access: students see all data, parents see wellness trends, coaching centers see aggregated analytics
4. WHEN handling third-party requests, THE ADRYFT_System SHALL never share student data without explicit consent
5. WHEN processing behavioral data, THE ADRYFT_System SHALL perform ML inference on-device where possible to minimize data transmission
6. WHEN students request data deletion, THE ADRYFT_System SHALL permanently remove all associated data within 30 days
7. WHEN detecting privacy violations, THE ADRYFT_System SHALL immediately alert students and provide remediation options
8. WHEN handling sensitive information, THE ADRYFT_System SHALL comply with Indian data protection regulations and international privacy standards

### Requirement 8: Success Metrics and Validation

**User Story:** As a product manager, I want measurable success metrics that demonstrate the platform's effectiveness, so that we can validate impact and guide continuous improvement.

#### Acceptance Criteria

1. WHEN measuring focus improvement, THE ADRYFT_System SHALL achieve 57% average focus quality compared to 21% baseline (171% improvement)
2. WHEN tracking user retention, THE ADRYFT_System SHALL maintain 65% 4-week retention compared to 30% industry baseline (117% improvement)
3. WHEN preventing burnout, THE ADRYFT_System SHALL achieve 73% burnout prevention rate for at-risk students
4. WHEN measuring time savings, THE ADRYFT_System SHALL reduce planning time by 95% (from 3 hours to 15 minutes daily)
5. WHEN surveying users, THE ADRYFT_System SHALL achieve Net Promoter Score (NPS) of 70 or higher
6. WHEN supporting coaching centers, THE ADRYFT_System SHALL help achieve 92% student completion rate compared to 30% industry baseline
7. WHEN scaling the platform, THE ADRYFT_System SHALL demonstrate capability to serve the 23 million JEE/NEET aspirant market
8. WHEN measuring business impact, THE ADRYFT_System SHALL validate the ₹200-500/student/month pricing model through demonstrated value delivery