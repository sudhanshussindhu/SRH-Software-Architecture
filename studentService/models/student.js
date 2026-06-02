const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

// Define the Student Schema
const studentSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
		},
		courses: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Course",
		}],
	},
	{
		timestamps: true,
	}
);

//This is a Mongoose pre-save hook — it runs automatically before any .save() call on a Student document
// It checks if the password field has been modified (or is new) and,
// if so, hashes the password using bcryptjs before saving it to the database. 
// This ensures that passwords are stored securely.

studentSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();

	try {
		const salt = await bcryptjs.genSalt(10);
		this.password = await bcryptjs.hash(this.password, salt);
		next();
	} catch (error) {
		next(error);
	}
});

// This adds a comparePassword method directly to every Student document instance.
// enteredPassword — the plain-text password the user typed during login
// this.password — the bcrypt hash stored in the DB for that student
// bcryptjs.compare() — hashes the entered password the same way and checks if it matches the stored hash. Returns true or false.

studentSchema.methods.comparePassword = async function (enteredPassword) {
	return bcryptjs.compare(enteredPassword, this.password);
};

// Create the Student model
const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
