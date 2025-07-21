# TSME-Metering

A useful lib and CLI to collect water meter data from your TSME group provider account.

**⚠️ This code is still experimental: you may encounter issues**

## Compatibility

### Providers
- Suez (https://www.toutsurmoneau.fr/)
- *...in progress*

*See [Known limitations - Providers](#providers-1) for more informations*

## Usage

### Installation

```bash
  pnpm install tsme-metering
  # or npm, yarn, whatever :D
```

If you don't need the lib and just want to use the CLI, you can use `npx` to execute it directly:
```bash
  npx tsme-metering extract-all
```

*See [CLI Usage](#cli) for more informations*

### Configuration (env vars)

- `TSME_EMAIL`: email address used to connect your water provider account
- `TSME_PASSWORD`: password used to connect your water provider account

Env vars are used in both lib code and CLI usage.

This library is using `dotenv` so you can store env vars into a `.env` file.

### Library

Each provider has its own client. You need to instantiate the one corresponding to your needs. To do so, you can either use the helper map `providers` or directly instantiate your provider (`SuezClient` for example):

```typescript
  import { providers } from 'tsme-metering';
  const provider = providers.get("suez");
  const client = new provider(); // default email and password from env can be overloaded in the constructor
```

```typescript
  import { SuezClient } from 'tsme-metering';
  const client = new SuezClient(); // default email and password from env can be overloaded in the constructor
```

Now that you have your client, you are free to call on of its functions:

- `getMetersIds()`
  
  Get all compatible water meters ids of your account (useful for multiple water meters)
  
  ← Returns: `number[]`

- `getMetering(meterId, from?, to?)`
  
  Get data from a specific water meter with optionnal timespan
  
  → Parameters: `meterId` (number) - `from` (Date) - `to` (Date)
  
  ← Returns: 
    ```typescript
      Array<{
        date: Date; // "Europe/Paris" TZ
        index: number | null; // in m³
        volume: number; // in m³
      }>
    ```

- `isLoggedIn()`
  
  Check if the current client is currently logged in
  
  ← Returns: `boolean`

Here is a full usage example:
```typescript
  import { SuezClient } from 'tsme-metering';
  const client = new SuezClient();

  // Get all meters ids
  const metersIds = await client.getMetersIds();
  if (metersIds.length < 1) {
    throw new Error('There is no compatible water meter');
  }

  const metering = await client.getMetering(meterId, new Date('2025-06-01'));
  // ...
```

### CLI

The CLI has two commands:

- `tsme-metering extract-all --provider <suez> --format <csv|json>`
  
  Extract all water meters data of the current month from the specified account

- `tsme-metering extract <meter-id> --provider <suez> --format <csv|json>`
  
  Extract one specific water meter data of the current month from the specified account

Both commands outputs can be redirected to a file:
```bash
  tsme-metering extract-all --format csv > my_water.csv
```

## Known limitations

### Session expiration
  
Using the library, session may expire after a few minutes of inactivity. That is a standard management. The library is not handling session expiration and this implementation is not planned for now. Feel free to request this feature in the issue section.

### Providers

That library is only limited to `TSME` (Tout Sur Mon Eau) providers. I started with the main provider `Suez` but I plan to add all its branches like `Eau Olivet` or `Dolea` in the future. Again, feel free to ask for your specific provider.

### Verbosity

For now the verbosity is not adjustable, this is planned in a next release.