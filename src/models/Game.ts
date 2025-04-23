import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  min_players: {
    type: Number,
    required: true,
  },
  max_players: {
    type: Number,
    required: true,
  },
  avg_duration: {
    type: Number,
    required: true,
  },
  picture: {
    type: String,
    required: true,
  },
});

export default mongoose.models.Game || mongoose.model('Game', gameSchema, 'Games'); 