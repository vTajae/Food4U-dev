export interface ConditionVocabularyEntry {
  code: string;
  officialName: string;
  label: string;
  learn: string;
}

// Official names verified 2026-10-17 against NLM Clinical Tables:
// https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html
// Educational copy: NIH/NIDDK, MedlinePlus and FDA.
// Keep officialName for persistence; label and learn are presentation only.
export const conditionsByCode: Readonly<Record<string, ConditionVocabularyEntry>> = {
  "E11.9": {"code":"E11.9","officialName":"Type 2 diabetes mellitus without complications","label":"Type 2 diabetes","learn":"Your blood sugar is too high because your body does not make enough insulin or use it well."},
  "I10": {"code":"I10","officialName":"Essential (primary) hypertension","label":"High blood pressure (hypertension)","learn":"High blood pressure often has no symptoms and is found by checking your blood pressure."},
  "K90.0": {"code":"K90.0","officialName":"Celiac disease","label":"Celiac disease (gluten)","learn":"If you have celiac disease, gluten in wheat, barley and rye triggers an immune reaction that damages your small intestine."},
  "E78.5": {"code":"E78.5","officialName":"Hyperlipidemia, unspecified","label":"High cholesterol","learn":"Cholesterol and triglycerides are fats in your blood that can be measured with a blood test."},
  "K21.9": {"code":"K21.9","officialName":"Gastro-esophageal reflux disease without esophagitis","label":"Acid reflux (GERD)","learn":"Stomach contents flow back into your food pipe, causing repeated symptoms such as heartburn."},
  "K58.9": {"code":"K58.9","officialName":"Irritable bowel syndrome, unspecified","label":"Irritable bowel syndrome (IBS)","learn":"IBS can cause recurring belly pain with diarrhea, constipation or both."},
  "J30.9": {"code":"J30.9","officialName":"Allergic rhinitis, unspecified","label":"Seasonal allergies (hay fever)","learn":"Allergens such as pollen, dust mites or pet dander can cause sneezing and a runny or blocked nose."},
  "N18.9": {"code":"N18.9","officialName":"Chronic kidney disease, unspecified","label":"Chronic kidney disease","learn":"Long-term kidney damage can affect how well your kidneys filter waste and extra fluid from your blood."},
  "E73.9": {"code":"E73.9","officialName":"Lactose intolerance, unspecified","label":"Lactose intolerance","learn":"Difficulty digesting lactose, the sugar in milk, can cause bloating, gas or diarrhea."},
  "Z91.010": {"code":"Z91.010","officialName":"Allergy to peanuts","label":"Peanut allergy","learn":"Your immune system reacts to peanuts."},
  "Z91.0110": {"code":"Z91.0110","officialName":"Allergy to milk products, unspecified","label":"Milk allergy","learn":"Your immune system reacts to milk proteins, which is different from difficulty digesting lactose."},
  "Z91.0120": {"code":"Z91.0120","officialName":"Allergy to eggs, unspecified","label":"Egg allergy","learn":"Your immune system reacts to eggs."},
  "Z91.013": {"code":"Z91.013","officialName":"Allergy to seafood","label":"Seafood allergy (fish or shellfish)","learn":"Your immune system reacts to fish or shellfish."},
  "Z91.018": {"code":"Z91.018","officialName":"Allergy to other foods","label":"Other food allergies","learn":"Food allergies involve your immune system and are different from food intolerances."},
};

export const commonConditions = [
  "E11.9", "I10", "K90.0", "E78.5", "K21.9", "K58.9", "J30.9", "N18.9", "E73.9",
].map(code => conditionsByCode[code]);

export const commonFoodAllergies = [
  "Z91.010", "Z91.0110", "Z91.0120", "Z91.013", "Z91.018", "K90.0", "E73.9",
].map(code => conditionsByCode[code]);

// Deliberately exact and trailing-only. Preserve clinical qualifiers (for example
// "without diarrhea", "with complications" and "sequela") and unknown names.
const administrativeSuffixes = [
  ", unspecified", " without complications", ", initial encounter", ", subsequent encounter",
];
const bareIcdCode = /^[A-Z]\d{2}(?:\.[A-Z0-9]+)?$/i;

export function plainLabel(code?: string | null, officialName?: string | null): string {
  const name = officialName?.trim() ?? "";
  // Legacy clinical attributes can store only a code in their name field.
  const lookupCode = code?.trim() || (bareIcdCode.test(name) ? name : "");
  const known = Object.hasOwn(conditionsByCode, lookupCode) ? conditionsByCode[lookupCode] : undefined;
  if (known) return known.label;
  if (!name || bareIcdCode.test(name)) return "";

  let label = name;
  let suffix: string | undefined;
  while ((suffix = administrativeSuffixes.find(value => label.endsWith(value)))) {
    label = label.slice(0, -suffix.length);
  }
  return label;
}
