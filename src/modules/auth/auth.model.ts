export class AuthModel {
    private email: string;
    private sid?: string;
    private otp?: string;
    private accessToken?: string;

    constructor(email: string) {
        this.email = email;
    }

    getEmail(): string {
        return this.email;
    }

    setSid(sid: string): void {
        this.sid = sid;
    }

    getSid(): string | undefined {
        return this.sid;
    }

    setOtp(otp: string): void {
        this.otp = otp;
    }

    getOtp(): string | undefined {
        return this.otp;
    }

    validate(): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(this.email);
    }

    validateOtp(): boolean {
        return this.otp !== undefined && this.otp.length === 6;
    }

    setAccessToken(token: string): void {
        this.accessToken = token;
    }

    getAccessToken(): string | undefined {
        return this.accessToken;
    }
}