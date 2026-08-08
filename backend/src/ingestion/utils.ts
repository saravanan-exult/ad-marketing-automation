export function normalizeCategory(value: string) {
  const normalized = value.trim();
  const mapping: Record<string, string> = {
    "North America": "NA",
    "N.A.": "NA",
    GoogleAds: "Google",
    FB: "Meta",
    Facebook: "Meta",
    "Google Ads": "Google",
    "Amazon DSP": "Amazon",
    Adob: "Adobe",
  };
  return mapping[normalized] || normalized;
}

const MASTER_CAMPAIGNS = [
  "Summer Sale 2025",
  "Holiday Launch",
  "Back To School",
  "Autumn Promo",
];

export function fuzzyMatchCampaignName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  let best = { match: "", confidence: 0 };
  for (const candidate of MASTER_CAMPAIGNS) {
    const cleanedCandidate = candidate
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
    const matches = cleaned
      .split("")
      .filter((c) => cleanedCandidate.includes(c)).length;
    const confidence =
      matches / Math.max(cleaned.length, cleanedCandidate.length);
    if (confidence > best.confidence) {
      best = { match: candidate, confidence };
    }
  }
  return best;
}
