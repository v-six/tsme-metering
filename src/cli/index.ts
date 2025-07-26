#!/usr/bin/env node

import { program } from "commander";
import pkg from "../../package.json" with { type: "json" };
import { meterDataToCsv, meterDataToJson, metersDataToCsv, metersDataToJson, wait } from "../helpers.js";
import { MeteringData } from "../providers/base.js";
import { displaySummary, getClient, getEndDate, getStartDate } from "./utils.js";

program
  .name("tsme-metering")
  .description("CLI to retrive water meter data from TSME group (Suez, ...)")
  .version(pkg.version);

program
  .command("extract-all")
  .description("Launch data extraction for all water meters in the account")
  .option("-s, --start <start>", "The starting date (YYYY-MM-DD)")
  .option("-e, --end <end>", "The ending date (YYYY-MM-DD)")
  .option("-p, --provider <provider>", "The provider to use", "suez")
  .option("-f, --format <format>", "The output format to use", "json")
  .action(async (options) => {
    console.error(`🚀 Launching extraction of all water meters...`);

    // Get client and dates
    const client = getClient(options.provider);
    const startDate = getStartDate(options.start);
    const endDate = getEndDate(options.end);

    // Display summary
    displaySummary(options.provider, startDate, endDate);

    // First get all meters IDs
    const metersIds = await client.getMetersIds();
    if (metersIds.length < 1) {
      console.error(`❌ There is no compatible water meter in your account`);
      process.exit(1);
    }

    // Finally get all meters data
    const metersData: { meterId: string; meteringData: MeteringData[] }[] = [];
    for (const meterId of metersIds) {
      const meteringData = await client.getMetering(meterId, startDate, endDate);
      metersData.push({ meterId, meteringData });

      // Be gentle with TSME if there are more than one water meter
      if (metersIds.length > 1) {
        await wait(750); 
      }
    }

    // Generate output
    const output = options.format === "csv" ? metersDataToCsv(metersData) : metersDataToJson(metersData);
    console.info(output);
  });

program
  .command("extract")
  .description("Launch data extraction for a specific meter id")
  .argument("<meter-id>", "The meter ID")
  .option("-s, --start <start>", "The starting date (YYYY-MM-DD)")
  .option("-e, --end <end>", "The ending date (YYYY-MM-DD)")
  .option("-p, --provider <provider>", "The provider to use", "suez")
  .option("-f, --format <format>", "The output format to use", "json")
  .action(async (meterId, options) => {
    console.error(`🚀 Launching extraction of meter #${meterId}...`);
    
    // Get client and dates
    const client = getClient(options.provider);
    const startDate = getStartDate(options.start);
    const endDate = getEndDate(options.end);

    // Display summary
    displaySummary(options.provider, startDate, endDate);
    // Add meter ID
    console.error(`- 🔧 Meter ID: ${meterId}`);

    // First check the meter ID correctness
    const metersIds = await client.getMetersIds();
    if (!metersIds.includes(meterId)) {
      console.error(`❌ The meter ID ${meterId} not found, check your account`);
      process.exit(1);
    }

    // Finally get the corresponding meter data
    const metering = await client.getMetering(meterId, startDate, endDate);
    
    // Generate output
    const output = options.format === "csv" ? meterDataToCsv(meterId, metering) : meterDataToJson(meterId, metering);
    console.info(output);
  });

program.parse(process.argv);
