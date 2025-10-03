import { Inngest} from "inngest";

export const inngest = new Inngest({
    id: 'stockify',
    ai: { gemini: { apiKey: process.env.GEMINI_API_KEY! }}
})