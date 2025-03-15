export interface KycDocument {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  kycDetailId: string;
  documentType: 'passport' | 'pan_card' | 'certificate_of_incorporation';
  status: 'pending' | 'approved' | 'rejected';
  frontFileName: string;
  backFileName: string;
}

export interface KycVerification {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  kycDetailId: string;
  kycProviderCode: 'sumsub';
  externalCustomerId: string;
  externalKycId: string;
  status: 'pending' | 'approved' | 'rejected';
  externalStatus: string;
  verifiedAt: string;
}

export interface KycDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  kybDetailId: string;
  nationality: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  positionAtCompany: string;
  sourceOfFund: string;
  currentKycVerificationId: string;
  currentKycVerification: KycVerification;
  kycDocuments: KycDocument[];
  kycUrl: string;
  uboType: 'owner' | 'director';
  percentageOfShares: number;
  joiningDate: string;
}

export interface KycAdditionalDocument {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  kycId: string;
  name: string;
  fileName: string;
}

export interface KycResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'individual' | 'business';
  country: string;
  providerCode: string;
  kycProviderCode: 'sumsub';
  kycDetailId: string;
  kybDetailId: string;
  kycDetail: KycDetail;
  kycAdditionalDocuments: KycAdditionalDocument[];
  statusUpdates: string;
}

export interface KycListResponse {
  page: number;
  limit: number;
  count: number;
  hasMore: boolean;
  data: KycResponse[];
}

export interface KycUploadResponse {
  success: boolean;
  message: string;
  document?: KycDocument;
}

export interface ErrorResponseDto {
  message: string | object;
  statusCode: number;
  error?: string;
} 