import mongoose from 'mongoose';

const connectDB = async (options = {}) => {
  const { uri = process.env.MONGODB_URI, dbName, exitOnError = true } = options;

  if (!uri) {
    const err = new Error('MONGODB_URI is not configured in environment.');
    if (exitOnError) {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    }
    throw err;
  }

  try {
    const connectOpts = {
      serverSelectionTimeoutMS: 10000,
    };
    if (dbName) {
      connectOpts.dbName = dbName;
    }

    const connection = await mongoose.connect(uri, connectOpts);
    console.log(`MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    if (exitOnError) {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

export default connectDB;
