import { users, pledges, type User, type InsertUser, type Pledge, type InsertPledge } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pledges: Map<number, Pledge>;
  private currentUserId: number;
  private currentPledgeId: number;

  constructor() {
    this.users = new Map();
    this.pledges = new Map();
    this.currentUserId = 1;
    this.currentPledgeId = 1;
    this.initializeData();
  }

  private initializeData() {
    // Initialize pledges
    const pledgeTexts = [
      "I pledge to be a responsible digital citizen and treat others with respect online.",
      "I pledge to stand up against cyberbullying and support those who are targeted.",
      "I pledge to think before I post and consider the impact of my words on others.",
      "I pledge to protect my privacy and respect the privacy of others online."
    ];

    pledgeTexts.forEach((text, idx) => {
      const pledge: Pledge = {
        id: this.currentPledgeId++,
        pledgeCode: `P${idx + 1}`,
        pledgeText: text
      };
      this.pledges.set(pledge.id, pledge);
    });

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

    names.forEach((name, idx) => {
      const user: User = {
        id: this.currentUserId++,
        name,
        grade: grades[idx % 2],
        pledgeCode: `P${(idx % 4) + 1}`,
        favoriteCelebrity: "",
        videoSubmitted: false
      };
      this.users.set(user.id, user);
    });
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByGrade(grade: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.grade === grade);
  }

  async getUsersByGradeNotSubmitted(grade: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.grade === grade && !user.videoSubmitted
    );
  }

  async updateUserVideoStatus(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, videoSubmitted: true };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getPledges(): Promise<Pledge[]> {
    return Array.from(this.pledges.values());
  }

  async getPledgeByCode(code: string): Promise<Pledge | undefined> {
    return Array.from(this.pledges.values()).find(
      pledge => pledge.pledgeCode === code
    );
  }
}

export const storage = new MemStorage();
