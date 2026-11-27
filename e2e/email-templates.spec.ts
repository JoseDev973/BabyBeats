import { expect, test } from "@playwright/test";
import { getGiftReadySubject, giftReadyEmail } from "../src/lib/emails/gift-ready";
import { getSongReadySubject, songReadyEmail } from "../src/lib/emails/song-ready";
import { welcomeEmail } from "../src/lib/emails/welcome";

test("renders names and links safely in HTML while preserving plain text subjects", () => {
  const name = "小春 & <Lee> \"O'Neil\"";
  const escaped = "小春 &amp; &lt;Lee&gt; &quot;O&#39;Neil&quot;";
  const url = "https://babybeats.test/song?a=1&b=2";
  for (const lang of ["es", "en"] as const) {
    const welcome = welcomeEmail({ displayName: name, lang });
    expect(welcome).toContain(escaped);
    expect(welcome).not.toContain(name);
    for (const html of [
      songReadyEmail({ childName: name, songUrl: url, lang }),
      giftReadyEmail({ childName: name, totalSongs: 5, deliveryUrl: url, lang }),
    ]) {
      expect(html).toContain(escaped);
      expect(html).not.toContain(name);
      expect(html).toContain('href="https://babybeats.test/song?a=1&amp;b=2"');
    }
    expect(getSongReadySubject(name, lang)).toContain(name);
    expect(getGiftReadySubject(name, lang)).toContain(name);
  }
  expect(() => songReadyEmail({ childName: name, songUrl: "data:text/plain,hello", lang: "es" })).toThrow();
});
