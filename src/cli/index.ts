#!/usr/bin/env node

import { program } from "commander";
import { providers } from "../providers/index.js";
import config from "../config.js";
import { meterDataToCsv, meterDataToJson, metersDataToCsv, metersDataToJson, wait } from "../helpers.js";
import { MeteringData } from "src/providers/base.js";

program
  .name("tsme-metering")
  .description("CLI to retrive water meter data from TSME group (Suez, ...)")
  .version("0.0.1");

program
  .command("extract-all")
  .description("Launch data extraction for all water meters in the account")
  .option("-p, --provider <provider>", "The provider to use", "suez")
  .option("-f, --format <format>", "The output format to use", "json")
  .action(async (options) => {
    console.error(`🚀 Launching extraction of all water meters...`);

    // Check provider name
    const provider = providers.get(options.provider);
    if (provider === undefined) {
      console.error(
        `❌ Provider name must be one of ${[...providers.keys()].concat(", ")}`
      );
      process.exit(1);
    }

    // Display summary
    console.error(`- 💾 Provider: ${options.provider}`);
    console.error(`- 📧 Email: ${config.TSME_EMAIL}`);
    console.error(`- 🔒 Password: ***`);

    const client = new provider();

    // First get all meters IDs
    const metersIds = await client.getMetersIds();
    if (metersIds.length < 1) {
      console.error(`❌ There is no compatible water meter in your account`);
      process.exit(1);
    }

    // Finally get all meters data
    const metersData: { meterId: string; meteringData: MeteringData[] }[] = [];
    for (const meterId of metersIds) {
      const meteringData = await client.getMetering(meterId);
      metersData.push({ meterId, meteringData });

      await wait(1000); // Be gentle with TSME
    }

    let output = "";
    if (options.format === "csv") {
      output = metersDataToCsv(metersData);
    } else {
      output = metersDataToJson(metersData);
    }

    console.info(output);
  });

program
  .command("extract")
  .description("Launch data extraction for a specific meter id")
  .argument("<meter-id>", "The meter ID")
  .option("-p, --provider <provider>", "The provider to use", "suez")
  .option("-f, --format <format>", "The output format to use", "json")
  .action(async (meterId, options) => {
    console.error(`🚀 Launching extraction of meter #${meterId}...`);
    
    // Check provider name
    const provider = providers.get(options.provider);
    if (provider === undefined) {
      console.error(
        `❌ Provider name must be one of ${[...providers.keys()].concat(", ")}`
      );
      process.exit(1);
    }

    // Display summary
    console.error(`- 💾 Provider: ${options.provider}`);
    console.error(`- 📧 Email: ${config.TSME_EMAIL}`);
    console.error(`- 🔒 Password: ***`);

    const client = new provider();

    // First check the meter ID correctness
    const metersIds = await client.getMetersIds();
    if (!metersIds.includes(meterId)) {
      console.error(`❌ The meter ID ${meterId} not found, check your account`);
      process.exit(1);
    }

    // Finally get the corresponding meter data
    const metering = await client.getMetering(meterId);
    
    let output = "";
    if (options.format === 'csv') {
      output = meterDataToCsv(meterId, metering);
    } else {
      output = meterDataToJson(meterId, metering);
    }

    console.info(output);
  });

program.parse(process.argv);
