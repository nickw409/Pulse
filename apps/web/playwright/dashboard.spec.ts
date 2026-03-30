import { test, expect } from "@playwright/test";

// These tests require Clerk test mode and seeded data.
// In CI, CLERK_TESTING_TOKEN enables bypass auth.

test.describe("Dashboard E2E", () => {
  test("homepage shows sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/");
    // Clerk should redirect to sign-in page
    await expect(page).toHaveURL(/sign-in/);
  });

  test.describe("authenticated flows", () => {
    // Skip in environments without Clerk test credentials
    test.skip(
      !process.env.CLERK_TESTING_TOKEN,
      "Requires CLERK_TESTING_TOKEN",
    );

    test.beforeEach(async ({ page }) => {
      // Clerk testing bypass — set session cookie
      if (process.env.CLERK_TESTING_TOKEN) {
        await page.goto("/");
        await page.evaluate((token) => {
          document.cookie = `__session=${token}; path=/`;
        }, process.env.CLERK_TESTING_TOKEN);
      }
    });

    test("can create a project", async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector("text=Projects");

      // Fill in the create project form
      const nameInput = page.getByPlaceholder("Project name");
      await nameInput.fill("E2E Test Project");
      await page.getByRole("button", { name: "Create" }).click();

      // Should see the new project in the list
      await expect(page.getByText("E2E Test Project")).toBeVisible();
    });

    test("can navigate to project dashboard", async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector("text=Projects");

      // Click first project link
      const projectLink = page.locator("a[href^='/cl']").first();
      if (await projectLink.isVisible()) {
        await projectLink.click();
        // Should see the dashboard with widget grid
        await expect(
          page.getByText(/Add widget|No widgets yet/),
        ).toBeVisible();
      }
    });

    test("can add a widget to dashboard", async ({ page }) => {
      await page.goto("/");
      const projectLink = page.locator("a[href^='/cl']").first();
      if (!(await projectLink.isVisible())) {
        test.skip();
        return;
      }
      await projectLink.click();

      // Click "Add widget"
      await page.getByRole("button", { name: /Add widget/i }).click();

      // Fill in widget form
      await page.getByLabel("Title").fill("Page Views");
      await page.getByLabel("Event name").fill("page_view");
      await page.getByRole("button", { name: "Add" }).click();

      // Widget should appear
      await expect(page.getByText("Page Views")).toBeVisible();
    });

    test("can view schemas page", async ({ page }) => {
      await page.goto("/");
      const projectLink = page.locator("a[href^='/cl']").first();
      if (!(await projectLink.isVisible())) {
        test.skip();
        return;
      }
      await projectLink.click();

      await page.getByRole("link", { name: "Schemas" }).click();
      await expect(page.getByText("Event Schemas")).toBeVisible();
    });

    test("can view history page", async ({ page }) => {
      await page.goto("/");
      const projectLink = page.locator("a[href^='/cl']").first();
      if (!(await projectLink.isVisible())) {
        test.skip();
        return;
      }
      await projectLink.click();

      await page.getByRole("link", { name: "History" }).click();
      await expect(page.getByText("Event History")).toBeVisible();
    });
  });
});
