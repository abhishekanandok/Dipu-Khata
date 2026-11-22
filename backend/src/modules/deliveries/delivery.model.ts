import mongoose, { Document, Schema } from 'mongoose';

export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface IDeliveryItem {
  materialId: mongoose.Types.ObjectId;
  materialName: string;
  quantity: number;
  unit: string;
}

export interface IDelivery extends Document {
  challanNumber: string;
  saleId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  driverName?: string;
  driverMobile?: string;
  vehicleNumber?: string;
  deliveryAddress: string;
  items: IDeliveryItem[];
  dispatchDate: Date;
  status: DeliveryStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryItemSchema = new Schema<IDeliveryItem>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { _id: false }
);

const DeliverySchema = new Schema<IDelivery>(
  {
    challanNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    saleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    driverName: { type: String },
    driverMobile: { type: String },
    vehicleNumber: { type: String },
    deliveryAddress: { type: String, required: true },
    items: [DeliveryItemSchema],
    dispatchDate: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'ASSIGNED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Delivery = mongoose.model<IDelivery>('Delivery', DeliverySchema);
