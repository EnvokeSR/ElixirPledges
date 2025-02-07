import { users, pledges, type User, type InsertUser, type Pledge, type InsertPledge } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUsersByGrade(grade: string): Promise<User[]>;
  getUsersByGradeNotSubmitted(grade: string): Promise<User[]>;
  updateUserVideoStatus(id: number): Promise<User>;
  // Pledges
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

  async getUsersByGradeNotSubmitted(grade: string): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.grade, grade))
      .where(eq(users.videoSubmitted, false))
      .orderBy(users.name);
  }

  async updateUserVideoStatus(id: number, favoriteCelebrity: string): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ 
        videoSubmitted: true,
        favoriteCelebrity: favoriteCelebrity 
      })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
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

  // Initialize database with sample data
  async initializeData() {
    // Initialize pledges
    const pledgeTexts = [
      "I pledge to be a responsible digital citizen and treat others with respect online.",
      "I pledge to stand up against cyberbullying and support those who are targeted.",
      "I pledge to think before I post and consider the impact of my words on others.",
      "I pledge to protect my privacy and respect the privacy of others online."
    ];

    // Insert pledges
    for (let i = 0; i < pledgeTexts.length; i++) {
      await db.insert(pledges).values({
        pledgeCode: `P${i + 1}`,
        pledgeText: pledgeTexts[i]
      });
    }

    // Initialize 50 users
    const grades = ["7th", "8th"];
    const names = [
      "Emma Smith", "Liam Johnson", "Olivia Brown", "Noah Davis", "Ava Wilson",
      "Ethan Moore", "Isabella Taylor", "Mason Anderson", "Sophia Thomas", "William Jackson",
      "Mia White", "James Harris", "Charlotte Martin", "Benjamin Thompson", "Amelia Garcia",
      "Lucas Martinez", "Harper Robinson", "Henry Clark", "Evelyn Rodriguez", "Alexander Lee",
      "Abigail Walker", "Michael Hall", "Emily Young", "Daniel Allen", "Elizabeth King",
      "Joseph Wright", "Sofia Lopez", "David Hill", "Victoria Scott", "Matthew Green",
      "Chloe Adams", "Andrew Baker", "Zoe Nelson", "Christopher Carter", "Penelope Mitchell",
      "Joshua Turner", "Grace Phillips", "Andrew Campbell", "Lily Morgan", "Ryan Murphy",
      "Hannah Cooper", "Nathan Rivera", "Aria Cook", "Samuel Reed", "Scarlett Morris",
      "John Richardson", "Madison Cox", "Owen Howard", "Layla Ward", "Gabriel Torres"
    ];

    // Insert users
    for (let i = 0; i < names.length; i++) {
      await db.insert(users).values({
        name: names[i],
        grade: grades[i % 2],
        pledgeCode: `P${(i % 4) + 1}`,
        favoriteCelebrity: "",
        videoSubmitted: false
      });
    }
  }
}

export const storage = new DatabaseStorage();