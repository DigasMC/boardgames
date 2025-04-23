import { Mongoose } from 'mongoose';

declare global {
  let mongoose: {
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