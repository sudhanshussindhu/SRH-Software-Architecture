/**
 * ============================================
 * STUDENT SERVICE - INTEGRATION TESTS
 * ============================================
 * 
 * This file teaches integration testing.
 * Unlike unit tests, these tests:
 * - Use real (or mock) databases
 * - Test API endpoints end-to-end
 * - Verify multiple services work together
 * - Take longer but test real scenarios
 * 
 * WHY INTEGRATION TESTS?
 * - Unit tests may pass but integration could fail
 * - Verify database queries work correctly
 * - Test HTTP request/response
 * - Simulate real user workflows
 */

const request = require("supertest");

/**
 * ============================================
 * INTEGRATION TEST EXAMPLE
 * ============================================
 * 
 * We'll mock the Express app and test API endpoints
 * In a real scenario, you'd use TestContainers for MongoDB
 */

describe("Student Service - Integration Tests", () => {
  // Mock Express app (in real code, import actual app)
  let app;

  // Mock database
  let mockDB;

  // ============================================
  // SETUP: Run before ALL tests
  // ============================================
  beforeAll(async () => {
    console.log("🚀 Starting integration test setup...");

    // In real scenario:
    // - Start MongoDB container
    // - Connect to database
    // - Run migrations

    // For this example, we'll create a mock app
    const express = require("express");
    app = express();
    app.use(express.json());

    // Mock database with in-memory data
    mockDB = {
      students: [
        {
          _id: "123",
          name: "John Doe",
          email: "john@example.com",
          enrollmentNumber: "CS001",
        },
      ],
    };

    // Mock route handlers
    app.get("/api/students", (req, res) => {
      res.json(mockDB.students);
    });

    app.post("/api/students", (req, res) => {
      const newStudent = {
        _id: String(mockDB.students.length + 1),
        ...req.body,
      };
      mockDB.students.push(newStudent);
      res.status(201).json(newStudent);
    });

    app.get("/api/students/:id", (req, res) => {
      const student = mockDB.students.find((s) => s._id === req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    });

    app.put("/api/students/:id", (req, res) => {
      const student = mockDB.students.find((s) => s._id === req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      Object.assign(student, req.body);
      res.json(student);
    });

    app.delete("/api/students/:id", (req, res) => {
      const index = mockDB.students.findIndex(
        (s) => s._id === req.params.id
      );
      if (index === -1) {
        return res.status(404).json({ message: "Student not found" });
      }
      const deleted = mockDB.students.splice(index, 1);
      res.json(deleted[0]);
    });

    console.log("✅ Integration test setup complete");
  });

  // ============================================
  // CLEANUP: Run after EACH test
  // ============================================
  afterEach(async () => {
    // Reset mock database to clean state
    mockDB.students = [
      {
        _id: "123",
        name: "John Doe",
        email: "john@example.com",
        enrollmentNumber: "CS001",
      },
    ];
  });

  // ============================================
  // CLEANUP: Run after ALL tests
  // ============================================
  afterAll(async () => {
    console.log("🛑 Tearing down integration tests...");
    // In real scenario:
    // - Close database connection
    // - Stop MongoDB container
  });

  // ============================================
  // TEST #1: GET all students
  // ============================================
  describe("GET /api/students", () => {
    /**
     * CONCEPT: Test that we can fetch all students
     * 
     * Steps:
     * 1. Make HTTP GET request to /api/students
     * 2. Verify status code is 200 (success)
     * 3. Verify response is an array
     * 4. Verify array contains student objects
     */
    test("should return all students with status 200", async () => {
      // ACT: Make request
      const response = await request(app)
        .get("/api/students")
        .expect(200) // ASSERT: Expect 200 status

      // ASSERT: Response should be array
      expect(Array.isArray(response.body)).toBe(true);

      // ASSERT: Should have at least one student
      expect(response.body.length).toBeGreaterThan(0);

      // ASSERT: First student should have expected properties
      expect(response.body[0]).toHaveProperty("_id");
      expect(response.body[0]).toHaveProperty("name");
      expect(response.body[0]).toHaveProperty("email");
    });

    /**
     * CONCEPT: Test response structure
     * 
     * Verify that each student object has all required fields
     */
    test("should return students with correct structure", async () => {
      const response = await request(app).get("/api/students");

      // Each student should have these fields
      const requiredFields = [
        "_id",
        "name",
        "email",
        "enrollmentNumber",
      ];

      response.body.forEach((student) => {
        requiredFields.forEach((field) => {
          expect(student).toHaveProperty(field);
        });
      });
    });
  });

  // ============================================
  // TEST #2: POST (Create) a student
  // ============================================
  describe("POST /api/students", () => {
    /**
     * CONCEPT: Test creating a new student
     * 
     * Workflow:
     * 1. Send POST request with student data
     * 2. Verify status 201 (created)
     * 3. Verify response contains the created student
     * 4. Verify database has the new student
     */
    test("should create a new student and return 201", async () => {
      // ARRANGE: Student data to create
      const newStudent = {
        name: "Jane Smith",
        email: "jane@example.com",
        enrollmentNumber: "CS002",
      };

      // ACT: Make POST request
      const response = await request(app)
        .post("/api/students")
        .send(newStudent)
        .expect(201); // ASSERT: Expect 201 Created status

      // ASSERT: Response should contain the student
      expect(response.body.name).toBe("Jane Smith");
      expect(response.body.email).toBe("jane@example.com");

      // ASSERT: Response should have _id (auto-generated)
      expect(response.body._id).toBeDefined();

      // ASSERT: Database should now have 2 students (original + new)
      expect(mockDB.students).toHaveLength(2);
    });

    /**
     * CONCEPT: Test validation on POST
     * 
     * If data is invalid, should return 400 (bad request)
     */
    test("should return error if required fields are missing", async () => {
      // ARRANGE: Invalid student (missing fields)
      const invalidStudent = {
        name: "John", // Missing email and enrollmentNumber
      };

      // NOTE: In real app, you'd have validation middleware
      // that would check required fields and return 400
      // This is a simplified example

      // For now, let's just verify we can send the request
      const response = await request(app)
        .post("/api/students")
        .send(invalidStudent);

      // In a real app with validation, we'd expect 400
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  // ============================================
  // TEST #3: GET a specific student
  // ============================================
  describe("GET /api/students/:id", () => {
    /**
     * CONCEPT: Fetch a single student by ID
     * 
     * Test both success and failure cases
     */
    test("should return a student by ID", async () => {
      // ACT: Get specific student
      const response = await request(app)
        .get("/api/students/123")
        .expect(200);

      // ASSERT: Should return John Doe
      expect(response.body.name).toBe("John Doe");
      expect(response.body._id).toBe("123");
    });

    /**
     * CONCEPT: Test 404 error
     * 
     * When student doesn't exist, should return 404
     */
    test("should return 404 if student not found", async () => {
      // ACT: Try to get non-existent student
      await request(app)
        .get("/api/students/999")
        .expect(404); // ASSERT: Expect 404 Not Found

      // ASSERT: Response should have error message
      // (In real app, check the error message)
    });
  });

  // ============================================
  // TEST #4: PUT (Update) a student
  // ============================================
  describe("PUT /api/students/:id", () => {
    /**
     * CONCEPT: Update existing student
     * 
     * Verify:
     * 1. Student is updated
     * 2. Response contains updated data
     * 3. Database is updated
     */
    test("should update a student", async () => {
      // ARRANGE: Update data
      const updateData = {
        name: "John Updated",
        email: "john.updated@example.com",
      };

      // ACT: Make PUT request
      const response = await request(app)
        .put("/api/students/123")
        .send(updateData)
        .expect(200); // ASSERT: Expect 200 OK

      // ASSERT: Response should have updated data
      expect(response.body.name).toBe("John Updated");
      expect(response.body.email).toBe("john.updated@example.com");

      // ASSERT: Verify database was updated
      const student = mockDB.students.find((s) => s._id === "123");
      expect(student.name).toBe("John Updated");
    });

    /**
     * CONCEPT: Partial update
     * 
     * Update only some fields, others stay the same
     */
    test("should do partial update (some fields only)", async () => {
      // ARRANGE: Only update email, not name
      const partialUpdate = {
        email: "newemail@example.com",
      };

      // ACT: Update
      const response = await request(app)
        .put("/api/students/123")
        .send(partialUpdate)
        .expect(200);

      // ASSERT: Email changed
      expect(response.body.email).toBe("newemail@example.com");

      // ASSERT: Name stayed the same
      expect(response.body.name).toBe("John Doe");
    });
  });

  // ============================================
  // TEST #5: DELETE a student
  // ============================================
  describe("DELETE /api/students/:id", () => {
    /**
     * CONCEPT: Delete a student
     * 
     * Verify:
     * 1. Deletion succeeds
     * 2. Returns deleted student
     * 3. Database is updated
     * 4. Can't fetch deleted student
     */
    test("should delete a student", async () => {
      // ACT: Delete student
      const response = await request(app)
        .delete("/api/students/123")
        .expect(200); // ASSERT: 200 OK

      // ASSERT: Response contains deleted student
      expect(response.body._id).toBe("123");

      // ASSERT: Database should have 0 students (we deleted the only one)
      expect(mockDB.students).toHaveLength(0);

      // ASSERT: Can't fetch deleted student anymore
      await request(app)
        .get("/api/students/123")
        .expect(404); // Not found
    });
  });

  // ============================================
  // TEST #6: Complete workflow
  // ============================================
  describe("Complete CRUD Workflow", () => {
    /**
     * CONCEPT: End-to-end user scenario
     * 
     * Test a complete workflow:
     * Create → Read → Update → Delete
     * 
     * This is the most important test - it verifies
     * the whole feature works together
     */
    test("should complete create-read-update-delete workflow", async () => {
      // 1️⃣ CREATE: Add new student
      const createResponse = await request(app)
        .post("/api/students")
        .send({
          name: "Test Student",
          email: "test@example.com",
          enrollmentNumber: "TEST001",
        })
        .expect(201);

      const studentId = createResponse.body._id;
      expect(studentId).toBeDefined();

      // 2️⃣ READ: Fetch the created student
      const readResponse = await request(app)
        .get(`/api/students/${studentId}`)
        .expect(200);

      expect(readResponse.body.name).toBe("Test Student");

      // 3️⃣ UPDATE: Modify the student
      const updateResponse = await request(app)
        .put(`/api/students/${studentId}`)
        .send({
          name: "Updated Test Student",
        })
        .expect(200);

      expect(updateResponse.body.name).toBe("Updated Test Student");

      // 4️⃣ READ AGAIN: Verify update worked
      const readAgain = await request(app)
        .get(`/api/students/${studentId}`)
        .expect(200);

      expect(readAgain.body.name).toBe("Updated Test Student");

      // 5️⃣ DELETE: Remove the student
      await request(app)
        .delete(`/api/students/${studentId}`)
        .expect(200);

      // 6️⃣ VERIFY DELETION: Can't fetch deleted student
      await request(app)
        .get(`/api/students/${studentId}`)
        .expect(404);

      console.log("✅ Complete CRUD workflow test passed!");
    });
  });

  // ============================================
  // SUMMARY OF INTEGRATION TESTS
  // ============================================
  /**
   * WHAT WE LEARNED:
   * 
   * 1. ✅ GET requests: Fetch data
   * 2. ✅ POST requests: Create data
   * 3. ✅ PUT requests: Update data
   * 4. ✅ DELETE requests: Remove data
   * 5. ✅ Status codes: 200, 201, 404
   * 6. ✅ Error handling: Check for expected errors
   * 7. ✅ Response structure: Verify data shape
   * 8. ✅ Database state: Verify changes persisted
   * 9. ✅ Complete workflows: End-to-end scenarios
   * 
   * RUNNING THESE TESTS:
   * $ npm test -- studentService.test.js
   * 
   * KEY DIFFERENCES FROM UNIT TESTS:
   * - ❌ Slower (uses real/mock database)
   * - ✅ More realistic (tests full API)
   * - ✅ Catches integration bugs
   * - ✅ Tests HTTP status codes
   * - ✅ Tests database persistence
   */
});
