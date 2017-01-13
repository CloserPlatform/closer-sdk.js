import { ID } from "./protocol";

export interface Meta {
    [key: string]: string;
}

export interface CampaignSpawnData {
    campaignId: ID;
    channelId: ID;
    meta: Meta;
}

export interface CreateRoomData {
    orgId: ID;
    campaignId: ID;
    meta: Meta;
}
