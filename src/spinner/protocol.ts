export interface GuestProfile {
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: Phone;
    email?: string;
    roomId: string;
    randomName?: string;
    languageLocale?: string;
    zoneId?: string;
    location?: string;
    tag?: string;
    deletedAt?: number;
    backOfficeData?: ReadonlyArray<BackOfficeField>;
}

export interface LeadCtx {
    id: string;
    apiKey: string;
    orgId: string;
    role?: string;
    roomId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: Phone;
    randomName?: string;
    languageLocale?: string;
    zoneId?: string;
    tag?: string;
    backOfficeData?: ReadonlyArray<BackOfficeField>;
}

export interface BackOfficeField {
    key: string;
    value: string;
}

export interface Phone {
    region: string;
    number: string;
}

export interface Call {
    id: string;
    created: number;
    ended?: number;
    creator: string;
    invitee: string;
    orgId?: string;
}

export interface CreateCall {
    invitee: string;
}

export interface SignUpGuest {
    orgId: string;
    context?: {};
}
