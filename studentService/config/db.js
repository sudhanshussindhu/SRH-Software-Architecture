const mongoose = require("mongoose");

const connectDB = async () => {
	try {
		const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sms_student";
		const conn = await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 10000,
		});
		console.log(`MongoDB connected: ${conn.connection.host}`);
	} catch (error) {
		const isAtlasUri = (process.env.MONGO_URI || "").includes("mongodb.net");
		const isNetworkIssue =
			error.name === "MongooseServerSelectionError" ||
			/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|server selection/i.test(error.message);

		if (isAtlasUri && isNetworkIssue) {
			console.error(
				"MongoDB connection error: Unable to reach the MongoDB Atlas cluster. Check Atlas Network Access, confirm your current IP is allowed, and verify internet/VPN settings."
			);
		} else {
			console.error(`MongoDB connection error: ${error.message}`);
		}
		throw error;
	}
};

module.exports = connectDB;
