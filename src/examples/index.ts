import { TZDate } from "@date-fns/tz";
import { subDays, format } from "date-fns";
import { wait } from "../helpers.js";
import SuezClient from "../providers/suez.js";
import { MeteringData } from "../providers/base.js";

function displayData(meterId: string, meterData: MeteringData[]) {
	console.log(`📊 Meter: #${meterId}`);
	for (const { date, index, volume } of meterData) {
    const formattedDate = format(date, "yyyy-MM-dd");
    console.log(`  - ${formattedDate} → index: ${index}, volume: ${volume}`);
  }
}

const client = new SuezClient();

// Retrive all meters ID from the account
const metersIds = await client.getMetersIds();
if (metersIds.length < 1) {
	throw new Error(`❌ There is no compatible water meter in your account`);
}

// Display all meters data from the last week
for (const meterId of metersIds) {
  const meterData = await client.getMetering(meterId, subDays(TZDate.tz("Europe/Paris"), 8));
	displayData(meterId, meterData);

	await wait(1000); // Be gentle with TSME
}
