import { TZDate } from "@date-fns/tz";
import { endOfDay, subDays, format } from "date-fns";
import config from "../config.js";
import BaseProviderClient from "../providers/base";
import { providers } from "../providers/index.js";

export function getClient(providerName: string): BaseProviderClient {
  const provider = providers.get(providerName);
  if (provider === undefined) {
    throw new Error(`❌ Provider name must be one of ${[...providers.keys()].concat(", ")}`);
  }

  const client = new provider();
  return client;
};

export function getStartDate(startStr?: string): TZDate {
  if (startStr === undefined) {
    return endOfDay(subDays(TZDate.tz("Europe/Paris"), 7));
  }

  return new TZDate(startStr, "Europe/Paris");
}

export function getEndDate(endStr?: string): TZDate {
  if (endStr === undefined) {
    return endOfDay(subDays(TZDate.tz("Europe/Paris"), 1));
  }

  return new TZDate(endStr, "Europe/Paris");
}

export function displaySummary(providerName: string, startDate: TZDate, endDate: TZDate): void {
  console.error(`- 💾 Provider: ${providerName}`);
  console.error(`- 📧 Email: ${config.TSME_EMAIL}`);
  console.error(`- 🔒 Password: ***`);
  console.error(`- 📅 From: ${format(startDate, "yyyy-MM-dd")} => To: ${format(endDate, "yyyy-MM-dd")}`);
}
