import mongoose, { Document, Schema } from 'mongoose';

export type DeliveryStatus = 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface IDeliveryItem {
  materialId: mongoose.Types.ObjectId;
  materialName: string;
  quantity: number;
  unit: string;
}

export interface IDelivery extends Document {
  challanNumber: string;
  saleId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerMobile: string;
  driverId?: mongoose.Types.ObjectId;
  driverName?: string;
  driverMobile?: string;
  vehicleId?: mongoose.Types.ObjectId;
  vehicleNumber?: string;
  deliveryAddress: string;
  items: IDeliveryItem[];
  dispatchDate: Date;
  status: DeliveryStatus;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryItemSchema = new Schema<IDeliveryItem>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
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
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerMobile: {
      type: String,
      required: true,
      trim: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
    },
    driverName: { type: String, trim: true },
    driverMobile: { type: String, trim: true },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    vehicleNumber: { type: String, trim: true },
    deliveryAddress: { type: String, required: true, trim: true },
    items: {
      type: [DeliveryItemSchema],
      validate: {
        validator: (v: IDeliveryItem[]) => v && v.length > 0,
        message: 'A delivery challan must have at least one line item',
      },
    },
    dispatchDate: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['DISPATCHED', 'DELIVERED', 'CANCELLED'],
      default: 'DISPATCHED',
      index: true,
    },
    notes: { type: String, trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

DeliverySchema.index({ saleId: 1, dispatchDate: -1 });

export const Delivery = mongoose.model<IDelivery>('Delivery', DeliverySchema);
