import { Context } from '../protocol/protocol';

export type Email = string;
export type Password = string;

export interface GuestProfile {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly phone?: Phone;
    readonly email?: string;
    readonly roomId: string;
    readonly randomName?: string;
    readonly languageLocale?: string;
    readonly zoneId?: string;
    readonly location?: string;
    readonly tags?: ReadonlyArray<string>;
    readonly deletedAt?: number;
    readonly backOfficeData?: ReadonlyArray<BackOfficeField>;
}

export interface LeadCtx {
    readonly id: string;
    readonly apiKey: string;
    readonly orgId: string;
    readonly role?: string;
    readonly roomId: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly email?: string;
    readonly phone?: Phone;
    readonly randomName?: string;
    readonly languageLocale?: string;
    readonly zoneId?: string;
    readonly tags?: ReadonlyArray<string>;
    readonly backOfficeData?: ReadonlyArray<BackOfficeField>;
}

export interface BackOfficeField {
    readonly key: string;
    readonly value: string;
}

export interface Phone {
    readonly region: string;
    readonly number: string;
}

export interface Call {
    readonly id: string;
    readonly created: number;
    readonly ended?: number;
    readonly creator: string;
    readonly invitee: string;
    readonly orgId?: string;
}

export interface CreateCall {
    readonly invitee: string;
}

export interface SignUpGuest {
    readonly orgId: string;
    readonly context?: Context;
}

export interface AgentCtx {
    readonly id: string;
    readonly apiKey: string;
    readonly orgId: string;
    readonly email: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly phone?: Phone;
    readonly avatarUrl?: string;
    readonly pendingEmail?: string;
    readonly presence: string;
    readonly unavailabilityReason?: string;
    readonly role: 'ADMIN' | 'AGENT';
    readonly skills?: ReadonlyArray<string>;
    readonly autoAssignedLimit?: number;
    readonly importedCalendar?: string;
    readonly closerCustomerApiKey?: string;
}

export interface LoginForm {
    readonly email: string;
    readonly password: string;
}

export interface LoginWithTokenForm {
    readonly token: string;
}
