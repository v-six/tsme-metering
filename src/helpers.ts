import { format } from "date-fns";
import { parse } from "json2csv";
import { MeteringData } from "./providers/base.js";

type PreparedMeterData = Omit<MeteringData, "date"> & {
  date: string;
};

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prepareMeterData(meteringData: MeteringData[]): PreparedMeterData[] {
  return meteringData.map(
    (entry): PreparedMeterData => ({
      ...entry,
      date: format(entry.date, "yyyy-MM-dd"),
    })
  );
}

export function meterDataToJson(meterId: string, meteringData: MeteringData[]): string {
  const prepared = {
    meterId,
    values: prepareMeterData(meteringData),
  };

  return JSON.stringify(prepared, null, 2);
}

export function metersDataToJson(metersData: { meterId: string; meteringData: MeteringData[] }[]): string {
  const prepared = metersData.map(({ meterId, meteringData }) => ({
    meterId,
    values: prepareMeterData(meteringData),
  }));

  return JSON.stringify(prepared, null, 2);
}

export function meterDataToCsv(meterId: string, meteringData: MeteringData[]): string {
  const prepared = prepareMeterData(meteringData).map((entry) => ({
    meterId,
    ...entry,
  }));

  return parse(prepared);
}

export function metersDataToCsv(metersData: {meterId: string, meteringData: MeteringData[]}[]): string {
  const prepared = metersData.flatMap(({ meterId, meteringData }) =>
    prepareMeterData(meteringData).map((entry) => ({
      meterId,
      ...entry,
    }))
  );

  return parse(prepared);
}