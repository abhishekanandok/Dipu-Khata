import mongoose, { Document, Schema } from 'mongoose';

export type VehicleType = 'TRACTOR' | 'TIPPER' | 'TRUCK_10_WHEELER' | 'PICKUP' | 'OTHER';

export interface IVehicle extends Document {
  vehicleNumber: string; // e.g. BR 01 GB 4321
  vehicleType: VehicleType;
  capacity?: string; // e.g. 150 CFT, 10 TON
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ['TRACTOR', 'TIPPER', 'TRUCK_10_WHEELER', 'PICKUP', 'OTHER'],
      default: 'TRACTOR',
      index: true,
    },
    capacity: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
