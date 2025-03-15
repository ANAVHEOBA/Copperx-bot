export interface EmailOtpRequestDto {
    email: string;
  }
  
  export interface EmailOtpResponseDto {
    email: string;
    sid: string;
  }
  
  export interface VerifyOtpRequestDto {
    email: string;
    otp: string;
    sid: string;
  }
  
  export interface UserData {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage: string;
    organizationId: string;
    role: 'owner' | 'admin' | 'member';
    status: 'pending' | 'active';
    type: 'individual' | 'business';
    relayerAddress: string;
    flags: string[];
    walletAddress: string;
    walletId: string;
    walletAccountType: string;
  }
  
  export interface AuthResponseDto {
    scheme: string;
    accessToken: string;
    accessTokenId: string;
    expireAt: string;
    user: UserData;
  }
  
  export interface ErrorResponseDto {
    message: string | object;
    statusCode: number;
    error?: string;
  }

  export interface UserProfileDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage: string;
    organizationId: string;
    role: 'owner' | 'admin' | 'member';
    status: 'pending' | 'active';
    type: 'individual' | 'business';
    relayerAddress: string;
    flags: string[];
    walletAddress: string;
    walletId: string;
    walletAccountType: string;
  }