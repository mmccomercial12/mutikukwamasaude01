export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    platform: "MUTIKUKWAMA SAÚDE",
    timestamp: new Date().toISOString(),
    geminiAvailable: !!process.env.GEMINI_API_KEY,
  });
}
