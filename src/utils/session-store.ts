import * as fs from 'fs';
import * as path from 'path';

export class SessionStore {
    private static readonly SESSION_FILE = path.join(__dirname, '../../.sessions.json');
    private static sessions: { [key: string]: any } = {};

    static initialize(): void {
        try {
            if (fs.existsSync(this.SESSION_FILE)) {
                const data = fs.readFileSync(this.SESSION_FILE, 'utf8');
                this.sessions = JSON.parse(data);
                console.log(`Sessions loaded: ${Object.keys(this.sessions).length}`);
            } else {
                this.sessions = {};
                this.save();
            }
        } catch (error) {
            console.error('Error initializing sessions:', error);
            this.sessions = {};
        }
    }

    static getSession(userId: number): any {
        const key = `${userId}:${userId}`;
        return this.sessions[key] || {};
    }

    static setSession(userId: number, data: any): void {
        const key = `${userId}:${userId}`;
        this.sessions[key] = data;
        this.save();
    }

    static save(): void {
        try {
            fs.writeFileSync(this.SESSION_FILE, JSON.stringify(this.sessions, null, 2));
            console.log(`Sessions saved: ${Object.keys(this.sessions).length}`);
        } catch (error) {
            console.error('Error saving sessions:', error);
        }
    }
} 