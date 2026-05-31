import { z } from "zod";

export const tripFormSchema = z.object({
  destination: z.string().min(2, "Destination must be at least 2 characters."),
  dateRange: z.object({
    from: z.date({ message: "Start date is required." }),
    to: z.date({ message: "End date is required." }),
  }),
  budget: z.enum(["Budget", "Moderate", "Luxury"], {
    message: "Please select a budget tier.",
  }),
  plannedBudget: z.number().min(10, "Planned budget must be at least 10."),
  travelers: z.number().min(1, "Must have at least 1 traveler."),
  travelStyle: z.enum(["Relaxed", "Adventure", "Cultural", "Nightlife", "Nature"], {
    message: "Please select a travel style.",
  }),
  interests: z.string().min(3, "Please enter some interests (e.g., museums, food, hiking)."),
  transportation: z.enum(["Public Transit", "Rental Car", "Walking", "Rideshare"], {
    message: "Please select transportation preference.",
  }),
  constraints: z.array(z.string()).optional(),
});

export type TripFormValues = z.infer<typeof tripFormSchema>;

export interface GeneratedTripDay {
  day: number;
  title: string;
  activities: {
    title: string;
    location: string;
    description: string;
    estimatedTransitTime?: string;
  }[];
  foodRecommendations: string[];
  estimatedCost: number;
}

export interface GeneratedTripResponse {
  tripName: string;
  destination: string;
  summary: string;
  estimatedBudget: {
    total: number;
    currency: string;
    breakdown?: {
      accommodation?: number;
      food?: number;
      activities?: number;
      transportation?: number;
    }
  };
  days: GeneratedTripDay[];
  travelTips: string[];
  plannedBudget: number;
  constraints: string[];
}
