import axios, { AxiosInstance, AxiosResponse } from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as cheerio from "cheerio";
import { TZDate } from "@date-fns/tz";
import { format, subDays, endOfDay, isAfter, startOfMonth } from "date-fns";
import config from '../config.js';

type BaseProviderOptions = {
  baseUrl: string;
  loginEndpoint: string;
  dashboardEndpoint: string;
  metersListEndpoint: string;
  meteringEndpoint: string;
};

type TSMEAPIResponse<R> = {
  code: "00" | string;
  message: "OK" | string;
  content: R;
};

type MetersListResponse = TSMEAPIResponse<{
  nbCodeRef: number;
  nbCodeRefFull: number;
  nbCompteurFull: number;
  nbMeters: number;
  clientCompteursPro: [
    {
      reference: string;
      name: string;
      nbCompteurTotal: number;
      nombreCompteurTr: number;
      nombreCompteurRr: number;
      nombreCompteurSe: number;
      compteursPro: [
        {
          idPDS: string;
          idSite: string;
          matriculeCompteur: string;
          codeEquipement: string;
          etatPDS: string;
        }
      ];
    }
  ];
}>;

type TelemetryResponse = TSMEAPIResponse<{
  measures: [
    {
      date: string; // "2025-07-01 00:00:00"
      index: number | null,
      volume: number;
    }
  ];
}>;

export type MeteringData = {
  date: Date;
  index: number | null;
  volume: number;
};

export default abstract class BaseProviderClient {
  protected email: string;
  protected password: string;
  protected options: BaseProviderOptions;

  protected _isLoggedIn: boolean = false;

  protected axios: AxiosInstance;
  protected jar: CookieJar;

  constructor(
    options: BaseProviderOptions,
    email: string | undefined = config.TSME_EMAIL,
    password: string | undefined = config.TSME_PASSWORD
  ) {
    this.options = options;

    if (email === undefined || password === undefined) {
      throw new Error('Both email and password should be defined');
    }
    
    this.email = email;
    this.password = password;

    this.jar = new CookieJar();
    this.axios = wrapper(
      axios.create({
        baseURL: this.options.baseUrl,
        jar: this.jar,
        withCredentials: true,
      })
    );
  }

  isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  protected checkApiResponse(response: AxiosResponse): boolean {
    if (response.status > 200) {
      return false;
    }

    const responseData: TSMEAPIResponse<unknown> = response.data;
    if (responseData.message !== "OK") {
      return false;
    }

    return true;
  }

  protected extractCsrf(loginPage: AxiosResponse): string {
    const $ = cheerio.load(loginPage.data);

    const scriptContent = $("script")
      .toArray()
      .map((el) => $(el).html())
      .find((html) => html?.includes("window.tsme_data = JSON.parse"));
    if (!scriptContent) {
      throw new Error("❌ Could not find script with tsme_data");
    }

    const match = scriptContent.match(/JSON\.parse\("(.+?)"\)/);
    if (!match || !match[1]) {
      throw new Error("❌ Could not extract JSON string from tsme_data");
    }

    const jsonStringEscaped = match[1];

    // Unescape \uXXXX and escaped slashes
    const decoded = JSON.parse(`"${jsonStringEscaped}"`);
    const tsmeData = JSON.parse(decoded);

    const csrfToken = tsmeData?.csrfToken as string;
    if (!csrfToken) {
      throw new Error("❌ CSRF token not found in tsme_data");
    }

    return csrfToken;
  }

  protected async login(): Promise<boolean> {
    console.warn("🔐 Logging in...");

    // Step 1: GET the login page to extract needed data
    const loginPage = await this.axios.get(this.options.loginEndpoint);
    if (loginPage.status > 200) {
      throw new Error(`❌ Login preparation failed: HTTP ${loginPage.status}`);
    }

    // Step 2: Extract CSRF token
    const csrfToken = this.extractCsrf(loginPage);
    console.warn("🔑 CSRF Token: %s", csrfToken);

    // Step 3: Login
    const loginResponse = await this.axios.post(
      this.options.loginEndpoint,
      {
        "tsme_user_login[_username]": this.email,
        "tsme_user_login[_password]": this.password,
        "tsme_user_login[_target_path]": this.options.dashboardEndpoint,
        _csrf_token: csrfToken,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (loginResponse.status > 200) {
      throw new Error(`❌ Login failed: HTTP ${loginResponse.status}`);
    }

    const $ = cheerio.load(loginResponse.data);
    const canonical = $('link[rel="canonical"]')
      .toArray()
      .map((el) => $(el).attr("href"))
      .find((href) => href?.includes(this.options.dashboardEndpoint));

    if (!canonical) {
      throw new Error(`❌ Login failed: incorrect credentials`);
    }

    console.warn("✅ Logged in");
    this._isLoggedIn = true;
    return true;
  }

  async getMetersIds(): Promise<string[]> {
    if (!this.isLoggedIn()) {
      await this.login();
    }

    console.warn(`🔢 Getting all meters IDS of ${this.email}...`);

    const metersList = await this.axios.get(this.options.metersListEndpoint);
    if (!this.checkApiResponse(metersList)) {
      throw new Error(`❌ Meters listing failed: HTTP ${metersList.status}`);
    }

    const metersListData: MetersListResponse = metersList.data;
    const metersIds: string[] = [];
    if (metersListData.content.nbMeters < 1) {
      return metersIds;
    }

    metersListData.content.clientCompteursPro.forEach((customer) => {
      // No TR meter here go to the next
      if (customer.nombreCompteurTr === 0) return;
      // Filter to only take TR meters
      const trMeters = customer.compteursPro.filter(
        (meter) => meter.codeEquipement === "TR"
      );
      trMeters.forEach((meter) => {
        metersIds.push(meter.idPDS);
      });
    });

    console.warn(`✅ Meters IDS extracted (${metersIds.length})`);
    return metersIds;
  }

  async getMetering(
    meterId: string,
    from?: Date,
    to?: Date
  ): Promise<MeteringData[]> {
    if (!this.isLoggedIn()) {
      await this.login();
    }

    console.warn(`📊 Getting meter data of ${meterId}...`);

    // Max is yesterday
    const maxTo = endOfDay(subDays(TZDate.tz("Europe/Paris"), 1));
    // To is not set or is after max => set to max
    if (!to || isAfter(to, maxTo)) {
      to = new TZDate(maxTo, "Europe/Paris");
    }
    // From is not set or is after max => set to start of month
    if (!from || isAfter(from, to)) {
      from = new TZDate(startOfMonth(maxTo), "Europe/Paris");
    }

    const metering = await this.axios.get(this.options.meteringEndpoint, {
      params: {
        id_PDS: meterId,
        mode: "daily",
        start_date: format(from, "yyyy-MM-dd"),
        end_date: format(to, "yyyy-MM-dd"),
      },
    });

    if (!this.checkApiResponse(metering)) {
      throw new Error(`❌ Metering extraction failed: HTTP ${metering.status}`);
    }

    // Format response to have a UTC date
    const meteringData: TelemetryResponse = metering.data;
    const measures: MeteringData[] = meteringData.content.measures.map(
      (data): MeteringData => ({
        ...data,
        date: new TZDate(data.date, "Europe/Paris"),
      })
    );

    console.warn(`✅ Meter data extracted (${measures.length})`);
    return measures;
  }
}
