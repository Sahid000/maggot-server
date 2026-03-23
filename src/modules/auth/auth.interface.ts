export interface IUser {
  _id?: string;
  name: string;
  email: string;
  role: string;
  password: string;
}

export interface IOTPRecord {
  userId: string;
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IVerifyOTPPayload {
  tempToken: string;
  otp: string;
}

export interface IResendOTPPayload {
  tempToken: string;
}
