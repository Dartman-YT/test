import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeInterests = async (answers: string[]): Promise<CareerOption[]> => {
  const prompt = `
    User profile answers:
    ${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}
    
    Based on these answers, suggest exactly 3 distinct career paths suitable for this user.
    Provide a fit score (0-100) and a brief reason why.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            fitScore: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ['id', 'title', 'description', 'fitScore', 'reason']
        }
      }
    }
  });

  const text = response.text;
  return text ? JSON.parse(text) : [];
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const prompt = `
    User wants to search for a career path related to: "${query}".
    
    Generate 3 distinct career options that match this search query.
    If the query is specific (e.g. "React Developer"), provide variations or levels.
    If generic (e.g. "Tech"), provide diverse options.
    
    Fit Score should be based on relevance to the query string "${query}".
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            fitScore: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ['id', 'title', 'description', 'fitScore', 'reason']
        }
      }
    }
  });

  const text = response.text;
  return text ? JSON.parse(text) : [];
};

export const calculateRemainingDays = (phases: RoadmapPhase[]): number => {
    let totalDays = 0;
    phases.forEach(phase => {
        phase.items.forEach(item => {
            if (item.status === 'pending') {
                const duration = item.duration.toLowerCase();
                if (duration.includes('month')) {
                    const val = parseInt(duration) || 1;
                    totalDays += val * 30;
                } else if (duration.includes('week')) {
                    const val = parseInt(duration) || 1;
                    totalDays += val * 7;
                } else if (duration.includes('day')) {
                    const val = parseInt(duration) || 1;
                    totalDays += val;
                } else {
                    // Default for "hours" or unknown
                    totalDays += 1;
                }
            }
        });
    });
    return totalDays || 1; // Minimum 1 day
};

