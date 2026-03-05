import { describe, expect, it } from "vitest";
import axios from "axios";

describe("CoinMarketCap API key validation", () => {
  it("should successfully authenticate with the CMC API key", async () => {
    const apiKey = process.env.CMC_API_KEY;
    expect(apiKey).toBeTruthy();

    // Lightweight call: fetch just BTC price to validate the key
    const resp = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey!,
          Accept: "application/json",
        },
        params: {
          symbol: "BTC",
          convert: "USD",
        },
        timeout: 15000,
      }
    );

    expect(resp.status).toBe(200);
    expect(resp.data?.data?.BTC).toBeTruthy();
    expect(resp.data.data.BTC.quote?.USD?.price).toBeGreaterThan(0);
  });
});
