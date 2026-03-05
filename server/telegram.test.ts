import { describe, expect, it } from "vitest";

describe("Telegram Bot Token validation", () => {
  it("should successfully authenticate with the Telegram Bot API", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token).toBeTruthy();

    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.ok).toBe(true);
    expect(data.result).toBeDefined();
    expect(data.result.is_bot).toBe(true);
    console.log(`Bot name: ${data.result.first_name}, username: @${data.result.username}`);
  });
});
