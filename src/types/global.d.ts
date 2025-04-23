import { Mongoose } from 'mongoose';

declare global {
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
  const process: {
    env: {
      MONGODB_URI: string;
    };
  };
}

export {}; 