import { users, pledges, type User, type InsertUser, type Pledge, type InsertPledge } from "@shared/schema";
import { db } from "./db";
import { and, eq } from "drizzle-orm";

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUsersByGrade(grade: string): Promise<User[]>;
  getUsersByGradeNotSubmitted(grade: string): Promise<User[]>;
  getAllUsersNotSubmitted(): Promise<User[]>;
  updateUserVideoStatus(id: number, favoriteCelebrity: string, url: string): Promise<User>;
  getPledges(): Promise<Pledge[]>;
  getPledgeByCode(code: string): Promise<Pledge | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByGrade(grade: string): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.grade, grade));
  }

  async getAllUsersNotSubmitted(): Promise<User[]> {
    console.log('Fetching all users with videoSubmitted=false');
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.videoSubmitted, false))
        .orderBy(users.name);

      console.log(`Found ${result.length} users without submitted videos`);
      return result;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async getUsersByGradeNotSubmitted(grade: string): Promise<User[]> {
    console.log(`Fetching users for grade ${grade} with videoSubmitted=false`);
    try {
      const result = await db.select()
        .from(users)
        .where(
          and(
            eq(users.grade, grade),
            eq(users.videoSubmitted, false)
          )
        )
        .orderBy(users.name);

      console.log(`Found ${result.length} users for grade ${grade} without submitted videos`);
      return result;
    } catch (error) {
      console.error("Error fetching users by grade:", error);
      throw error;
    }
  }

  async updateUserVideoStatus(id: number, favoriteCelebrity: string, url: string): Promise<User> {
    console.log(`Updating user ${id} with celebrity ${favoriteCelebrity} and URL ${url}`);
    try {
      const [updatedUser] = await db.update(users)
        .set({ 
          videoSubmitted: true,
          favoriteCelebrity: favoriteCelebrity,
          url: url
        })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        throw new Error("User not found");
      }

      return updatedUser;
    } catch (error) {
      console.error("Error updating user video status:", error);
      throw error;
    }
  }

  async getPledges(): Promise<Pledge[]> {
    return await db.select().from(pledges);
  }

  async getPledgeByCode(code: string): Promise<Pledge | undefined> {
    const [pledge] = await db.select()
      .from(pledges)
      .where(eq(pledges.pledgeCode, code));
    return pledge;
  }
}

export const storage = new DatabaseStorage();