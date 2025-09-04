import { userRepository } from "../repositories/user.repository";
import { CustomError } from "../middleware/errorHandler";

export interface UserContext {
  personalInfo: {
    name: string;
    country: string;
    timeZone?: string;
    languages: string[];
  };
  academicProfile: {
    level?: string;
    fieldOfStudy?: string;
    workExperience?: string;
  };
  professionalProfile: {
    careerStage?: string;
    skills: string[];
    linkedinProfile?: any;
  };
  personalityProfile: {
    bio?: string;
    interests: string[];
    personalityTraits: string[];
    learningStyle?: string;
  };
  goals: {
    shortTerm: string[];
    longTerm: string[];
    currentFocus: string[];
  };
  aiPreferences: {
    interactionStyle?: any;
    contentPreferences?: any;
  };
}

export class ProfileContextService {
  async getUserContext(userId: string): Promise<UserContext> {
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    return {
      personalInfo: {
        name: user.name,
        country: user.country,
        timeZone: user.timeZone,
        languages: user.languages || [],
      },
      academicProfile: {
        level: user.academicLevel,
        fieldOfStudy: user.fieldOfStudy,
        workExperience: user.workExperience,
      },
      professionalProfile: {
        careerStage: user.careerStage,
        skills: user.skills || [],
        linkedinProfile: user.linkedinProfile,
      },
      personalityProfile: {
        bio: user.bio,
        interests: user.interests || [],
        personalityTraits: user.personalityTraits || [],
        learningStyle: user.learningStyle,
      },
      goals: {
        shortTerm: this.filterGoalsByType(user.goals || [], "short"),
        longTerm: this.filterGoalsByType(user.goals || [], "long"),
        currentFocus: user.currentFocus || [],
      },
      aiPreferences: {
        interactionStyle: user.aiInteractionPrefs,
        contentPreferences: user.preferences,
      },
    };
  }

  async generatePersonalizedContext(userId: string): Promise<string> {
    const context = await this.getUserContext(userId);

    const contextParts = [];

    // Personal background
    contextParts.push(
      `User: ${context.personalInfo.name} from ${context.personalInfo.country}`
    );

    if (context.personalInfo.languages.length > 0) {
      contextParts.push(
        `Languages: ${context.personalInfo.languages.join(", ")}`
      );
    }

    // Academic/Professional level
    if (context.academicProfile.level) {
      contextParts.push(`Academic Level: ${context.academicProfile.level}`);
    }

    if (context.academicProfile.fieldOfStudy) {
      contextParts.push(
        `Field of Study: ${context.academicProfile.fieldOfStudy}`
      );
    }

    if (context.professionalProfile.careerStage) {
      contextParts.push(
        `Career Stage: ${context.professionalProfile.careerStage}`
      );
    }

    if (context.academicProfile.workExperience) {
      contextParts.push(
        `Work Experience: ${context.academicProfile.workExperience} years`
      );
    }

    // Skills and interests
    if (context.professionalProfile.skills.length > 0) {
      contextParts.push(
        `Skills: ${context.professionalProfile.skills.join(", ")}`
      );
    }

    if (context.personalityProfile.interests.length > 0) {
      contextParts.push(
        `Interests: ${context.personalityProfile.interests.join(", ")}`
      );
    }

    // Goals and focus
    if (context.goals.currentFocus.length > 0) {
      contextParts.push(
        `Current Focus: ${context.goals.currentFocus.join(", ")}`
      );
    }

    if (context.goals.shortTerm.length > 0) {
      contextParts.push(
        `Short-term Goals: ${context.goals.shortTerm.join(", ")}`
      );
    }

    if (context.goals.longTerm.length > 0) {
      contextParts.push(
        `Long-term Goals: ${context.goals.longTerm.join(", ")}`
      );
    }

    // Learning preferences
    if (context.personalityProfile.learningStyle) {
      contextParts.push(
        `Learning Style: ${context.personalityProfile.learningStyle}`
      );
    }

    if (context.personalityProfile.personalityTraits.length > 0) {
      contextParts.push(
        `Personality: ${context.personalityProfile.personalityTraits.join(
          ", "
        )}`
      );
    }

    // Bio
    if (context.personalityProfile.bio) {
      contextParts.push(`About: ${context.personalityProfile.bio}`);
    }

    return contextParts.join(". ");
  }

  private filterGoalsByType(goals: string[], type: "short" | "long"): string[] {
    // Simple heuristic: goals with time indicators
    const shortTermIndicators = [
      "this year",
      "next month",
      "soon",
      "immediate",
      "current",
    ];
    const longTermIndicators = [
      "5 year",
      "10 year",
      "career",
      "life",
      "eventually",
    ];

    if (type === "short") {
      return goals.filter((goal) =>
        shortTermIndicators.some((indicator) =>
          goal.toLowerCase().includes(indicator)
        )
      );
    } else {
      return goals.filter((goal) =>
        longTermIndicators.some((indicator) =>
          goal.toLowerCase().includes(indicator)
        )
      );
    }
  }
}

export const profileContextService = new ProfileContextService();
