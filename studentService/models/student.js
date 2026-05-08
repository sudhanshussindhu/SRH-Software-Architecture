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
	},
	{
		timestamps: true,
	}
);

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

studentSchema.methods.comparePassword = async function (enteredPassword) {
	return bcryptjs.compare(enteredPassword, this.password);
};

// Create the Student model
const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