export const generateRoadmap = async (
  careerTitle: string,
  currentLevel: string,
  targetDate: string,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  focusAreas: string = '',
  adaptationContext?: {
      type: 'initial' | 'compress_schedule' | 'simplify_schedule' | 'redistribute' | 'append_content' | 'increase_difficulty_same_time';
      progressStr?: string;
      startingPhaseNumber?: number;
  }
): Promise<RoadmapPhase[]> => {
  // Calculate exact duration matching Dashboard logic (Inclusive Days)
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  // Manual parse to ensure local time noon alignment, prevent timezone shifting
  const parts = targetDate.split('-');
  const end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDaysRaw = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  // Add 1 to make it inclusive (e.g. Target=Today is 1 day of work)
  const diffDays = diffDaysRaw >= 0 ? diffDaysRaw + 1 : 0;
  
  const durationContext = diffDays <= 0 
    ? "The target date is in the past. Create a crash course for TODAY only." 
    : `The user has EXACTLY ${diffDays} DAYS remaining to complete this.`;

  // Use diffDays for logic, but ensure at least 1 for granularity checks
  const effectiveDays = diffDays <= 0 ? 1 : diffDays;
  const granularity = effectiveDays < 14 ? "Day-by-Day" : "Week-by-Week";
  const startPhase = adaptationContext?.startingPhaseNumber || 1;

  // Adaptation Instructions
  let adaptationPrompt = "";
  
  switch (adaptationContext?.type) {
      case 'compress_schedule':
          adaptationPrompt = `
          STRATEGY: COMPRESS / INCREASE PACE (Shortened Deadline).
          - The user selected a date SOONER than before (${effectiveDays} days left).
          - They chose to "Redistribute to new date".
          - KEEP all the original topics and curriculum. Do NOT remove content.
          - Simply COMPRESS the schedule to fit the shorter timeframe.
          - This will result in a higher daily workload (Fast Pace).
          `;
          break;
      case 'simplify_schedule':
          adaptationPrompt = `
          STRATEGY: SIMPLIFY / REDUCE CONTENT (Shortened Deadline).
          - The user selected a date SOONER than before (${effectiveDays} days left).
          - They chose to "Reduce Content".
          - REMOVE optional, advanced, or niche topics.
          - Focus ONLY on the absolute essentials to maintain a normal, stress-free pace within the shorter time.
          `;
          break;
      case 'redistribute':
          adaptationPrompt = `
          STRATEGY: REDISTRIBUTE (Same or Extended Deadline).
          - The user wants to spread the remaining items evenly over ${effectiveDays} days.
          - Aim for Stress-Free Learning.
          - Add revision days, practice buffers, and ensure the pace is relaxed.
          - Do NOT add new difficult content unless necessary to fill a massive gap.
          `;
          break;
      case 'append_content':
          adaptationPrompt = `
          STRATEGY: APPEND DIFFICULTY (Extended Deadline).
          - The user has extended the deadline to ${effectiveDays} days.
          - They want to "Add Difficulty/More Content".
          - Keep the core curriculum.
          - Add NEW, ADVANCED, or SPECIALIZED phases at the end to fill the extra time.
          - Suggest "Senior Level" or "Specialist" topics.
          - Mark new items with 'isAIAdaptation': true.
          `;
          break;
      case 'increase_difficulty_same_time':
           adaptationPrompt = `
           STRATEGY: INCREASE DIFFICULTY (Same Deadline).
           - The deadline is unchanged (${effectiveDays} days).
           - The user wants a bigger challenge.
           - Replace basic tasks with advanced/complex versions.
           - The schedule must remain ${effectiveDays} days long, but the CONTENT must be harder/deeper.
           - Mark changed items with 'isAIAdaptation': true.
           `;
           break;
      default:
           // Initial generation or generic
           adaptationPrompt = "Create a balanced roadmap fitting the duration.";
  }

  const context = adaptationContext?.progressStr ? `Current Context: ${adaptationContext.progressStr}` : '';
  
  // Tailor prompt based on experience
  let experienceInstruction = '';
  if (experienceLevel === 'beginner') {
      experienceInstruction = 'User is a complete beginner. Start from absolute basics.';
  } else {
      experienceInstruction = `User is ${experienceLevel} level. SKIP basic introductions. Focus on advanced concepts. ${focusAreas ? `Focus heavily on: ${focusAreas}.` : ''}`;
  }

  const prompt = `
    Create a strict, detailed educational roadmap for a user wanting to become a "${careerTitle}".
    Current Status: ${currentLevel}.
    Target Completion Date: ${targetDate} (${effectiveDays} days from now).
    Experience Level: ${experienceLevel}.
    ${experienceInstruction}
    ${context}
    ${adaptationPrompt}
    
    IMPORTANT TIMELINE RULES (CRITICAL):
    1. **Strict Duration**: The sum of the duration of all items generated MUST roughly equal ${effectiveDays} days. 
    2. **Do NOT** generate 150 days of content if the limit is ${effectiveDays} days. Fit the content to the time.
    3. **Granularity**: Plan the roadmap ${granularity}.
    4. **Rounding**: ALWAYS use integer numbers for days/weeks (e.g. "3 days", NOT "2.5 days"). Minimum duration is "1 day".
    
    CONTINUATION RULE:
    This might be a continuation of an existing roadmap. Start numbering the phases from Phase ${startPhase}.
    
    OTHER REQUIREMENTS:
    1. **Structure**: Divide into logical phases.
    2. **Links**: Provide generic URLs for 'internship', 'certificate', or 'project'.
    3. **Items**: Mix skills, projects, internships, and certificates.
    4. **Badge**: If adaptation added special items, set 'isAIAdaptation' to true.
    
    Return JSON format.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            phaseName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['skill', 'project', 'internship', 'certificate'] },
                  duration: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['pending'] },
                  link: { type: Type.STRING, nullable: true },
                  importance: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                  isAIAdaptation: { type: Type.BOOLEAN, nullable: true }
                },
                required: ['id', 'title', 'description', 'type', 'duration', 'status', 'importance']
              }
            }
          },
          required: ['phaseName', 'items']
        }
      }
    }
  });

  const text = response.text;
  return text ? JSON.parse(text) : [];
};

export const fetchTechNews = async (careerInterest: string): Promise<NewsItem[]> => {
  try {
    // We use gemini-2.5-flash which is generally stable for tools.
    // We REMOVE the responseSchema to avoid the "Internal Error 500" conflict 
    // that occurs when combining tools (googleSearch) with strict JSON schemas.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: `Find 5 distinct, recent (last 30 days) news articles or major announcements specifically related to "${careerInterest}".`,
      config: {
        tools: [{ googleSearch: {} }],
        // Do not use responseMimeType: "application/json" with googleSearch to avoid errors.
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // 1. Extract valid web chunks with URIs (Grounding Chunks are the source of truth for URLs)
    const webChunks = chunks
        .filter((c: any) => c.web?.uri && c.web?.title)
        .map((c: any) => {
             let hostname = "Web Source";
             try {
                 hostname = new URL(c.web.uri).hostname.replace('www.', '');
             } catch (e) {
                 // ignore
             }
             return {
                title: c.web.title,
                summary: "Read the full coverage at the source.", // Fallback summary
                url: c.web.uri,
                source: hostname,
                date: "Recent"
             };
        });

    // 2. Deduplicate items by URL
    const uniqueItems = webChunks.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t) => (
            t.url === item.url
        ))
    ).slice(0, 5); // Take top 5

    if (uniqueItems.length > 0) return uniqueItems;

    // 3. Fallback if no specific articles found
    return [
         { 
            title: `Latest News: ${careerInterest}`, 
            summary: "Search for the latest updates on Google News.", 
            url: `https://www.google.com/search?q=${encodeURIComponent(careerInterest + " news")}&tbm=nws`, 
            source: "Google News", 
            date: "Today" 
        }
    ];

  } catch (e) {
    console.error("Failed to fetch news", e);
    // 4. Error Fallback
    return [
        { 
            title: `${careerInterest} Updates`, 
            summary: "Explore the latest updates.", 
            url: `https://www.google.com/search?q=${encodeURIComponent(careerInterest + " news")}`, 
            source: "Google Search", 
            date: "Now" 
        }
    ];
  }
};
