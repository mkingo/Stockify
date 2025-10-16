import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface EmailSuppressionDoc extends Document {
  email: string;
  unsubscribedAt: Date;
  reason?: string;
  source?: 'link' | 'list-unsubscribe' | 'manual' | 'api';
  scope?: 'all' | 'newsletter';
}

const EmailSuppressionSchema = new Schema<EmailSuppressionDoc>({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  unsubscribedAt: { type: Date, default: Date.now },
  reason: { type: String, default: '' },
  source: { type: String, default: 'link' },
  scope: { type: String, default: 'all' },
}, { timestamps: false });

export const EmailSuppression: Model<EmailSuppressionDoc> =
  (models?.EmailSuppression as Model<EmailSuppressionDoc>) || model<EmailSuppressionDoc>('EmailSuppression', EmailSuppressionSchema);
