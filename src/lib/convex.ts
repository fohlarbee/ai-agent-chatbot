import { ConvexHttpClient } from "convex/browser";

// Create a singleton instance of the Convex HTTP client
export const getConvexClient = async () => {
  console.log('convex url',process.env.NEXT_PUBLIC_CONVEX_URL!)
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
};