import mongoose, { Document, Schema } from 'mongoose';

export interface IDocumentSequence extends Document {
  sequenceType: string; // 'SALE', 'ESTIMATE', 'PAYMENT', 'CHALLAN'
  yearMonth: string; // Format: YYMM, e.g. 2611
  lastSequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSequenceSchema = new Schema<IDocumentSequence>(
  {
    sequenceType: {
      type: String,
      required: true,
      index: true,
    },
    yearMonth: {
      type: String,
      required: true,
      index: true,
    },
    lastSequence: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so each sequenceType + yearMonth is strictly atomic and unique
DocumentSequenceSchema.index({ sequenceType: 1, yearMonth: 1 }, { unique: true });

export const DocumentSequence = mongoose.model<IDocumentSequence>(
  'DocumentSequence',
  DocumentSequenceSchema
);

/**
 * Atomically generates the next sequence number formatted as:
 * PREFIX-YYMM-XXXX (e.g. DK-2611-0001, EST-2611-0001)
 */
export async function getNextDocumentNumber(
  type: 'SALE' | 'ESTIMATE' | 'PAYMENT' | 'CHALLAN',
  prefix: string
): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${yy}${mm}`;

  const doc = await DocumentSequence.findOneAndUpdate(
    { sequenceType: type, yearMonth },
    { $inc: { lastSequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seqStr = String(doc.lastSequence).padStart(4, '0');
  return `${prefix}-${yearMonth}-${seqStr}`;
}
