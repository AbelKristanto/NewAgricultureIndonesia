import { CalendarInput } from '@/types/calendar';

export function buildCalendarPrompt(input: CalendarInput): string {
  return `Generate a realistic activity calendar for the following crop, from planting through harvest and a short post-harvest delivery window.

CROP DATA:
- Commodity: ${input.commodity}
- Planting date: ${input.plantingDate}
- Province: ${input.province}

Base the schedule on real agronomic practice for this specific commodity (typical watering frequency, number and timing of fertilizing rounds, pesticide/pest-check checkpoints, and realistic days-to-harvest for this crop). Every "suggestedDate" must be a real calendar date in YYYY-MM-DD format, calculated forward from the planting date above - do not use relative phrases like "week 2".

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "activities": [
    {
      "type": "string - one of: watering, fertilizing, pesticide, harvest, delivery, other",
      "label": "string - short activity name",
      "suggestedDate": "string - YYYY-MM-DD",
      "notes": "string - brief guidance for this activity"
    }
  ],
  "summary": "string - one short paragraph summarizing the overall schedule and growing duration"
}

Include at least: 2-4 watering entries (if relevant to this commodity), 2 fertilizing entries, 1 pesticide/pest-check entry, exactly 1 harvest entry, and 1 delivery entry a few days after harvest. Order the array chronologically by suggestedDate.`;
}
