import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import CareerSpotlightSection from "@/app/(frontend)/sections/careerSpotlight";
import { getCMSCareerBoard } from "@/features/careers/publicCareers";
import { toJob } from "@/utils/careers";

vi.mock("@/features/careers/publicCareers", () => ({ getCMSCareerBoard: vi.fn() }));

it.each(["yes", "no", "unsure"] as const)("hides Malaysian homepage badges with eligibility %s while retaining Australian ones", async (international) => {
  const jobs = ["Malaysia", "Australia"].map(country => {
    const result = toJob({ title: `${country} internship`, company: "Acme", country, international, apply: "https://acme.example/apply" }, { today: "2026-10-07", rowNumber: 2, hasPublishedColumn: false });
    if (!("job" in result)) throw new Error("Invalid fixture");
    return { ...result.job, id: country.toLowerCase() };
  });
  vi.mocked(getCMSCareerBoard).mockResolvedValue({ status: "ok", jobs });
  const html = renderToStaticMarkup(await CareerSpotlightSection());
  const cards = html.match(/<li>.*?<\/li>/g) || [];
  const malaysiaCard = cards.find(card => card.includes("Malaysia internship"));
  const australiaCard = cards.find(card => card.includes("Australia internship"));
  expect(malaysiaCard).toBeDefined();
  expect(australiaCard).toBeDefined();
  expect(malaysiaCard).not.toMatch(/Check working rights|Open to international students|Citizens \/ PR only/);
  expect(australiaCard).toMatch(/Check working rights|Open to international students|Citizens \/ PR only/);
});
