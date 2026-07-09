import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  displayName: string;
  passwordHash: string;
  isEmailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  refreshTokens: Array<{
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    passwordHash: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true },
);

userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ 'refreshTokens.tokenHash': 1 }, { sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);
