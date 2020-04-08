import type { MongoClient, Collection } from "mongodb";
import { getClient } from "./client";
import type { TokenSet, UserinfoResponse } from "openid-client";
import type { User, UserProfile, Experience } from "../core/user";

export interface UserRecord {
  id: string;
  userInfo: UserinfoResponse;
  tokenSet: TokenSet;
  // additional B2NOTE-specific items
  orcid: string;
  organisation: string;
  jobTitle: string;
  country: string;
  experience: Experience;
}

export function record2user(record: UserRecord): User|null {
  const mbAccessToken = record.tokenSet.access_token;
  return mbAccessToken ? {
    id: record.id,
    accessToken: mbAccessToken
  } : null;
}

export function record2profile(record: UserRecord): UserProfile {
  return {
    id: record.id,
    name: record.userInfo.name || "",
    email: record.userInfo.email || "",
    orcid: record.orcid, 
    organisation: record.organisation,
    jobTitle: record.jobTitle,
    country: record.country,
    experience: record.experience,
    accessToken: record.tokenSet.access_token || ""
  };
}

// DB Access {{{1

export { getClient } from "./client";

export function getCollection(dbClient: MongoClient): Collection {
  return dbClient.db().collection("users");
}

// User queries {{{1

export async function upsertUserProfileFromAuth(userInfo: UserinfoResponse, tokenSet: TokenSet): Promise<UserRecord> {
  const dbClient = await getClient();
  const anCol = getCollection(dbClient);
  const id = userInfo.sub;
  await anCol.updateOne(
    { id },
    { "$set": { id, userInfo, tokenSet } },
    { upsert: true }
  );
  const userRecordPartial: any = await anCol.findOne({ id });
  const userRecord: UserRecord = {
    id: userRecordPartial.id,
    userInfo: userRecordPartial.userInfo,
    tokenSet: userRecordPartial.tokenSet,
    // additional B2NOTE-specific items may be missing if first-time 
    orcid: userRecordPartial.orcid || "",
    organisation: userRecordPartial.organisation || "",
    jobTitle: userRecordPartial.jobTitle || "",
    country: userRecordPartial.country || "",
    experience: userRecordPartial.experience || ""
  };
  await anCol.replaceOne({ id }, userRecord);
  await dbClient.close();
  return userRecord;
}

export async function getUserRecordById(userId: string): Promise<UserRecord|null> {
  const dbClient = await getClient();
  const anCol = getCollection(dbClient);
  const userRecord = await anCol.findOne({ id: userId });
  await dbClient.close();
  return userRecord;
}

export async function getUserById(userId: string): Promise<User|null> {
  const userRecord = await getUserRecordById(userId);
  return userRecord ? record2user(userRecord) : null;
}

export async function getUserProfileById(userId: string): Promise<UserProfile|null> {
  const userRecord = await getUserRecordById(userId);
  return userRecord ? record2profile(userRecord) : null;
}

export async function getUserByToken(token: string): Promise<User|null> {
  const dbClient = await getClient();
  const anCol = getCollection(dbClient);
  const userRecord = await anCol.findOne({ "tokenSet.access_token": token });
  await dbClient.close();
  return record2user(userRecord);
}

export async function updateUserProfile(userId: string, userProfileChanges: Record<keyof UserProfile, string>): Promise<number> {
  const dbClient = await getClient();
  const anCol = getCollection(dbClient);
  const res = await anCol.updateOne({ id: userId }, { "$set": userProfileChanges });
  await dbClient.close();
  return Promise.resolve(res.matchedCount);
}
