import { test, expect } from "@playwright/test";
test("citizen navigation works at phone and desktop widths", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/report", "/cases", "/board", "/how"]) {
      const r = await page.goto(route);
      expect(r?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
test("sample intake is editable and does not submit automatically", async ({
  page,
}) => {
  await page.goto("/report?example=meena");
  await expect(page.locator("textarea")).toHaveValue(/हैंडपंप/);
  await expect(
    page.getByRole("button", { name: "Prepare my complaint" }),
  ).toBeEnabled();
});
test("anonymous sessions cannot mutate shared sample reports", async ({
  request,
}) => {
  const id = "00000000-0026-4026-8026-000000000001";
  const r = await request.post(`/api/cases/${id}/filed`, {
    data: { ref: "not-a-real-filing", date: "2026-10-26" },
  });
  expect(r.status()).toBe(404);
});
