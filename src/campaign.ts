import { ID } from "./protocol";

export interface Meta {
    [key: string]: string;
}

export interface CampaignSpawnData {
    campaignId: ID;
    meta: Meta;
}
