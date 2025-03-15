export class KycModel {
    private id?: string;
    private status: 'pending' | 'approved' | 'rejected';
    private type: 'individual' | 'business';
    private country: string;
    private documents: Map<string, Blob>;

    constructor() {
        this.status = 'pending';
        this.type = 'individual';
        this.country = '';
        this.documents = new Map();
    }

    setId(id: string): void {
        this.id = id;
    }

    getId(): string | undefined {
        return this.id;
    }

    setStatus(status: 'pending' | 'approved' | 'rejected'): void {
        this.status = status;
    }

    getStatus(): string {
        return this.status;
    }

    setType(type: 'individual' | 'business'): void {
        this.type = type;
    }

    getType(): string {
        return this.type;
    }

    setCountry(country: string): void {
        this.country = country;
    }

    getCountry(): string {
        return this.country;
    }

    addDocument(type: string, file: Blob): void {
        this.documents.set(type, file);
    }

    getDocument(type: string): Blob | undefined {
        return this.documents.get(type);
    }

    getDocuments(): Map<string, Blob> {
        return this.documents;
    }

    toFormData(): FormData {
        const formData = new FormData();
        
        // Add basic KYC information
        formData.append('type', this.type);
        formData.append('country', this.country);
        
        // Add documents
        this.documents.forEach((file, type) => {
            formData.append(type, file, `${type}.jpg`);
        });
        
        return formData;
    }
} 