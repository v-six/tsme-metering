import BaseProviderClient from "./base.js";
import SuezClient from "./suez.js";

type ProviderConstructor = new (
  email?: string,
  password?: string
) => BaseProviderClient;

const providers: Map<string, ProviderConstructor> = new Map([
  ["suez", SuezClient],
]);

export { providers, SuezClient };
