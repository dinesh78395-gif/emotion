import { Schema, model } from 'mongoose';

const emotionLogSchema = new Schema(
  {
    emotion: {
      type: String,
      enum: ['happy', 'sad', 'angry', 'surprised', 'neutral', 'fearful', 'disgusted'],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default model('EmotionLog', emotionLogSchema);
