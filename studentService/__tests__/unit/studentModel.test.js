/**
 * ============================================
 * STUDENT MODEL - UNIT TESTS
 * ============================================
 * 
 * This file teaches unit testing by testing the Student model.
 * We test the model methods WITHOUT connecting to a real database.
 * 
 * WHY UNIT TESTS?
 * - Fast: Don't need database
 * - Reliable: No external dependencies
 * - Easy to debug: Test one thing at a time
 * 
 * WHAT ARE WE TESTING?
 * - Model validation
 * - Data transformation
 * - Error handling
 */

describe('Student Model - Unit Tests (No Database)', () => {
  // ============================================
  // UNIT TEST #1: Validation
  // ============================================
  describe('Validation', () => {
    /**
     * TEST CONCEPT: Testing validation
     * 
     * We want to verify the Student model validates required fields.
     * This test checks that creating a student WITHOUT required fields should fail.
     */
    test('should define Student schema with required fields', () => {
      // ARRANGE: Check what fields are required in the schema
      // In a real test, we'd import the Student model

      // For this example, let's test validation logic
      const studentData = {
        name: "John Doe",
        email: "john@example.com",
        // Missing: enrollmentNumber, dateOfBirth, mobileNumber
      };

      // ACT & ASSERT: Simulate validation
      const requiredFields = ["name", "email", "enrollmentNumber", "dateOfBirth", "mobileNumber"];
      const missingFields = requiredFields.filter(
        (field) => !studentData[field]
      );

      // ASSERT: Should have missing fields
      expect(missingFields).toContain("enrollmentNumber");
      expect(missingFields).toContain("dateOfBirth");
      expect(missingFields).toContain("mobileNumber");
    });

    /**
     * TEST CONCEPT: Email validation
     * 
     * Email should be valid format (contain @)
     */
    test('should validate email format', () => {
      // ARRANGE: Test emails
      const validEmail = "test@example.com";
      const invalidEmail = "notanemail";

      // ACT: Simple email validation function
      const isValidEmail = (email) => email.includes("@");

      // ASSERT: Check results
      expect(isValidEmail(validEmail)).toBe(true);
      expect(isValidEmail(invalidEmail)).toBe(false);
    });

    /**
     * TEST CONCEPT: Mobile number validation
     * 
     * Mobile should be exactly 10 digits (for India)
     */
    test('should validate mobile number format', () => {
      // ARRANGE: Test mobile numbers
      const validMobile = "9876543210";
      const invalidMobile = "12345"; // Too short

      // ACT: Validation function
      const isValidMobile = (mobile) => /^\d{10}$/.test(mobile);

      // ASSERT
      expect(isValidMobile(validMobile)).toBe(true);
      expect(isValidMobile(invalidMobile)).toBe(false);
    });
  });

  // ============================================
  // UNIT TEST #2: Data Transformation
  // ============================================
  describe('Data Transformation', () => {
    /**
     * TEST CONCEPT: Object transformation
     * 
     * Test that we can transform raw input into formatted output
     */
    test('should format student name to title case', () => {
      // ARRANGE: Raw student data
      const rawName = "john doe";

      // ACT: Transform function
      const toTitleCase = (str) =>
        str
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      const formatted = toTitleCase(rawName);

      // ASSERT: Should be title cased
      expect(formatted).toBe("John Doe");
    });

    /**
     * TEST CONCEPT: Date calculation
     * 
     * Calculate age from date of birth
     */
    test('should calculate age from birth date', () => {
      // ARRANGE: Birth date
      const birthDate = new Date("1990-01-15");
      const today = new Date("2024-06-05");

      // ACT: Calculate age function
      const calculateAge = (birth, current) => {
        let age = current.getFullYear() - birth.getFullYear();
        const monthDiff = current.getMonth() - birth.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && current.getDate() < birth.getDate())
        ) {
          age--;
        }
        return age;
      };

      const age = calculateAge(birthDate, today);

      // ASSERT: Should be 34 years old
      expect(age).toBe(34);
    });
  });

  // ============================================
  // UNIT TEST #3: Error Handling
  // ============================================
  describe('Error Handling', () => {
    /**
     * TEST CONCEPT: Testing error throws
     * 
     * When something goes wrong, functions should throw errors
     * We test that errors are thrown when expected
     */
    test('should throw error if name is empty', () => {
      // ARRANGE: Function that validates name
      const validateName = (name) => {
        if (!name || name.trim() === "") {
          throw new Error("Name is required");
        }
        return true;
      };

      // ACT & ASSERT: Test that error is thrown
      expect(() => {
        validateName("");
      }).toThrow("Name is required");
    });

    /**
     * TEST CONCEPT: Error type checking
     * 
     * Test not just that error is thrown, but the right error type
     */
    test('should throw TypeError if age is negative', () => {
      // ARRANGE
      const validateAge = (age) => {
        if (age < 0) {
          throw new TypeError("Age cannot be negative");
        }
        return true;
      };

      // ACT & ASSERT
      expect(() => {
        validateAge(-5);
      }).toThrow(TypeError);
    });
  });

  // ============================================
  // UNIT TEST #4: Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    /**
     * TEST CONCEPT: Boundary testing
     * 
     * Test extreme values - very small, very large, empty, null
     */
    test('should handle very long names', () => {
      // ARRANGE: Very long name (100 characters)
      const longName = "A".repeat(100);

      // ACT: Name formatter
      const isValidName = (name) => name.length <= 100;

      // ASSERT
      expect(isValidName(longName)).toBe(true);
    });

    /**
     * TEST CONCEPT: Null/undefined handling
     * 
     * Code should gracefully handle missing data
     */
    test('should handle null email gracefully', () => {
      // ARRANGE
      const email = null;

      // ACT: Email validation with null check
      const isValidEmail = (e) => {
        if (!e) return false;
        return e.includes("@");
      };

      // ASSERT
      expect(isValidEmail(email)).toBe(false);
    });

    /**
     * TEST CONCEPT: Whitespace handling
     * 
     * Data often has extra spaces - trim and validate
     */
    test('should handle email with extra whitespace', () => {
      // ARRANGE
      const email = "  test@example.com  ";

      // ACT: Clean email
      const cleanEmail = (e) => e.trim();
      const isValid = (e) => e.includes("@");

      // ASSERT
      expect(isValid(cleanEmail(email))).toBe(true);
    });
  });

  // ============================================
  // UNIT TEST #5: Business Logic
  // ============================================
  describe('Business Logic', () => {
    /**
     * TEST CONCEPT: Complex logic testing
     * 
     * Test actual business rules of your domain
     */
    test('should classify student as "regular" if enrolled full-time', () => {
      // ARRANGE: Student data
      const student = {
        enrollmentNumber: "CS001",
        creditsPerSemester: 15, // Full-time: 12+
      };

      // ACT: Classification logic
      const classifyStudent = (s) => {
        if (s.creditsPerSemester >= 12) {
          return "full-time";
        }
        return "part-time";
      };

      const classification = classifyStudent(student);

      // ASSERT
      expect(classification).toBe("full-time");
    });

    /**
     * TEST CONCEPT: Multiple conditions
     * 
     * Test complex if-else logic
     */
    test('should be eligible for scholarship if GPA >= 3.5', () => {
      // ARRANGE: Student with different GPAs
      const goodStudent = { name: "Alice", gpa: 3.8 };
      const averageStudent = { name: "Bob", gpa: 3.2 };

      // ACT: Scholarship eligibility
      const isEligible = (s) => s.gpa >= 3.5;

      // ASSERT
      expect(isEligible(goodStudent)).toBe(true);
      expect(isEligible(averageStudent)).toBe(false);
    });
  });

  // ============================================
  // SUMMARY
  // ============================================
  /**
   * WHAT WE LEARNED:
   * 
   * 1. ✅ Validation Tests: Check data meets requirements
   * 2. ✅ Transformation Tests: Check data is formatted correctly
   * 3. ✅ Error Tests: Check errors are thrown when needed
   * 4. ✅ Edge Cases: Check extreme/unusual values
   * 5. ✅ Business Logic: Check domain rules work
   * 
   * RUNNING THIS TEST:
   * $ npm test -- studentModel.test.js
   * 
   * KEY TAKEAWAY:
   * Unit tests are FAST because they don't use databases!
   * They're RELIABLE because they don't depend on external services!
   */
});
