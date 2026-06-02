# Student Management System Microservices

A Node.js and Express-based microservices backend for managing students, professors, courses, enrollments, and grades. The system uses JWT-based authorization, shared correlation IDs for tracing, and structured logging with Elasticsearch support.

## Architecture Overview

The application is split into six services that work together:

- `authService` handles login for students, professors, and admins.
- `studentService` manages student records and internal student lookup.
- `professorService` manages professor records and internal professor lookup.
- `courseService` manages course creation and maintenance.
- `enrollmentService` manages student-course enrollments.
- `gradeService` manages grade assignment and retrieval.

The services communicate over HTTP and use JWTs signed by the auth service. Internal service-to-service calls rely on role-based tokens and shared JWKS verification. Every request also carries a correlation ID so logs can be traced across services.

Note: the diagram below is not showing all services being called at the same time. It represents one client request entering one service, and that service may then call other services as needed.

```mermaid
flowchart TB
    client["Client request<br/>Header: x-correlation-id: &lt;uuid&gt;"]

    subgraph serviceFlow["Service Flow"]
        direction LR
        auth["authService<br/>Port 5001"]
        student["studentService<br/>Port 5003"]
        professor["professorService<br/>Port 5002"]
        course["courseService<br/>Port 5004"]
        enrollment["enrollmentService<br/>Port 5005"]
        grade["gradeService<br/>Port 5006"]

        auth -->|fetchStudents<br/>fetchStudentById| student
        auth -->|fetchProfessors| professor
        enrollment -->|fetchStudents<br/>fetchStudentById| student
        enrollment -->|fetchCourses<br/>fetchCourseById| course
        grade -->|fetchStudentById| student
        grade -->|fetchCourseById| course
        grade -->|fetchEnrollmentByStudentAndCourse| enrollment
    end

    subgraph loggingFlow["Logging Flow"]
        direction LR
        logging["logging.js"]
        winston["Winston transport"]
        elastic["Elasticsearch<br/>(sms-logs-*)"]

        logging --> winston --> elastic
    end

    client --> auth
    client --> student
    client --> professor
    client --> course
    client --> enrollment
    client --> grade

    auth -. logs .-> logging
    student -. logs .-> logging
    professor -. logs .-> logging
    course -. logs .-> logging
    enrollment -. logs .-> logging
    grade -. logs .-> logging
```

## Tech Stack

- Node.js 20+
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (`jsonwebtoken`)
- JWKS-based token verification (`jwk-to-pem`, `jwks-rsa`)
- Request rate limiting (`express-rate-limit`)
- Correlation ID tracking (`cls-hooked`, `uuid`)
- Logging with Winston and Elasticsearch transport
- Development workflow with `nodemon` and `concurrently`

## Project Structure

```text
.
├── authService/
├── courseService/
├── enrollmentService/
├── gradeService/
├── professorService/
├── studentService/
├── correlationId.js
├── logging.js
├── consts.js
├── SMS_Microservices.postman_collection.json
└── package.json
```

Each service has its own `index.js`, `routes/`, `models/`, `config/`, and `.env` file.

## Prerequisites

- Node.js `>=20`
- npm
- MongoDB connection for each service
- Postman for manual API testing
- Elasticsearch access if you want to ship logs there

## Environment Setup

Each service reads environment variables from its local `.env` file.

Typical variables used across the project:

- `PORT`
- `MONGO_URI`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL` in `authService`

Recommended setup:

1. Create or update the `.env` file inside each service folder.
2. Point `MONGO_URI` to your MongoDB database for that service.
3. Set `ADMIN_PASSWORD` for the auth service.
4. Keep internal secrets consistent across services if you are using shared internal authentication.

## Installation

Install dependencies from the repository root and from each service folder:

```bash
npm install
npm install --prefix authService
npm install --prefix studentService
npm install --prefix professorService
npm install --prefix courseService
npm install --prefix enrollmentService
npm install --prefix gradeService
```

This installs the root tooling used to start services together and the dependencies required by each microservice.

## Running the Application

Start all services together:

```bash
npm run start:all
```

Start a single service:

```bash
npm run start:authService
npm run start:studentService
npm run start:professorService
npm run start:courseService
npm run start:enrollmentService
npm run start:gradeService
```

Default local ports:

- Auth Service: `5001`
- Professor Service: `5002`
- Student Service: `5003`
- Course Service: `5004`
- Enrollment Service: `5005`
- Grade Service: `5006`

## API Endpoints

### Auth Service

- `POST /api/login/student`
- `POST /api/login/professor`
- `POST /api/login/admin`
- `GET /.well-known/jwks.json`

### Student Service

- `GET /api/students`
- `POST /api/students`
- `GET /api/students/:id`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`
- `GET /api/students/internal`

### Professor Service

- `GET /api/professors`
- `POST /api/professors`
- `GET /api/professors/:id`
- `PUT /api/professors/:id`
- `DELETE /api/professors/:id`
- `GET /api/professors/internal`

### Course Service

- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/:id`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`

### Enrollment Service

- `GET /api/enrollments`
- `POST /api/enrollments`
- `GET /api/enrollments/:id`
- `GET /api/enrollments/student/:id`
- `GET /api/enrollments/course/:id`
- `GET /api/enrollments/lookup`
- `DELETE /api/enrollments/:id`
- `GET /.well-known/jwks.json`

### Grade Service

- `GET /api/grades`
- `POST /api/grades`
- `GET /api/grades/:id`
- `GET /api/grades/student/:studentId`
- `GET /api/grades/course/:courseId`
- `PUT /api/grades/:id`
- `GET /.well-known/jwks.json`

## Correlation ID Tracing

Every service loads `correlationId.js`, which:

- reads an incoming `x-correlation-id` header when present
- generates a new UUID when the header is missing
- stores the value in a shared CLS namespace
- returns the same ID in the response headers

This makes it easier to follow one request across multiple services and into the logs. When a service calls another service, it forwards the same `x-correlation-id` header so the trace stays intact.

## Logging & Elasticsearch

Logging is configured in `logging.js` with Winston and an Elasticsearch transport.

- Console logs are written locally for quick debugging.
- Structured logs are sent to Elasticsearch through the shared logging pipeline.
- Every log entry includes the correlation ID and service name.
- Elasticsearch is part of observability only; it is not part of the request path.

This setup helps with:

- tracing requests across services
- debugging cross-service failures
- searching logs by request ID, endpoint, or service name

Note: the current Elasticsearch connection details are defined in `logging.js`. If you want to move them to environment variables later, that can be done without changing the service logic.

## Postman Collection

Use `SMS_Microservices.postman_collection.json` to test the API in Postman.

Collection variables are already included for:

- base URLs for each service
- access tokens for student, professor, and admin users
- created entity IDs such as student, professor, course, enrollment, and grade IDs

Suggested import flow:

1. Import the collection JSON into Postman.
2. Set the local service URLs if your ports differ.
3. Run the auth requests first to capture tokens.
4. Reuse the saved variables for protected endpoints.

The collection is the fastest way to verify the service-to-service flows, token handling, and CRUD operations.

## Notes

- The repository is designed for local development and service-level testing.
- Some routes are intentionally protected by role-based authorization.
- Internal routes such as `GET /internal` are meant for service-to-service use only.
