# 🧪 Testing Guide - SMS Template

## Table of Contents
1. [Testing Basics](#testing-basics)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [Running Tests](#running-tests)
5. [Best Practices](#best-practices)

---

## Testing Basics

### What is Testing?

Testing is **verifying that your code works as expected**. It's like quality control in manufacturing - you check your product before shipping it to customers.

### Why Test?

- **Catch bugs early** - Find issues before users do
- **Refactor confidently** - Know changes didn't break anything
- **Document behavior** - Tests show how code should work
- **Reduce debugging time** - Tests pinpoint failures
- **Professional standard** - Production apps require tests

### Types of Tests

```
┌─────────────────────────────────────────────────────┐
│                  TESTING PYRAMID                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│                    E2E Tests                        │  (5-10%)
│                  (Full workflows)                   │
│                                                     │
│              ╱────────────────────────╲             │
│             ╱   Integration Tests      ╲            │  (30-40%)
│            ╱ (Service interactions)     ╲           │
│                                                     │
│         ╱──────────────────────────────────╲        │
│        ╱      Unit Tests                    ╲       │  (50-60%)
│       ╱ (Individual functions/methods)       ╲      │
│      ╱─────────────────────────────────────────╲    │
│                                                     │
└─────────────────────────────────────────────────────┘

PRINCIPLE: Write many unit tests, some integration tests,
          few E2E tests. This gives best ROI (Return On Investment).
```

---

## Unit Testing

### What is Unit Testing?

Unit testing means **testing a single function or method in isolation** - without needing databases, APIs, or other services.

### Unit Test Structure

Every test follows this pattern:

```javascript
describe('Component or Function', () => {
  // Setup before tests
  beforeAll(() => { /* runs once before all tests */ });
  beforeEach(() => { /* runs before each test */ });

  // Actual test
  test('should do something when condition is met', () => {
    // Arrange: Set up test data
    const input = "test";
    
    // Act: Call the function
    const result = myFunction(input);
    
    // Assert: Check the result
    expect(result).toBe("expected");
  });

  // Cleanup after tests
  afterEach(() => { /* runs after each test */ });
  afterAll(() => { /* runs once after all tests */ });
});
```

### AAA Pattern (Arrange-Act-Assert)

Every test has 3 parts:

```javascript
test('calculateTotal should add two numbers', () => {
  // 1️⃣ ARRANGE: Set up your test data
  const a = 5;
  const b = 3;
  
  // 2️⃣ ACT: Call the function you're testing
  const result = calculateTotal(a, b);
  
  // 3️⃣ ASSERT: Verify the result is correct
  expect(result).toBe(8);
});
```

### Jest Matchers (Assertions)

These verify your results:

```javascript
// Equality checks
expect(result).toBe(5);              // Exact match (===)
expect(result).toEqual({a: 1});      // Deep equality

// Truthiness
expect(value).toBeTruthy();           // true, 1, "yes"
expect(value).toBeFalsy();            // false, 0, null, undefined

// Numbers
expect(result).toBeGreaterThan(5);
expect(result).toBeCloseTo(3.14159, 2);  // 2 decimal places

// Strings
expect(message).toMatch(/hello/);
expect(email).toContain("@");

// Arrays
expect(list).toHaveLength(3);
expect(list).toContain("item");

// Objects
expect(user).toHaveProperty("name");
expect(user).toHaveProperty("email", "test@example.com");

// Errors
expect(() => { throw new Error('Oops'); })
  .toThrow('Oops');

// Async/Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

---

## Integration Testing

### What is Integration Testing?

Integration testing verifies that **multiple services/modules work together correctly**. Unlike unit tests, these actually hit databases, APIs, etc.

### Integration Test Structure

```javascript
describe('Student Service Integration', () => {
  let mongodb;
  
  // 1️⃣ Setup: Start database before tests
  beforeAll(async () => {
    mongodb = await startTestDatabase();
    await connectToDatabase();
  });

  // 2️⃣ Cleanup: Clear data between tests
  afterEach(async () => {
    await Student.deleteMany({});
  });

  // 3️⃣ Shutdown: Stop database after tests
  afterAll(async () => {
    await closeDatabase();
    await mongodb.stop();
  });

  // 4️⃣ Actual test
  test('complete student workflow', async () => {
    // Create → Read → Update → Delete
  });
});
```

### Testing API Endpoints

Use `supertest` to test Express routes:

```javascript
const request = require('supertest');
const app = require('../index');

test('POST /api/students creates a student', async () => {
  const response = await request(app)
    .post('/api/students')
    .send({
      name: "John Doe",
      email: "john@example.com"
    })
    .expect(201);  // Expect status 201

  expect(response.body).toHaveProperty('_id');
  expect(response.body.name).toBe("John Doe");
});
```

---

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm test -- --watch

# Run specific test file
npm test -- studentService.test.js

# Run tests matching pattern
npm test -- --testNamePattern="create"

# Show coverage report
npm test -- --coverage

# Run with verbose output
npm test -- --verbose

# Update snapshots
npm test -- -u
```

### Coverage Reports

After running `npm test`, view the coverage report:

```bash
# Terminal output
PASS  __tests__/unit/models.test.js
  ✓ should create user (5ms)
  ✓ should validate email (3ms)
  ✓ should hash password (12ms)

Coverage summary:
  Statements   : 75% ( 45/60 )
  Branches     : 60% ( 12/20 )
  Functions    : 80% ( 8/10 )
  Lines        : 75% ( 45/60 )
```

---

## Best Practices

### ✅ DO

1. **Test one thing per test**
   ```javascript
   // ❌ BAD: Testing multiple things
   test('user login workflow', () => {
     // Test creating user
     // Test hashing password
     // Test token generation
     // Too many things!
   });

   // ✅ GOOD: Test one thing
   test('should hash password with bcrypt', () => {
     const result = hashPassword("mypass");
     expect(result).not.toBe("mypass"); // Hashed
   });
   ```

2. **Use descriptive test names**
   ```javascript
   // ❌ BAD: Not clear what's tested
   test('test 1', () => { ... });

   // ✅ GOOD: Clear intent
   test('should reject email without @domain', () => { ... });
   ```

3. **Keep tests independent**
   ```javascript
   // ❌ BAD: Tests depend on execution order
   let userId;
   test('create user', () => { userId = createUser(); });
   test('fetch user', () => { expect(fetch(userId)).toBeTruthy(); });

   // ✅ GOOD: Each test is independent
   test('fetch user returns data', () => {
     const userId = createUser();
     expect(fetch(userId)).toBeTruthy();
   });
   ```

4. **Mock external dependencies**
   ```javascript
   // ❌ BAD: Test hits real database
   test('get student', async () => {
     const result = await getStudentFromDB(123);
   });

   // ✅ GOOD: Mock the database
   test('get student', async () => {
     const mockDB = { findById: () => ({name: "John"}) };
     const result = await getStudent(123, mockDB);
     expect(result.name).toBe("John");
   });
   ```

5. **Test edge cases**
   ```javascript
   // ✅ GOOD: Test various scenarios
   test('calculateAge handles different dates', () => {
     expect(calculateAge("1990-01-01")).toBeGreaterThan(30);
     expect(calculateAge("2020-01-01")).toBeLessThan(10);
     expect(calculateAge("today")).toBe(0); // Edge case
   });
   ```

### ❌ DON'T

1. **Don't use randomness**
   ```javascript
   // ❌ BAD: Random values make tests unreliable
   test('test', () => {
     const random = Math.random();
     expect(random).toBeGreaterThan(0);
   });

   // ✅ GOOD: Use fixed values
   test('test', () => {
     expect(calculatePercentage(50, 100)).toBe(0.5);
   });
   ```

2. **Don't test external APIs**
   ```javascript
   // ❌ BAD: Tests fail if API is down
   test('get weather', async () => {
     const data = await realWeatherAPI.get();
   });

   // ✅ GOOD: Mock the API
   test('get weather', async () => {
     const mockAPI = { get: () => ({temp: 25}) };
     const result = await getWeather(mockAPI);
   });
   ```

3. **Don't skip important tests**
   ```javascript
   // ❌ BAD: Using skip/todo for actual bugs
   test.skip('should handle null input', () => { ... });

   // ✅ GOOD: Keep tests active, fix the code
   test('should handle null input', () => {
     expect(processData(null)).toBe(null);
   });
   ```

---

## Example Test Suite

See `__tests__/` folder for complete examples:

```
__tests__/
├── unit/
│   ├── models/
│   │   └── student.test.js          ← Model tests
│   └── utils/
│       └── validation.test.js       ← Utility tests
└── integration/
    ├── studentService.test.js       ← Service tests
    └── api/
        └── studentRoutes.test.js    ← API endpoint tests
```

---

## Coverage Goals

| Phase | Target | Reality |
|-------|--------|---------|
| Week 1 | 30% | Get basics working |
| Week 2 | 50% | Cover main paths |
| Week 3 | 70% | Add edge cases |
| Week 4 | 85%+ | Production ready |

---

## Quick Reference

```bash
# Install testing tools
npm install --save-dev jest supertest

# Create test file: myFile.test.js
# Run tests
npm test

# Watch mode (auto-rerun)
npm test -- --watch

# Check coverage
npm test -- --coverage
```

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Supertest for API Testing](https://github.com/visionmedia/supertest)

---

## Next Steps

1. ✅ Install Jest (`npm install --save-dev jest supertest`)
2. ✅ Read this guide
3. ⏭️ Look at example tests in `__tests__/`
4. ⏭️ Write your first test!
5. ⏭️ Run `npm test` and celebrate! 🎉

