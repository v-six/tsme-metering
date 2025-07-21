import BaseProviderClient from "./base.js";
import config from "../config.js";

export default class SuezClient extends BaseProviderClient {
  constructor(
    email: string | undefined = config.TSME_EMAIL,
    password: string | undefined = config.TSME_PASSWORD
  ) {
    super({
      baseUrl: "https://www.toutsurmoneau.fr",
      loginEndpoint: "/mon-compte-en-ligne/je-me-connecte",
      dashboardEndpoint: "/mon-compte-en-ligne/tableau-de-bord",
      metersListEndpoint: "/public-api/cel-consumption/meters-list",
      meteringEndpoint: "/public-api/cel-consumption/telemetry",
    }, email, password);
  }
}
